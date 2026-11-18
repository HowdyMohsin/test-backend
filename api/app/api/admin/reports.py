from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import get_db
from .deps import tab

router = APIRouter(prefix="/reports", dependencies=[Depends(tab("reports"))])


async def _data(db: AsyncSession, days: int) -> dict:
    p = {"d": days}
    q = lambda sql: db.execute(text(sql), p)  # noqa: E731
    daily = (await q("select ts::date, count(*) filter (where status='done'), count(*) filter (where status='failed'), count(*) filter (where status='blocked'), "
                     "coalesce(sum(bytes_in),0), coalesce(sum(bytes_out),0) from events where ts > now() - make_interval(days => :d) group by 1 order by 1")).all()
    pairs = (await q("select pair_slug, count(*) filter (where status='done'), count(*) filter (where status='failed') from events "
                     "where ts > now() - make_interval(days => :d) and status in ('done','failed') group by 1 order by 2 desc limit 20")).all()
    timing = (await q("select coalesce(avg(duration_ms),0), coalesce(percentile_cont(0.95) within group (order by duration_ms),0) from events "
                      "where ts > now() - make_interval(days => :d) and status='done'")).one()
    plans = (await q("select plan, count(*) from events where ts > now() - make_interval(days => :d) and status='done' group by 1")).all()
    errors = (await q("select coalesce(error_code,'unknown'), count(*) from events where ts > now() - make_interval(days => :d) and status in ('failed','blocked') "
                      "group by 1 order by 2 desc")).all()
    engines = (await q("select route, count(*) filter (where status='done'), count(*) filter (where status='failed') from events "
                       "where ts > now() - make_interval(days => :d) and status in ('done','failed') group by 1")).all()
    return {"days": days,
            "daily": [{"day": str(r[0]), "done": r[1], "failed": r[2], "blocked": r[3], "bytes_in": int(r[4]), "bytes_out": int(r[5])} for r in daily],
            "top_pairs": [{"pair": r[0], "done": r[1], "failed": r[2]} for r in pairs],
            "timing_ms": {"avg": round(timing[0]), "p95": round(timing[1])},
            "plans": [{"plan": r[0], "count": r[1]} for r in plans],
            "errors": [{"code": r[0], "count": r[1]} for r in errors],
            "engines": [{"route": r[0], "done": r[1], "failed": r[2]} for r in engines]}


@router.get("")
async def report(days: int = Query(7, ge=1, le=365), db: AsyncSession = Depends(get_db)):
    return await _data(db, days)


@router.get("/export.csv")
async def export(days: int = Query(30, ge=1, le=365), db: AsyncSession = Depends(get_db)):
    d = await _data(db, days)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["day", "converted", "failed", "blocked_by_limits", "bytes_in", "bytes_out"])
    for r in d["daily"]:
        w.writerow([r["day"], r["done"], r["failed"], r["blocked"], r["bytes_in"], r["bytes_out"]])
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=report-{days}d.csv"})

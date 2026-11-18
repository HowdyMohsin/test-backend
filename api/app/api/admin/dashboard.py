from __future__ import annotations

import shutil
import subprocess

import pyvips
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ...core import quota
from ...core.storage import storage
from ...db.session import get_db
from ...settings import get_settings
from .deps import tab

router = APIRouter(prefix="/dashboard", dependencies=[Depends(tab("dashboard"))])


@router.get("")
async def dashboard(db: AsyncSession = Depends(get_db)):
    q = lambda sql, **p: db.execute(text(sql), p)  # noqa: E731
    today = (await q("select count(*) filter (where status='done'), count(*) filter (where status='failed'), "
                     "coalesce(sum(bytes_in),0), coalesce(sum(bytes_out),0) from events where ts >= date_trunc('day', now())")).one()
    day = (await q("select count(*) filter (where status='done'), count(*) filter (where status='failed') from events "
                   "where ts > now() - interval '24 hours'")).one()
    series = (await q("select ts::date, count(*) filter (where status='done'), count(*) filter (where status='failed') from events "
                      "where ts > now() - interval '14 days' and status in ('done','failed') group by 1 order by 1")).all()
    top = (await q("select pair_slug, count(*) from events where ts > now() - interval '30 days' and status='done' "
                   "group by 1 order by 2 desc limit 10")).all()
    queue = (await q("select id, pair_slug, status, progress, created_at from jobs where status in ('queued','processing') "
                     "order by created_at limit 15")).all()
    depth = (await q("select count(*) from jobs where status='queued'")).scalar_one()
    users_today = (await q("select count(distinct owner_key) from quotas where day=:d", d=quota.today())).scalar_one()
    total = day[0] + day[1]
    try:
        ff = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, timeout=5).stdout.splitlines()[0].split()[2]
    except Exception:  # noqa: BLE001
        ff = "unavailable"
    return {
        "today": {"done": today[0], "failed": today[1], "bytes_in": int(today[2]), "bytes_out": int(today[3])},
        "success_rate_24h": round(100 * day[0] / total, 1) if total else None, "failed_24h": day[1],
        "queue_depth": depth, "users_today": users_today,
        "series": [{"day": str(r[0]), "done": r[1], "failed": r[2]} for r in series],
        "top_pairs": [{"pair": r[0], "count": r[1]} for r in top],
        "queue": [{"id": str(r[0]), "pair": r[1], "status": r[2], "progress": r[3], "created_at": r[4].isoformat()} for r in queue],
        "health": {"database": True, "disk_free_gb": round(storage.free_bytes() / 1024 ** 3, 1),
                   "ffmpeg": ff, "libvips": f"{pyvips.version(0)}.{pyvips.version(1)}.{pyvips.version(2)}",
                   "disk_total_gb": round(shutil.disk_usage(get_settings().data_dir.resolve()).total / 1024 ** 3, 1) if get_settings().data_dir.exists() else None},
    }

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def record(db: AsyncSession, job, status: str, bytes_in: int, bytes_out: int, duration_ms: int, queue_ms: int) -> None:
    await db.execute(text(
        "insert into events(owner_type, plan, pair_slug, category, route, status, error_code, bytes_in, bytes_out, duration_ms, queue_ms) "
        "values (:ot, :plan, :pair, :cat, :route, :st, :err, :bi, :bo, :dur, :q)"),
        {"ot": "anon" if job.owner_key.startswith("a:") else "user", "plan": job.plan, "pair": job.pair_slug, "cat": job.category,
         "route": job.route, "st": status, "err": job.error_code, "bi": bytes_in, "bo": bytes_out, "dur": duration_ms, "q": queue_ms})


async def rollup(db: AsyncSession, keep_days: int = 90) -> int:
    """Raw events older than keep_days become daily totals, so the table never bloats."""
    await db.execute(text(
        "insert into event_daily(day, pair_slug, status, count, bytes_in, bytes_out, sum_duration_ms) "
        "select ts::date, pair_slug, status, count(*), sum(bytes_in), sum(bytes_out), sum(duration_ms) from events "
        "where ts < now() - make_interval(days => :d) group by 1,2,3 "
        "on conflict (day, pair_slug, status) do update set count = event_daily.count + excluded.count, "
        "bytes_in = event_daily.bytes_in + excluded.bytes_in, bytes_out = event_daily.bytes_out + excluded.bytes_out, "
        "sum_duration_ms = event_daily.sum_duration_ms + excluded.sum_duration_ms"), {"d": keep_days})
    r = await db.execute(text("delete from events where ts < now() - make_interval(days => :d)"), {"d": keep_days})
    return r.rowcount or 0


async def record_block(plan: str, owner_key: str, pair_slug: str, category: str, code: str) -> None:
    """A conversion that was refused (limit hit). Kept so reports can show how often people hit limits."""
    import logging

    from ..db.session import SessionLocal
    try:
        async with SessionLocal() as db:
            await db.execute(text(
                "insert into events(owner_type, plan, pair_slug, category, route, status, error_code, bytes_in, bytes_out, duration_ms, queue_ms) "
                "values (:ot, :plan, :pair, :cat, '', 'blocked', :err, 0, 0, 0, 0)"),
                {"ot": "anon" if owner_key.startswith("a:") else "user", "plan": plan, "pair": pair_slug, "cat": category, "err": code})
            await db.commit()
    except Exception:  # noqa: BLE001 - statistics must never break the answer the user is waiting for
        logging.getLogger("qic").exception("could not record blocked event")

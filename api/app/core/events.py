"""Conversion events: one row per conversion + daily rollups for reports."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Event


async def log_event(
    session: AsyncSession,
    *,
    owner_key: str,
    plan_id: str,
    pair_slug: str,
    from_format: str,
    to_format: str,
    input_bytes: int,
    output_bytes: int,
    duration_ms: int,
    status: str,
    error_code: str | None = None,
    is_video: bool = False,
) -> None:
    session.add(
        Event(
            owner_key=owner_key,
            plan_id=plan_id,
            pair_slug=pair_slug,
            from_format=from_format,
            to_format=to_format,
            input_bytes=input_bytes,
            output_bytes=output_bytes,
            duration_ms=duration_ms,
            status=status,
            error_code=error_code,
            is_video=is_video,
        )
    )
    await session.execute(
        text(
            """
            INSERT INTO event_daily (day, pair_slug, plan_id, conversions, failed, input_bytes)
            VALUES (CURRENT_DATE, :pair, :plan, :conv, :fail, :bytes)
            ON CONFLICT (day, pair_slug, plan_id)
            DO UPDATE SET conversions = event_daily.conversions + :conv,
                          failed = event_daily.failed + :fail,
                          input_bytes = event_daily.input_bytes + :bytes
            """
        ),
        {
            "pair": pair_slug,
            "plan": plan_id,
            "conv": 1 if status == "done" else 0,
            "fail": 0 if status == "done" else 1,
            "bytes": input_bytes,
        },
    )
    await session.flush()


async def prune_old_events(session: AsyncSession, keep_days: int = 90) -> int:
    """Raw events are kept 90 days (spec 4.9); daily totals stay forever."""
    res = await session.execute(
        text("DELETE FROM events WHERE created_at < NOW() - (:days || ' days')::interval"),
        {"days": str(keep_days)},
    )
    await session.flush()
    return res.rowcount or 0

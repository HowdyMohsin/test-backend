"""Postgres job queue: SELECT ... FOR UPDATE SKIP LOCKED, video 1-at-a-time.

Claiming must run inside a transaction owned by the caller. The video slot
uses a session-level advisory lock, so it survives the claim commit and is
released explicitly after the video job finishes.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job
from app.formats.base import VIDEO_SLUGS

# Fixed advisory-lock key for the single video slot.
_VIDEO_LOCK_KEY = 721001


async def queue_depth(session: AsyncSession) -> int:
    return (
        await session.execute(select(func.count()).select_from(Job).where(Job.status == "queued"))
    ).scalar() or 0


async def claim_next(session: AsyncSession) -> tuple[uuid.UUID | None, bool]:
    """Claim one queued job. Returns (job_id, video_slot_held).

    Call inside `async with session.begin():`. On (None, False) the caller
    rolls back and the job stays queued.
    """
    job = (
        await session.execute(
            select(Job)
            .where(Job.status == "queued")
            .order_by(Job.created_at)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
    ).scalar_one_or_none()
    if job is None:
        return None, False
    is_video = job.from_format in VIDEO_SLUGS or job.to_format in VIDEO_SLUGS
    held = False
    if is_video:
        held = bool(
            (await session.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": _VIDEO_LOCK_KEY})).scalar()
        )
        if not held:
            return None, False  # video slot busy: leave job queued
    job.status = "processing"
    job.started_at = datetime.now(timezone.utc)
    await session.flush()
    return job.id, held


async def release_video_slot(session: AsyncSession) -> None:
    await session.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": _VIDEO_LOCK_KEY})
    await session.commit()


async def recover_stuck(session: AsyncSession) -> int:
    """On startup: jobs stuck in 'processing' go back to 'queued' (spec 4.6)."""
    res = await session.execute(
        text("UPDATE jobs SET status='queued', progress=0 WHERE status='processing'")
    )
    await session.commit()
    return res.rowcount or 0

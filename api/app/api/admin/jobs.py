"""Admin: jobs tab — list/inspect conversion jobs."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_tab
from app.db.models import AdminUser, Job
from app.schemas import v1 as s

router = APIRouter()
_guard = require_tab("jobs")


@router.get("/jobs", response_model=list[s.JobAdminSchema])
async def list_jobs(
    status: str | None = Query(default=None, max_length=16),
    pair: str | None = Query(default=None, max_length=64),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    _admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
) -> list[s.JobAdminSchema]:
    stmt = select(Job).order_by(desc(Job.created_at)).limit(limit).offset(offset)
    if status:
        stmt = stmt.where(Job.status == status)
    if pair:
        stmt = stmt.where(Job.pair_slug == pair)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        s.JobAdminSchema(
            id=j.id, owner_key=j.owner_key, pair_slug=j.pair_slug, status=j.status,
            progress=j.progress, error_code=j.error_code, plan_id=j.plan_id,
            created_at=j.created_at, finished_at=j.finished_at,
        )
        for j in rows
    ]


@router.get("/jobs/stats")
async def job_stats(
    _admin: AdminUser = Depends(_guard), db: AsyncSession = Depends(get_db)
) -> dict:
    rows = (await db.execute(select(Job.status, func.count()).group_by(Job.status))).all()
    return {"by_status": {st: n for st, n in rows}}

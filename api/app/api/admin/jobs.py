from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ...core import quota
from ...core.errors import ApiError
from ...core.storage import storage
from ...db.models import AdminUser, Job, Upload
from ...db.session import get_db
from .deps import audit, tab

router = APIRouter(prefix="/jobs", dependencies=[Depends(tab("jobs"))])


def brief(j: Job) -> dict:
    return {"id": str(j.id), "pair": j.pair_slug, "category": j.category, "status": j.status, "progress": j.progress, "plan": j.plan,
            "owner": "anonymous" if j.owner_key.startswith("a:") else "user", "error_code": j.error_code,
            "created_at": j.created_at.isoformat(), "finished_at": j.finished_at.isoformat() if j.finished_at else None}


@router.get("")
async def list_jobs(status: str = "", pair: str = "", page: int = Query(1, ge=1), db: AsyncSession = Depends(get_db)):
    stmt = select(Job)
    if status:
        stmt = stmt.where(Job.status == status)
    if pair:
        stmt = stmt.where(Job.pair_slug == pair)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.order_by(Job.created_at.desc()).limit(25).offset((page - 1) * 25))).scalars().all()
    counts = dict((await db.execute(text("select status, count(*) from jobs group by 1"))).all())
    return {"total": total, "page": page, "counts": counts, "jobs": [brief(j) for j in rows]}


@router.get("/{job_id}")
async def job_detail(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    j = await db.get(Job, job_id)
    if j is None:
        raise ApiError("not_found", "Job not found.", 404)
    return {**brief(j), "settings": j.settings, "route": j.route, "timeout_s": j.timeout_s, "error_message": j.error_message, "notes": j.notes,
            "out_size": j.out_size, "out_info": j.out_info, "started_at": j.started_at.isoformat() if j.started_at else None,
            "stuck": j.status == "processing" and j.started_at is not None and (j.created_at.tzinfo is not None) and
                     (__import__("datetime").datetime.now(__import__("datetime").timezone.utc) - j.started_at).total_seconds() > j.timeout_s}


@router.post("/{job_id}/retry")
async def retry(job_id: uuid.UUID, admin: AdminUser = Depends(tab("jobs")), db: AsyncSession = Depends(get_db)):
    j = await db.get(Job, job_id)
    if j is None or j.status not in ("failed", "cancelled"):
        raise ApiError("invalid_request", "Only failed or cancelled jobs can be retried.", 409)
    up = await db.get(Upload, j.upload_id)
    if up is None or not Path(up.path).exists():
        raise ApiError("upload_expired", "The original upload has already been deleted.", 410)
    j.status, j.progress, j.error_code, j.error_message, j.started_at, j.finished_at = "queued", 0, None, None, None, None
    await audit(db, admin, "job.retry", str(j.id))
    await db.commit()
    return {"ok": True}


@router.post("/{job_id}/cancel")
async def cancel(job_id: uuid.UUID, admin: AdminUser = Depends(tab("jobs")), db: AsyncSession = Depends(get_db)):
    j = await db.get(Job, job_id)
    if j is None:
        raise ApiError("not_found", "Job not found.", 404)
    r = (await db.execute(text("update jobs set status='cancelled', finished_at=now() where id=:i and status in ('queued','processing') returning created_at"), {"i": job_id})).first()
    if r:
        await quota.refund(db, j.owner_key, r[0].date())
    await audit(db, admin, "job.cancel", str(job_id))
    await db.commit()
    return {"ok": bool(r)}


@router.delete("/{job_id}/files")
async def delete_files(job_id: uuid.UUID, admin: AdminUser = Depends(tab("jobs")), db: AsyncSession = Depends(get_db)):
    storage.remove(storage.job_dir(job_id))
    await db.execute(text("update jobs set out_path=null, status = case when status='done' then 'expired' else status end where id=:i"), {"i": job_id})
    await audit(db, admin, "job.delete_files", str(job_id))
    await db.commit()
    return {"ok": True}

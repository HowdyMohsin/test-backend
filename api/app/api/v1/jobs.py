from __future__ import annotations

import tempfile
import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.background import BackgroundTask

from ...core import quota
from ...core.auth import Identity, get_identity, require_web_request
from ...core.errors import ApiError
from ...core.security import make_token, read_token
from ...db.models import Job
from ...db.session import get_db
from ...formats import registry

router = APIRouter()


async def job_dict(db: AsyncSession, j: Job) -> dict:
    d = {"id": str(j.id), "status": j.status, "progress": j.progress, "pair": j.pair_slug, "notes": j.notes or [],
         "queue_position": None, "download_url": None, "name": j.out_name, "size": j.out_size, "info": j.out_info or {}, "error": None}
    if j.status == "queued":
        d["queue_position"] = (await db.execute(text("select count(*) from jobs where status='queued' and created_at <= :c"), {"c": j.created_at})).scalar_one()
    if j.status == "done":
        d["download_url"] = f"/v1/jobs/{j.id}/download?token={make_token(str(j.id))}"
    if j.status in ("failed",):
        d["error"] = {"code": j.error_code, "message": j.error_message}
    return d


@router.get("/jobs")
async def jobs_status(ids: str = Query(..., description="comma separated job ids"), ident: Identity = Depends(get_identity), db: AsyncSession = Depends(get_db)):
    try:
        wanted = [uuid.UUID(i) for i in ids.split(",")[:200] if i]
    except ValueError:
        raise ApiError("invalid_request", "Bad job id.", 422) from None
    rows = (await db.execute(select(Job).where(Job.id.in_(wanted), Job.owner_key == ident.owner_key))).scalars().all()
    return {"jobs": [await job_dict(db, j) for j in rows]}


@router.get("/jobs/{job_id}")
async def job_status(job_id: uuid.UUID, ident: Identity = Depends(get_identity), db: AsyncSession = Depends(get_db)):
    j = await db.get(Job, job_id)
    if j is None or j.owner_key != ident.owner_key:
        raise ApiError("not_found", "This job was not found. It may have expired.", 404)
    return await job_dict(db, j)


@router.post("/jobs/{job_id}/cancel")
async def cancel(job_id: uuid.UUID, request: Request, ident: Identity = Depends(get_identity), db: AsyncSession = Depends(get_db)):
    require_web_request(request)
    j = await db.get(Job, job_id)
    if j is None or j.owner_key != ident.owner_key:
        raise ApiError("not_found", "This job was not found.", 404)
    r = await db.execute(text("update jobs set status='cancelled', finished_at=now() where id=:i and status in ('queued','processing') returning created_at"),
                         {"i": job_id})
    row = r.first()
    if row:
        await quota.refund(db, j.owner_key, row[0].date())
    await db.commit()
    return {"ok": True}


@router.get("/jobs/{job_id}/download")
async def download(job_id: uuid.UUID, token: str, db: AsyncSession = Depends(get_db)):
    if read_token(token) != str(job_id):
        raise ApiError("invalid_token", "This download link has expired. Please convert again.", 403)
    j = await db.get(Job, job_id)
    if j is None or j.status != "done" or not j.out_path or not Path(j.out_path).exists():
        raise ApiError("not_found", "This file is no longer available. Files are deleted after one hour.", 404)
    mime = registry.formats()[j.to_slug].mime if not j.out_path.endswith(".zip") else "application/zip"
    return FileResponse(j.out_path, media_type=mime, filename=j.out_name, content_disposition_type="attachment",
                        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "no-store"})


class ZipIn(BaseModel):
    job_ids: list[uuid.UUID] = Field(min_length=1, max_length=200)
    name: str = Field(default="converted-files", max_length=60)


@router.post("/jobs/zip")
async def zip_jobs(body: ZipIn, request: Request, ident: Identity = Depends(get_identity), db: AsyncSession = Depends(get_db)):
    require_web_request(request)
    rows = (await db.execute(select(Job).where(Job.id.in_(body.job_ids), Job.status == "done", Job.owner_key == ident.owner_key))).scalars().all()
    files = [(j.out_name, Path(j.out_path)) for j in rows if j.out_path and Path(j.out_path).exists()]
    if not files:
        raise ApiError("not_found", "None of these files are available any more.", 404)
    tmp = Path(tempfile.mkstemp(suffix=".zip")[1])
    used: dict[str, int] = {}
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_STORED) as zf:
        for name, p in files:
            n = used.get(name, 0)
            used[name] = n + 1
            arc = name if n == 0 else f"{Path(name).stem} ({n}){Path(name).suffix}"
            zf.write(p, arc)
    safe = "".join(c for c in body.name if c.isalnum() or c in "-_ ") or "converted-files"
    return FileResponse(tmp, media_type="application/zip", filename=f"{safe}.zip", content_disposition_type="attachment",
                        background=BackgroundTask(lambda: tmp.unlink(missing_ok=True)), headers={"X-Content-Type-Options": "nosniff"})

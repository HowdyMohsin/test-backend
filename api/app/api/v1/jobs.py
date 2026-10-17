"""Job endpoints: status, download, server-side zip."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_identity
from app.core.plan_guard import Identity
from app.schemas import v1 as api_schemas
from app.services import jobs as job_service
from app.settings import settings

router = APIRouter()


async def _job_to_response(db: AsyncSession, job) -> api_schemas.JobResponse:
    return api_schemas.JobResponse(
        id=job.id,
        status=job.status,
        progress=job.progress,
        queue_position=await job_service.queue_position(db, job),
        download_url=job_service.download_url_for(job),
        error=api_schemas.JobErrorSchema(code=job.error_code, message=job.error_message or "")
        if job.error_code
        else None,
    )


@router.get("/jobs", response_model=list[api_schemas.JobResponse])
async def jobs_batch_status(
    response: Response,
    ids: str = Query(..., description="comma-separated job ids, max 100", max_length=3600),
    db: AsyncSession = Depends(get_db),
    ident: tuple[Identity, str | None] = Depends(get_identity),
) -> list[api_schemas.JobResponse]:
    """Status for many jobs at once (polling). Unknown ids are skipped."""
    identity, new_cookie = ident
    if new_cookie:
        response.set_cookie(
            settings.anon_cookie_name, new_cookie, httponly=True, samesite="lax", max_age=31536000
        )
    results: list[api_schemas.JobResponse] = []
    for raw_id in ids.split(",")[:100]:
        raw_id = raw_id.strip()
        if not raw_id:
            continue
        try:
            job_id = UUID(raw_id)
        except ValueError:
            continue
        try:
            job = await job_service.get_job(db, job_id, identity.owner_key)
        except Exception:
            continue
        results.append(await _job_to_response(db, job))
    return results


@router.get("/jobs/{job_id}", response_model=api_schemas.JobResponse)
async def job_status(
    job_id: UUID,
    response: Response,
    db: AsyncSession = Depends(get_db),
    ident: tuple[Identity, str | None] = Depends(get_identity),
) -> api_schemas.JobResponse:
    identity, new_cookie = ident
    if new_cookie:
        response.set_cookie(
            settings.anon_cookie_name, new_cookie, httponly=True, samesite="lax", max_age=31536000
        )
    job = await job_service.get_job(db, job_id, identity.owner_key)
    return await _job_to_response(db, job)


@router.post("/jobs/{job_id}/cancel")
async def job_cancel(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    ident: tuple[Identity, str | None] = Depends(get_identity),
) -> dict:
    """Cancel a job that has not finished yet."""
    identity, _new_cookie = ident
    await job_service.cancel_job(db, job_id, identity.owner_key)
    return {"ok": True}


@router.get("/jobs/{job_id}/download")
async def job_download(token: str = Query(...)) -> FileResponse:
    _job, filename, mime, path = await job_service.resolve_download(token)
    return FileResponse(
        path,
        filename=filename,
        media_type=mime,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/jobs/zip", response_model=api_schemas.ZipResponse, status_code=201)
async def jobs_zip(
    body: api_schemas.ZipRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    ident: tuple[Identity, str | None] = Depends(get_identity),
) -> api_schemas.ZipResponse:
    identity, new_cookie = ident
    if new_cookie:
        response.set_cookie(
            settings.anon_cookie_name, new_cookie, httponly=True, samesite="lax", max_age=31536000
        )
    url, _rel = await job_service.create_zip(db, identity, body.job_ids)
    return api_schemas.ZipResponse(
        download_url=url,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.download_ttl_hours),
    )


@router.get("/jobs/zip/download")
async def zip_download(token: str = Query(...)) -> FileResponse:
    path, filename = await job_service.resolve_zip_download(token)
    return FileResponse(
        path,
        filename=filename,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Content-Type-Options": "nosniff",
        },
    )

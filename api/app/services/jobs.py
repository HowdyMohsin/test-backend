"""Job service: status polling, signed downloads, server-side zip."""

from __future__ import annotations

import zipfile
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import APIError, ErrorCode
from app.core.plan_guard import Identity
from app.core.security import new_uuid_name, sanitize_filename, sign_download_token, verify_download_token
from app.core.storage import storage
from app.db.models import Job
from app.db.session import SessionFactory
from app.settings import settings


async def get_job(session: AsyncSession, job_id: UUID, owner_key: str) -> Job:
    job = await session.get(Job, job_id)
    if job is None or job.owner_key != owner_key:
        raise APIError(ErrorCode.NOT_FOUND, "job not found")
    return job


async def cancel_job(session: AsyncSession, job_id: UUID, owner_key: str) -> Job:
    """Cancel a job that has not finished yet. Finished jobs are left untouched."""
    job = await get_job(session, job_id, owner_key)
    if job.status in ("queued", "processing"):
        job.status = "cancelled"
        job.finished_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(job)
    return job


async def queue_position(session: AsyncSession, job: Job) -> int | None:
    if job.status != "queued":
        return None
    pos = (
        await session.execute(
            select(func.count())
            .select_from(Job)
            .where(Job.status == "queued", Job.created_at <= job.created_at)
        )
    ).scalar() or 0
    return int(pos)


def download_url_for(job: Job) -> str | None:
    if job.status != "done" or not job.output_rel_path:
        return None
    token = sign_download_token(str(job.id), job.owner_key, settings.download_ttl_hours * 3600)
    return f"/v1/jobs/{job.id}/download?token={token}"


async def resolve_download(token: str) -> tuple[Job, str, str, str]:
    """Verify the HMAC token and return (job, filename, mime, absolute path)."""
    parsed = verify_download_token(token)
    if parsed is None:
        raise APIError(ErrorCode.UNAUTHORIZED, "download link is invalid or expired")
    job_id, owner_key = parsed
    try:
        job_uuid = UUID(job_id)
    except ValueError as exc:
        raise APIError(ErrorCode.NOT_FOUND, "job not found") from exc
    async with SessionFactory() as session:
        job = await session.get(Job, job_uuid)
        if job is None or job.owner_key != owner_key:
            raise APIError(ErrorCode.NOT_FOUND, "job not found")
        if job.status != "done" or not job.output_rel_path:
            raise APIError(ErrorCode.NOT_FOUND, "file is no longer available")
        path = storage.abs(job.output_rel_path)
        if not path.exists():
            raise APIError(ErrorCode.NOT_FOUND, "file is no longer available")
        name = sanitize_filename(job.output_name or f"converted-{job.id}")
        mime = _mime_for(job.to_format)
        return job, name, mime, str(path)


def _mime_for(slug: str) -> str:
    from app.formats import registry

    try:
        return registry.get_format(slug).mime
    except KeyError:
        return "application/octet-stream"


async def create_zip(session: AsyncSession, identity: Identity, job_ids: list[UUID]) -> tuple[str, str]:
    """Server-side zip of finished jobs (spec 4.4: no client-side JSZip)."""
    jobs: list[Job] = []
    for jid in job_ids[:100]:
        job = await session.get(Job, jid)
        if job is None or job.owner_key != identity.owner_key:
            raise APIError(ErrorCode.NOT_FOUND, "one of the jobs was not found")
        if job.status != "done" or not job.output_rel_path:
            raise APIError(ErrorCode.BAD_REQUEST, "all jobs must be finished first")
        jobs.append(job)
    if not jobs:
        raise APIError(ErrorCode.BAD_REQUEST, "no jobs given")

    zip_name = new_uuid_name("zip")
    zip_path = storage.jobs_dir() / zip_name
    used_names: set[str] = set()
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for job in jobs:
            src = storage.abs(job.output_rel_path)
            if not src.exists():
                continue
            name = sanitize_filename(job.output_name or f"{job.id}")
            base, dot, ext = name.rpartition(".")
            i = 1
            while name in used_names:
                i += 1
                name = f"{base}-{i}.{ext}" if dot else f"{name}-{i}"
            used_names.add(name)
            zf.write(src, name)

    rel = storage.rel(zip_path)
    token = sign_download_token(f"zip:{rel}", identity.owner_key, settings.download_ttl_hours * 3600)
    return f"/v1/jobs/zip/download?token={token}", rel


async def resolve_zip_download(token: str) -> tuple[str, str]:
    parsed = verify_download_token(token)
    if parsed is None:
        raise APIError(ErrorCode.UNAUTHORIZED, "download link is invalid or expired")
    job_id, _owner = parsed
    if not job_id.startswith("zip:"):
        raise APIError(ErrorCode.BAD_REQUEST, "invalid zip token")
    rel = job_id[4:]
    path = storage.abs(rel)
    if not path.exists() or path.suffix.lower() != ".zip":
        raise APIError(ErrorCode.NOT_FOUND, "file is no longer available")
    return str(path), "quickimgconvert.zip"

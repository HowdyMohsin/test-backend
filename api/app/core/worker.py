"""Worker: claims jobs from Postgres, converts, verifies, cleans up.

Runs inside the API container when ROLE is worker|both (spec 4.6).
Engines run isolated (subprocess + memory limit + timeout) via engines.base.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core import queue as q
from app.core.engines_dispatch import run_pair
from app.core.errors import ErrorCode
from app.core.events import log_event
from app.core.quota import refund
from app.core.security import disk_free_mb, new_uuid_name, sanitize_filename, sign_download_token
from app.core.storage import storage
from app.db.models import Job, Upload
from app.db.session import SessionFactory
from app.engines.base import EngineError, EngineTimeoutError, verify_output
from app.formats import registry
from app.formats.base import VIDEO_SLUGS
from app.settings import settings


def job_timeout_sec(size_bytes: int, video_seconds: float | None) -> float:
    """Timeout scales with file size and video length (spec 4.6)."""
    t = (
        settings.job_timeout_base_sec
        + (size_bytes / (1024 * 1024)) * settings.job_timeout_per_mb_sec
        + (video_seconds or 0) * settings.job_timeout_per_video_sec
    )
    return min(t, settings.job_timeout_max_sec)


def _output_name(upload: Upload | None, to_format: str, orig_name: str | None) -> str:
    stem = Path(sanitize_filename(orig_name or "converted")).stem or "converted"
    spec = registry.get_format(to_format)
    ext = spec.extensions[0]
    return f"{stem}.{ext}"


async def _set_progress(job_id: uuid.UUID, frac: float) -> None:
    async with SessionFactory() as s:
        job = await s.get(Job, job_id)
        if job:
            job.progress = frac
            await s.commit()


async def process_job(job_id: uuid.UUID) -> None:
    started = time.monotonic()
    async with SessionFactory() as s:
        job = await s.get(Job, job_id)
        if job is None or job.status != "processing":
            return
        upload = await s.get(Upload, job.upload_id) if job.upload_id else None
        owner_key, pair_slug = job.owner_key, job.pair_slug
        from_format, to_format = job.from_format, job.to_format
        job_settings = dict(job.settings or {})
        plan_id = job.plan_id
        video_seconds = job.video_seconds
        input_rel = upload.rel_path if upload else None
        input_bytes = upload.size_bytes if upload else 0
        await s.commit()

    pair = registry.get_pair(pair_slug)
    to_spec = registry.get_format(to_format)

    async def fail(code: ErrorCode, message: str) -> None:
        async with SessionFactory() as s2:
            async with s2.begin():
                j = await s2.get(Job, job_id)
                if j:
                    j.status = "failed"
                    j.error_code = code.value
                    j.error_message = message
                    j.finished_at = datetime.now(timezone.utc)
                await refund(s2, owner_key)
                await log_event(
                    s2, owner_key=owner_key, plan_id=plan_id, pair_slug=pair_slug,
                    from_format=from_format, to_format=to_format,
                    input_bytes=input_bytes, output_bytes=0,
                    duration_ms=int((time.monotonic() - started) * 1000),
                    status="failed", error_code=code.value,
                    is_video=from_format in VIDEO_SLUGS or to_format in VIDEO_SLUGS,
                )

    if input_rel is None:
        await fail(ErrorCode.INTERNAL, "upload file is missing")
        return
    input_path = storage.abs(input_rel)
    if not input_path.exists():
        await fail(ErrorCode.UPLOAD_EXPIRED, "upload file expired")
        return

    timeout = job_timeout_sec(input_bytes, video_seconds)
    out_name = new_uuid_name(to_spec.extensions[0])
    output_path = storage.jobs_dir() / out_name

    loop = asyncio.get_running_loop()

    def on_progress(frac: float) -> None:
        asyncio.run_coroutine_threadsafe(_set_progress(job_id, frac), loop)

    try:
        # never let a corrupt input crash the worker: engines raise EngineError
        result_path = await asyncio.to_thread(
            run_pair, pair.engine, str(job_id), input_path, output_path,
            from_format, to_format, job_settings, timeout, on_progress,
        )
        verify_output(result_path, to_format)
        output_size = result_path.stat().st_size
    except EngineTimeoutError as exc:
        await fail(ErrorCode.JOB_TIMEOUT, f"conversion timed out: {exc}")
        return
    except EngineError as exc:
        msg = str(exc).splitlines()[0][:500]
        code = ErrorCode.CORRUPT_FILE if "pixel_limit" in msg or "corrupt" in msg.lower() else ErrorCode.INTERNAL
        await fail(code, msg)
        return
    except Exception as exc:  # noqa: BLE001 — worker must never die on one job
        await fail(ErrorCode.INTERNAL, f"unexpected error: {type(exc).__name__}")
        return

    download_name = _output_name(upload, to_format, None)
    token = sign_download_token(str(job_id), owner_key, settings.download_ttl_hours * 3600)
    async with SessionFactory() as s3:
        async with s3.begin():
            j = await s3.get(Job, job_id)
            if j:
                j.status = "done"
                j.progress = 1.0
                j.output_rel_path = storage.rel(result_path)
                j.output_size = output_size
                j.output_name = download_name
                j.finished_at = datetime.now(timezone.utc)
            await log_event(
                s3, owner_key=owner_key, plan_id=plan_id, pair_slug=pair_slug,
                from_format=from_format, to_format=to_format,
                input_bytes=input_bytes, output_bytes=output_size,
                duration_ms=int((time.monotonic() - started) * 1000),
                status="done",
                is_video=from_format in VIDEO_SLUGS or to_format in VIDEO_SLUGS,
            )
    # token is stateless (HMAC); nothing to store


async def worker_loop(worker_id: int, stop: asyncio.Event) -> None:
    while not stop.is_set():
        job_id: uuid.UUID | None = None
        held = False
        try:
            async with SessionFactory() as s:
                async with s.begin():
                    job_id, held = await q.claim_next(s)
        except Exception:
            await asyncio.sleep(2)
            continue
        if job_id is None:
            await asyncio.sleep(1)
            continue
        try:
            await process_job(job_id)
        finally:
            if held:
                async with SessionFactory() as s:
                    await q.release_video_slot(s)


async def cleanup_loop(stop: asyncio.Event) -> None:
    """Every 5 minutes: delete expired uploads and old job outputs (spec 4.5)."""
    interval = settings.cleanup_interval_min * 60
    while not stop.is_set():
        try:
            await run_cleanup_once()
        except Exception:
            pass
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except asyncio.TimeoutError:
            pass


async def run_cleanup_once() -> dict:
    now = datetime.now(timezone.utc)
    removed_uploads = 0
    removed_outputs = 0
    async with SessionFactory() as s:
        # expired uploads: delete files + rows
        rows = (
            await s.execute(select(Upload).where(Upload.expires_at < now).limit(500))
        ).scalars().all()
        for up in rows:
            try:
                storage.abs(up.rel_path).unlink(missing_ok=True)
            except Exception:
                pass
            await s.delete(up)
            removed_uploads += 1
        # job outputs older than the download TTL
        cutoff = now - timedelta(hours=settings.download_ttl_hours)
        jobs = (
            await s.execute(
                select(Job).where(Job.status == "done", Job.finished_at < cutoff).limit(500)
            )
        ).scalars().all()
        for j in jobs:
            if j.output_rel_path:
                try:
                    storage.abs(j.output_rel_path).unlink(missing_ok=True)
                except Exception:
                    pass
                j.output_rel_path = None
                j.status = "expired"
                removed_outputs += 1
        await s.commit()
    return {"uploads": removed_uploads, "outputs": removed_outputs}


async def startup_recovery() -> int:
    async with SessionFactory() as s:
        return await q.recover_stuck(s)


def disk_ok() -> bool:
    try:
        return disk_free_mb(settings.data_dir) >= settings.disk_min_free_mb
    except Exception:
        return True

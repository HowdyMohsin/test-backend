"""Upload service: stream the file, verify magic bytes, enforce limits."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import APIError, ErrorCode
from app.core.plan_guard import Identity
from app.core.security import detect_candidates, disk_free_mb, extension_consistent, new_uuid_name
from app.core.storage import storage
from app.db.models import Upload
from app.settings import settings

CHUNK = 1024 * 256
HEAD_FOR_MAGIC = 64 * 1024


async def create_upload(
    session: AsyncSession, identity: Identity, file: UploadFile
) -> Upload:
    if not disk_free_mb(settings.data_dir) >= settings.disk_min_free_mb:
        raise APIError(ErrorCode.INTERNAL, "server storage is full, try again later")

    max_bytes = settings.max_upload_mb * 1024 * 1024
    filename = file.filename or "upload.bin"

    # stream to disk while enforcing the size cap mid-stream (spec 4.5)
    tmp_name = new_uuid_name("part")
    tmp_path = storage.uploads_dir() / tmp_name
    size = 0
    head = b""
    try:
        with tmp_path.open("wb") as fh:
            while True:
                chunk = await file.read(CHUNK)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    raise APIError(
                        ErrorCode.FILE_TOO_LARGE,
                        f"file exceeds the {settings.max_upload_mb} MB upload cap",
                    )
                if len(head) < HEAD_FOR_MAGIC:
                    head += chunk[: HEAD_FOR_MAGIC - len(head)]
                fh.write(chunk)
    except APIError:
        tmp_path.unlink(missing_ok=True)
        raise

    candidates = detect_candidates(head)
    if not candidates:
        tmp_path.unlink(missing_ok=True)
        raise APIError(ErrorCode.UNSUPPORTED_FORMAT, "file type not recognized")
    spec = extension_consistent(candidates, filename)
    if spec is None:
        tmp_path.unlink(missing_ok=True)
        raise APIError(
            ErrorCode.MAGIC_MISMATCH,
            "file extension does not match the actual file content",
            {"detected": [c.slug for c in candidates]},
        )

    # format-level guards (spec 4.7)
    if spec.slug == "svg" and size > settings.svg_max_bytes:
        tmp_path.unlink(missing_ok=True)
        raise APIError(ErrorCode.FILE_TOO_LARGE, "SVG file is too large")

    final_name = new_uuid_name(spec.extensions[0])
    final_path = storage.uploads_dir() / final_name
    tmp_path.rename(final_path)

    upload = Upload(
        owner_key=identity.owner_key,
        format_slug=spec.slug,
        size_bytes=size,
        rel_path=storage.rel(final_path),
        ext=spec.extensions[0],
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.upload_ttl_hours),
    )
    session.add(upload)
    await session.commit()
    await session.refresh(upload)
    return upload


async def get_upload(session: AsyncSession, upload_id: UUID, owner_key: str) -> Upload:
    upload = await session.get(Upload, upload_id)
    if upload is None or upload.owner_key != owner_key:
        raise APIError(ErrorCode.NOT_FOUND, "upload not found")
    if upload.expires_at < datetime.now(timezone.utc):
        raise APIError(ErrorCode.UPLOAD_EXPIRED, "upload expired, please upload again")
    path = storage.abs(upload.rel_path)
    if not path.exists():
        raise APIError(ErrorCode.UPLOAD_EXPIRED, "upload file expired")
    return upload


async def delete_upload(session: AsyncSession, upload_id: UUID, owner_key: str) -> None:
    """Delete an upload owned by the caller: file from disk, row from the DB."""
    stored_upload = await session.get(Upload, upload_id)
    if stored_upload is None or stored_upload.owner_key != owner_key:
        raise APIError(ErrorCode.NOT_FOUND, "upload not found")
    storage.abs(stored_upload.rel_path).unlink(missing_ok=True)
    await session.delete(stored_upload)
    await session.commit()


def probe_video_seconds(path: Path) -> float | None:
    """ffprobe duration; None when not a video or ffprobe missing."""
    import json
    import shutil
    import subprocess

    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return None
    try:
        r = subprocess.run(
            [ffprobe, "-v", "quiet", "-print_format", "json", "-show_format", str(path)],
            capture_output=True,
            timeout=60,
        )
        return float(json.loads(r.stdout.decode())["format"].get("duration") or 0) or None
    except Exception:
        return None


def probe_pixels(path: Path, slug: str) -> int | None:
    """Pixel count for raster inputs; None when unreadable here (worker re-checks)."""
    try:
        if slug in ("jpg", "png", "webp", "avif", "gif", "tiff", "heic"):
            import pyvips

            img = pyvips.Image.new_from_file(str(path), access="sequential")
            return img.width * img.height
    except Exception:
        return None
    return None

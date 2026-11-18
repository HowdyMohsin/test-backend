from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ...core import catalog, plan_guard
from ...core.auth import Identity, get_identity
from ...core.errors import ApiError
from ...core.security import rate_limited, safe_stem
from ...core.site import site_settings
from ...core.storage import storage
from ...db.models import Upload
from ...db.session import get_db
from ...engines.probe import file_info
from ...formats import registry
from ...settings import get_settings
from .common import ensure_active

router = APIRouter()
_FAMILIES = [{"mp4", "mov", "m4a"}, {"mkv", "webm"}, {"ogg", "opus"}]
_PUBLIC_INFO = ("width", "height", "has_alpha", "animated", "frames", "has_gps", "has_exif", "duration", "has_video", "has_audio", "pages")


def _compatible(sniffed: str, by_ext: str | None) -> bool:
    return by_ext is None or sniffed == by_ext or any(sniffed in f and by_ext in f for f in _FAMILIES)


@router.post("/uploads")
async def upload_file(request: Request, file: UploadFile = File(...), ident: Identity = Depends(get_identity),
                      db: AsyncSession = Depends(get_db)):
    await ensure_active(db)
    s = get_settings()
    if rate_limited("up:" + ident.owner_key, s.upload_rate_per_minute):
        raise ApiError("rate_limited", "Too many uploads. Please wait a minute.", 429)
    hard = max(plan_guard.max_bytes(ident, c) for c in ("image", "audio", "video"))
    declared = int(request.headers.get("content-length") or 0)
    if declared > hard + 1_000_000:  # refuse early, before reading the body
        raise ApiError("file_too_large", "This file is larger than your plan allows.", 413)
    if storage.free_bytes() < max(declared, 1) * 2 + 500_000_000:
        raise ApiError("storage_full", "The server is busy right now. Please try again later.", 503)
    uid = uuid.uuid4()
    folder = storage.upload_dir(uid)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / "original.bin"
    size, head = 0, b""
    try:
        with open(path, "wb") as out:
            while chunk := await file.read(1 << 20):
                size += len(chunk)
                if size > hard:
                    raise ApiError("file_too_large", "This file is larger than your plan allows.", 413)
                if not head:
                    head = chunk[:8192]
                await asyncio.to_thread(out.write, chunk)
        filename = file.filename or "file"
        slug = registry.detect(head, filename)
        by_ext = registry.slug_for_extension(filename)
        if slug is None:
            if by_ext:
                raise ApiError("magic_mismatch", f"This file is named .{filename.rsplit('.', 1)[-1].lower()} but its contents are not a valid "
                                                 f"{registry.formats()[by_ext].name} file.", 422)
            raise ApiError("unsupported_format", "This file type is not supported.", 422)
        if not _compatible(slug, by_ext):
            raise ApiError("magic_mismatch", f"The file name says {registry.formats()[by_ext].name} but the contents are "
                                             f"{registry.formats()[slug].name}. Rename it or upload the correct file.", 422)
        spec = registry.formats()[slug]
        info = await asyncio.to_thread(file_info, path, slug, spec.category)
        if not info.get("valid"):
            raise ApiError("corrupt_file", "This file could not be read. It may be damaged.", 422)
        await plan_guard.check_upload(db, ident, spec.category, size, info)
        st = await catalog.states(db)
        targets = [p.dst.slug for p in registry.pairs().values() if p.src is spec and catalog.pair_live(st, p)]
        if not targets:
            raise ApiError("unsupported_format", f"No converter is available for {spec.name} right now.", 422)
    except BaseException:
        storage.remove(folder)
        raise
    retention = int((await site_settings(db)).get("retention_minutes") or s.retention_minutes)
    expires = datetime.now(timezone.utc) + timedelta(minutes=retention)
    db.add(Upload(id=uid, owner_key=ident.owner_key, filename=safe_stem(filename), size=size, detected_format=slug,
                  category=spec.category, info=info, path=str(path), expires_at=expires))
    await db.commit()
    return {"upload_id": str(uid), "detected_format": slug, "category": spec.category, "size": size,
            "info": {k: info[k] for k in _PUBLIC_INFO if k in info}, "targets": targets, "expires_at": expires.isoformat()}


@router.delete("/uploads/{upload_id}")
async def delete_upload(upload_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    up = await db.get(Upload, upload_id)
    if up:
        await db.delete(up)
        await db.commit()
        storage.remove(storage.upload_dir(upload_id))
    return {"ok": True}

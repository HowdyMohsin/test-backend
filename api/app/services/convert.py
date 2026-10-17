"""Convert service: plan check BEFORE conversion, then enqueue (spec 4.5)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import APIError, ErrorCode
from app.core.plan_guard import Identity, check_conversion
from app.core.storage import storage
from app.db.models import Job
from app.formats import registry
from app.formats.base import VIDEO_SLUGS
from app.services.uploads import get_upload, probe_pixels, probe_video_seconds
from app.settings import settings


def _validate_settings(to_format: str, settings_in: dict) -> dict:
    """User settings are only accepted if declared by the target format (spec 4.7)."""
    spec = registry.get_format(to_format)
    declared = {f.key: f for f in spec.output_settings}
    clean: dict = {}
    for key, value in (settings_in or {}).items():
        field = declared.get(key)
        if field is None:
            continue  # unknown keys are dropped, never passed to engines
        clean[key] = _coerce(field, value)
    # fill defaults
    for key, field in declared.items():
        clean.setdefault(key, field.default)
    return clean


def _coerce(field, value):
    try:
        if field.type == "boolean":
            return bool(value)
        if field.type in ("range", "number"):
            v = float(value)
            if field.min is not None:
                v = max(field.min, v)
            if field.max is not None:
                v = min(field.max, v)
            return int(v) if field.type == "number" or v.is_integer() else v
        if field.type == "select":
            return str(value) if str(value) in field.options else field.default
        if field.type == "color":
            s = str(value)
            return s if len(s) == 7 and s.startswith("#") else field.default
    except (ValueError, TypeError):
        return field.default
    return value


async def create_job(
    session: AsyncSession, identity: Identity, upload_id: UUID, to: str, settings_in: dict
) -> Job:
    upload = await get_upload(session, upload_id, identity.owner_key)
    try:
        pair = registry.get_pair(f"{upload.format_slug}-to-{to}")
    except KeyError as exc:
        raise APIError(ErrorCode.PAIR_NOT_AVAILABLE, "this conversion is not offered") from exc

    input_path = storage.abs(upload.rel_path)
    video_seconds = None
    if upload.format_slug in VIDEO_SLUGS or to in VIDEO_SLUGS:
        video_seconds = probe_video_seconds(input_path)
    pixels = probe_pixels(input_path, upload.format_slug)
    if pixels and pixels > settings.max_pixels:
        raise APIError(ErrorCode.PIXEL_LIMIT, "image exceeds the 100 megapixel limit")

    clean_settings = _validate_settings(to, settings_in)

    # PLAN CHECK FIRST — quota is reserved here, before any work starts.
    gate = await check_conversion(
        session,
        identity,
        pair_slug=pair.slug,
        size_bytes=upload.size_bytes,
        to_format=to,
        video_seconds=video_seconds,
    )

    job = Job(
        owner_key=identity.owner_key,
        upload_id=upload.id,
        from_format=upload.format_slug,
        to_format=to,
        pair_slug=pair.slug,
        settings=clean_settings,
        status="queued",
        plan_id=identity.tier,
        video_seconds=video_seconds,
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)
    return job

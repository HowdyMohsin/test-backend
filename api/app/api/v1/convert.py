from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ...core import plan_guard
from ...core.auth import Identity, get_identity
from ...core.errors import ApiError
from ...db.models import Job, Upload
from ...db.session import get_db
from ...formats import registry
from ...formats.validate import SettingsError, validate
from .common import ensure_active

router = APIRouter()


class ConvertIn(BaseModel):
    upload_id: uuid.UUID
    to: str = Field(min_length=2, max_length=16)
    settings: dict = Field(default_factory=dict)
    batch_id: uuid.UUID | None = None
    name_pattern: str = Field(default="{name}", max_length=120)


@router.post("/convert")
async def start_convert(body: ConvertIn, ident: Identity = Depends(get_identity), db: AsyncSession = Depends(get_db)):
    await ensure_active(db)
    upload = await db.get(Upload, body.upload_id)
    if upload is None:
        raise ApiError("upload_expired", "The uploaded file has expired. Please upload it again.", 404)
    pair = registry.pair_for(upload.detected_format, body.to)
    if pair is None:
        raise ApiError("pair_not_available", f"{upload.detected_format.upper()} cannot be converted to {body.to.upper()}.", 422)
    try:
        settings = validate(pair.fields, body.settings)
    except SettingsError as e:
        raise ApiError("invalid_settings", str(e), 422) from e
    await plan_guard.check_convert(db, ident, pair, upload, body.batch_id)  # reserves quota or raises
    job = Job(batch_id=body.batch_id, owner_key=ident.owner_key, user_id=ident.user.id if ident.user else None,
              upload_id=upload.id, pair_slug=pair.slug, from_slug=pair.src.slug, to_slug=pair.dst.slug, category=upload.category,
              route=pair.route, settings=settings, name_pattern=body.name_pattern, plan=ident.plan.id,
              source_name=f"{upload.filename}.{pair.src.ext}", in_size=upload.size,
              timeout_s=plan_guard.timeout_for(upload.category, upload.size, upload.info))
    db.add(job)
    await db.commit()
    return {"job_id": str(job.id)}

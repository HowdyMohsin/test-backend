"""Upload endpoints: create and delete."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_identity
from app.core.plan_guard import Identity
from app.schemas import v1 as api_schemas
from app.services import uploads as upload_service
from app.settings import settings

router = APIRouter()


@router.post("/uploads", response_model=api_schemas.UploadResponse, status_code=201)
async def create_upload(
    response: Response,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    ident: tuple[Identity, str | None] = Depends(get_identity),
) -> api_schemas.UploadResponse:
    identity, new_cookie = ident
    if new_cookie:
        response.set_cookie(
            settings.anon_cookie_name, new_cookie, httponly=True, samesite="lax", max_age=31536000
        )
    upload = await upload_service.create_upload(db, identity, file)
    return api_schemas.UploadResponse(
        upload_id=upload.id,
        detected_format=upload.format_slug,
        size=upload.size_bytes,
        expires_at=upload.expires_at,
    )


@router.delete("/uploads/{upload_id}")
async def delete_upload(
    upload_id: UUID,
    db: AsyncSession = Depends(get_db),
    ident: tuple[Identity, str | None] = Depends(get_identity),
) -> dict:
    """Delete an upload owned by the caller (file + database row)."""
    identity, _new_cookie = ident
    await upload_service.delete_upload(db, upload_id, identity.owner_key)
    return {"ok": True}

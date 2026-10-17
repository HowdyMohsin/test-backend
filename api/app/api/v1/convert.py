"""POST /v1/convert"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_identity
from app.core.plan_guard import Identity
from app.schemas import v1 as s
from app.services import convert as convert_service
from app.settings import settings

router = APIRouter()


@router.post("/convert", response_model=s.ConvertResponse, status_code=201)
async def create_conversion(
    body: s.ConvertRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    ident: tuple[Identity, str | None] = Depends(get_identity),
) -> s.ConvertResponse:
    identity, new_cookie = ident
    if new_cookie:
        response.set_cookie(
            settings.anon_cookie_name, new_cookie, httponly=True, samesite="lax", max_age=31536000
        )
    job = await convert_service.create_job(db, identity, body.upload_id, body.to, body.settings)
    return s.ConvertResponse(job_id=job.id)

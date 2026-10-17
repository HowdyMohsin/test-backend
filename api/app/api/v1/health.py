"""GET /v1/health"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core import queue as q
from app.schemas import v1 as s
from app.settings import settings

router = APIRouter()


@router.get("/health", response_model=s.HealthResponse)
async def health(db: AsyncSession = Depends(get_db)) -> s.HealthResponse:
    return s.HealthResponse(
        status="ok", queue_depth=await q.queue_depth(db), version=settings.app_version
    )

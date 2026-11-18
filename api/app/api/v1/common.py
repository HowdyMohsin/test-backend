from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from ...core import site
from ...core.errors import ApiError


async def ensure_active(db: AsyncSession) -> None:
    s = await site.site_settings(db)
    if s.get("maintenance_enabled"):
        raise ApiError("maintenance", s.get("maintenance_message") or await site.msg(db, "maintenance", "free"), 503)

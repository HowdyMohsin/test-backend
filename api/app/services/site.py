"""Public site settings: maintenance mode, announcement bar, honest public counter.

Values live in the app_settings table (keys: "site") so the admin Settings tab
can change them without code deploys. Missing rows fall back to safe defaults.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AppSetting, Event
from app.schemas import v1 as api_schemas


async def get_site_status(session: AsyncSession) -> api_schemas.SiteResponse:
    setting_row = await session.get(AppSetting, "site")
    stored: dict = dict(setting_row.value) if setting_row and setting_row.value else {}

    maintenance_data = stored.get("maintenance") or {}
    maintenance = api_schemas.SiteMaintenanceSchema(
        on=bool(maintenance_data.get("on", False)),
        message=str(maintenance_data.get("message", "")),
    )

    announcement = _parse_announcement(stored.get("announcement"))
    public_counter = await _public_counter(session, stored)

    return api_schemas.SiteResponse(
        maintenance=maintenance,
        announcement=announcement,
        public_counter=public_counter,
    )


def _parse_announcement(raw: object) -> api_schemas.SiteAnnouncementSchema | None:
    if not isinstance(raw, dict):
        return None
    text = str(raw.get("text", "")).strip()
    if not text:
        return None
    expires_raw = raw.get("expires_at")
    expires_at = None
    if expires_raw:
        try:
            expires_at = datetime.fromisoformat(str(expires_raw))
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                return None
        except ValueError:
            expires_at = None
    return api_schemas.SiteAnnouncementSchema(
        text=text,
        link=str(raw.get("link", "")),
        expires_at=expires_at,
    )


async def _public_counter(session: AsyncSession, stored: dict) -> int | None:
    """Honest counter: real completed conversions, only when explicitly enabled."""
    if not stored.get("public_counter_enabled"):
        return None
    total = await session.scalar(
        select(func.count()).select_from(Event).where(Event.status == "done")
    )
    return int(total or 0)

"""Admin: settings tab — key/value app settings."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import audit, get_db, require_tab
from app.db.models import AdminUser, AppSetting
from app.schemas import v1 as s

router = APIRouter()
_guard = require_tab("settings")


@router.get("/settings")
async def list_settings(
    _admin: AdminUser = Depends(_guard), db: AsyncSession = Depends(get_db)
) -> dict[str, dict]:
    rows = (await db.execute(select(AppSetting))).scalars().all()
    return {r.key: r.value for r in rows}


@router.patch("/settings/{key}")
async def update_setting(
    key: str,
    body: s.SettingUpdate,
    request: Request,
    admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await db.get(AppSetting, key)
    if row is None:
        row = AppSetting(key=key, value=body.value)
        db.add(row)
    else:
        row.value = body.value
    await db.commit()
    await audit(db, admin, "setting.update", request, target=key)
    return {"key": key, "value": row.value}

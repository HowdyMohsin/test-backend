from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ApiError
from ...db.models import AdminUser, AdSlot
from ...db.session import get_db
from .deps import audit, tab

router = APIRouter(prefix="/ads", dependencies=[Depends(tab("ads"))])


@router.get("")
async def list_ads(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(AdSlot).order_by(AdSlot.key))).scalars()
    return {"slots": [{"key": r.key, "label": r.label, "enabled": r.enabled, "code": r.code} for r in rows],
            "rules": ["Ads are shown to Anonymous and Free users only. Pro users never see ads.",
                      "There is no slot inside the converter tool or between upload and download, and none can be added here."]}


class AdIn(BaseModel):
    enabled: bool
    code: str = ""


@router.put("/{key}")
async def update_ad(key: str, body: AdIn, admin: AdminUser = Depends(tab("ads")), db: AsyncSession = Depends(get_db)):
    r = await db.get(AdSlot, key)
    if r is None:
        raise ApiError("not_found", "Ad slot not found.", 404)
    await audit(db, admin, "ad.update", key, {"enabled": r.enabled}, {"enabled": body.enabled})
    r.enabled, r.code = body.enabled, body.code[:20000]
    await db.commit()
    return {"ok": True}

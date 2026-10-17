"""Admin: ads tab — manage ad slots shown to free users."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import audit, get_db, require_tab
from app.db.models import AdminUser, AdSlot
from app.schemas import v1 as s

router = APIRouter()
_guard = require_tab("ads")


@router.get("/ads", response_model=list[s.AdSlotSchema])
async def list_slots(
    _admin: AdminUser = Depends(_guard), db: AsyncSession = Depends(get_db)
) -> list[s.AdSlotSchema]:
    rows = (await db.execute(select(AdSlot).order_by(AdSlot.id))).scalars().all()
    return [s.AdSlotSchema(id=r.id, code=r.code or "", enabled=r.enabled) for r in rows]


@router.patch("/ads/{slot_id}", response_model=s.AdSlotSchema)
async def update_slot(
    slot_id: str,
    body: s.AdSlotUpdate,
    request: Request,
    admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
) -> s.AdSlotSchema:
    slot = await db.get(AdSlot, slot_id)
    if slot is None:
        # slots are created on demand so the frontend never 404s
        slot = AdSlot(id=slot_id)
        db.add(slot)
    if body.code is not None:
        slot.code = body.code[:20000]
    if body.enabled is not None:
        slot.enabled = body.enabled
    await db.commit()
    await audit(db, admin, "ad.update", request, target=slot_id,
                details=body.model_dump(exclude_none=True))
    return s.AdSlotSchema(id=slot.id, code=slot.code or "", enabled=slot.enabled)

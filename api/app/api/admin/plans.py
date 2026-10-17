"""Admin: plans & messages tab."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import audit, get_db, require_tab
from app.core.errors import APIError, ErrorCode
from app.db.models import AdminUser, Message, Plan
from app.schemas import v1 as s

router = APIRouter()
_guard = require_tab("plans")


@router.get("/plans", response_model=list[s.PlanSchema])
async def list_plans(
    _admin: AdminUser = Depends(_guard), db: AsyncSession = Depends(get_db)
) -> list[s.PlanSchema]:
    plans = (await db.execute(select(Plan).order_by(Plan.price_cents))).scalars().all()
    return [
        s.PlanSchema(id=p.id, name=p.name, price_cents=p.price_cents, limits=dict(p.limits or {}))
        for p in plans
    ]


@router.patch("/plans/{plan_id}", response_model=s.PlanSchema)
async def update_plan(
    plan_id: str,
    body: s.PlanUpdate,
    request: Request,
    admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
) -> s.PlanSchema:
    plan = await db.get(Plan, plan_id)
    if plan is None:
        raise APIError(ErrorCode.NOT_FOUND, "plan not found")
    if body.name is not None:
        plan.name = body.name[:64]
    if body.price_cents is not None:
        if body.price_cents < 0:
            raise APIError(ErrorCode.BAD_REQUEST, "price cannot be negative")
        plan.price_cents = body.price_cents
    if body.limits is not None:
        merged = dict(plan.limits or {})
        merged.update(body.limits)
        plan.limits = merged
    await db.commit()
    await audit(db, admin, "plan.update", request, target=plan_id, details=body.model_dump(exclude_none=True))
    return s.PlanSchema(id=plan.id, name=plan.name, price_cents=plan.price_cents, limits=dict(plan.limits or {}))


@router.get("/messages")
async def list_messages(
    _admin: AdminUser = Depends(_guard), db: AsyncSession = Depends(get_db)
) -> dict[str, str]:
    rows = (await db.execute(select(Message))).scalars().all()
    return {m.key: m.text for m in rows}


@router.patch("/messages/{key}")
async def update_message(
    key: str,
    body: s.MessageUpdate,
    request: Request,
    admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    msg = await db.get(Message, key)
    if msg is None:
        raise APIError(ErrorCode.NOT_FOUND, "message key not found")
    msg.text = body.text[:2000]
    await db.commit()
    await audit(db, admin, "message.update", request, target=key)
    return {"key": key, "text": msg.text}

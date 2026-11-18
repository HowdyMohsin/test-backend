from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core import site
from ...core.errors import ApiError
from ...db.models import AdminUser, Message, Plan
from ...db.session import get_db
from .deps import audit, tab

router = APIRouter(prefix="/plans", dependencies=[Depends(tab("plans"))])
SEED = Path(__file__).resolve().parents[3] / "seed"
_LIMIT_KEYS = {"max_image_mb", "max_audio_mb", "max_video_mb", "max_batch", "daily_conversions", "max_video_minutes", "ads"}


@router.get("")
async def list_plans(db: AsyncSession = Depends(get_db)):
    plans = (await db.execute(select(Plan).order_by(Plan.sort))).scalars()
    msgs = (await db.execute(select(Message).order_by(Message.key))).scalars()
    default = json.loads((SEED / "messages.json").read_text())
    return {"plans": [{"id": p.id, "name": p.name, "price_cents": p.price_cents, "limits": p.limits} for p in plans],
            "messages": [{"key": m.key, "text": m.text, "default": default.get(m.key, "")} for m in msgs],
            "placeholders": ["{used}", "{limit}", "{reset_in}", "{size}", "{max}", "{next_limit}", "{next_max}", "{duration}"]}


class PlanIn(BaseModel):
    name: str
    price_cents: int
    limits: dict


@router.put("/{plan_id}")
async def update_plan(plan_id: str, body: PlanIn, admin: AdminUser = Depends(tab("plans")), db: AsyncSession = Depends(get_db)):
    p = await db.get(Plan, plan_id)
    if p is None:
        raise ApiError("not_found", "Plan not found.", 404)
    if set(body.limits) - _LIMIT_KEYS:
        raise ApiError("invalid_request", "Unknown limit: " + ", ".join(sorted(set(body.limits) - _LIMIT_KEYS)), 422)
    before = {"name": p.name, "price_cents": p.price_cents, "limits": p.limits}
    p.name, p.price_cents, p.limits = body.name, max(0, body.price_cents), body.limits
    await audit(db, admin, "plan.update", plan_id, before, body.model_dump())
    await db.commit()
    site.invalidate()
    return {"ok": True}


class MsgIn(BaseModel):
    text: str


@router.put("/messages/{key}")
async def update_message(key: str, body: MsgIn, admin: AdminUser = Depends(tab("plans")), db: AsyncSession = Depends(get_db)):
    m = await db.get(Message, (key, "en"))
    if m is None:
        raise ApiError("not_found", "Message not found.", 404)
    before = m.text
    m.text = body.text.strip()[:600]
    await audit(db, admin, "message.update", key, before, m.text)
    await db.commit()
    site.invalidate()
    return {"ok": True}


@router.post("/messages/{key}/reset")
async def reset_message(key: str, admin: AdminUser = Depends(tab("plans")), db: AsyncSession = Depends(get_db)):
    default = json.loads((SEED / "messages.json").read_text()).get(key)
    m = await db.get(Message, (key, "en"))
    if m is None or default is None:
        raise ApiError("not_found", "No default for this message.", 404)
    await audit(db, admin, "message.reset", key, m.text, default)
    m.text = default
    await db.commit()
    site.invalidate()
    return {"ok": True, "text": default}

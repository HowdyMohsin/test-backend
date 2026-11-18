from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ...core import quota
from ...core.errors import ApiError
from ...core.storage import storage
from ...db.models import AdminUser, Job, Plan, User, Waitlist
from ...db.session import get_db
from .deps import audit, tab

router = APIRouter(prefix="/users", dependencies=[Depends(tab("users"))])


@router.get("")
async def list_users(q: str = "", plan: str = "", page: int = Query(1, ge=1), db: AsyncSession = Depends(get_db)):
    stmt = select(User)
    if q:
        stmt = stmt.where(User.email.ilike(f"%{q}%"))
    if plan:
        stmt = stmt.where(User.plan == plan)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.order_by(User.created_at.desc()).limit(25).offset((page - 1) * 25))).scalars().all()
    used = {k: v for k, v in (await db.execute(text("select owner_key, used from quotas where day=:d"), {"d": quota.today()})).all()}
    return {"total": total, "page": page, "users": [
        {"id": str(u.id), "email": u.email, "plan": u.plan, "banned": u.banned, "used_today": used.get(f"u:{u.id}", 0),
         "created_at": u.created_at.isoformat(), "last_seen_at": u.last_seen_at.isoformat()} for u in rows]}


class UserPatch(BaseModel):
    plan: str | None = None
    banned: bool | None = None


@router.patch("/{user_id}")
async def patch_user(user_id: uuid.UUID, body: UserPatch, admin: AdminUser = Depends(tab("users")), db: AsyncSession = Depends(get_db)):
    u = await db.get(User, user_id)
    if u is None:
        raise ApiError("not_found", "User not found.", 404)
    before = {"plan": u.plan, "banned": u.banned}
    if body.plan is not None:
        if await db.get(Plan, body.plan) is None or body.plan == "anonymous":
            raise ApiError("invalid_request", "Unknown plan.", 422)
        u.plan = body.plan
    if body.banned is not None:
        u.banned = body.banned
    await audit(db, admin, "user.update", u.email or str(u.id), before, {"plan": u.plan, "banned": u.banned})
    await db.commit()
    return {"ok": True}


@router.post("/{user_id}/reset-quota")
async def reset_quota(user_id: uuid.UUID, admin: AdminUser = Depends(tab("users")), db: AsyncSession = Depends(get_db)):
    u = await db.get(User, user_id)
    if u is None:
        raise ApiError("not_found", "User not found.", 404)
    await db.execute(text("delete from quotas where owner_key=:k and day=:d"), {"k": f"u:{u.id}", "d": quota.today()})
    await audit(db, admin, "user.reset_quota", u.email or str(u.id))
    await db.commit()
    return {"ok": True}


@router.delete("/{user_id}")
async def delete_user(user_id: uuid.UUID, admin: AdminUser = Depends(tab("users")), db: AsyncSession = Depends(get_db)):
    u = await db.get(User, user_id)
    if u is None:
        raise ApiError("not_found", "User not found.", 404)
    ids = (await db.execute(select(Job.id).where(Job.owner_key == f"u:{u.id}"))).scalars().all()
    for i in ids:
        storage.remove(storage.job_dir(i))
    await db.execute(text("delete from jobs where owner_key=:k"), {"k": f"u:{u.id}"})
    await db.execute(text("delete from quotas where owner_key=:k"), {"k": f"u:{u.id}"})
    await audit(db, admin, "user.delete", u.email or str(u.id))
    await db.delete(u)
    await db.commit()
    return {"ok": True}


@router.get("/waitlist/all")
async def waitlist(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Waitlist).order_by(Waitlist.created_at.desc()).limit(500))).scalars()
    return {"entries": [{"id": r.id, "email": r.email, "plan": r.plan, "source": r.source, "created_at": r.created_at.isoformat()} for r in rows]}

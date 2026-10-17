"""Admin: users tab — list, change plan, ban."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import audit, get_db, require_tab
from app.core.errors import APIError, ErrorCode
from app.db.models import AdminUser, Plan, User
from app.schemas import v1 as s

router = APIRouter()
_guard = require_tab("users")


@router.get("/users", response_model=list[s.UserAdminSchema])
async def list_users(
    q: str | None = Query(default=None, max_length=120),
    plan: str | None = Query(default=None, max_length=32),
    banned: bool | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    _admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
) -> list[s.UserAdminSchema]:
    stmt = select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(User.email.ilike(like), User.firebase_uid.ilike(like)))
    if plan:
        stmt = stmt.where(User.plan_id == plan)
    if banned is not None:
        stmt = stmt.where(User.banned == banned)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        s.UserAdminSchema(
            id=u.id, email=u.email, firebase_uid=u.firebase_uid,
            plan_id=u.plan_id, banned=u.banned, created_at=u.created_at,
        )
        for u in rows
    ]


@router.patch("/users/{user_id}", response_model=s.UserAdminSchema)
async def update_user(
    user_id: str,
    request: Request,
    admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
    plan_id: str | None = Query(default=None),
    banned: bool | None = Query(default=None),
) -> s.UserAdminSchema:
    from uuid import UUID

    try:
        uid = UUID(user_id)
    except ValueError as exc:
        raise APIError(ErrorCode.BAD_REQUEST, "invalid user id") from exc
    user = await db.get(User, uid)
    if user is None:
        raise APIError(ErrorCode.NOT_FOUND, "user not found")
    details: dict = {}
    if plan_id is not None:
        if await db.get(Plan, plan_id) is None:
            raise APIError(ErrorCode.BAD_REQUEST, "unknown plan")
        user.plan_id = plan_id
        details["plan_id"] = plan_id
    if banned is not None:
        user.banned = banned
        details["banned"] = banned
    await db.commit()
    await audit(db, admin, "user.update", request, target=str(uid), details=details)
    return s.UserAdminSchema(
        id=user.id, email=user.email, firebase_uid=user.firebase_uid,
        plan_id=user.plan_id, banned=user.banned, created_at=user.created_at,
    )


@router.get("/users/stats")
async def user_stats(
    _admin: AdminUser = Depends(_guard), db: AsyncSession = Depends(get_db)
) -> dict:
    total = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    by_plan = (
        await db.execute(select(User.plan_id, func.count()).group_by(User.plan_id))
    ).all()
    banned_n = (
        await db.execute(select(func.count()).select_from(User).where(User.banned))
    ).scalar() or 0
    return {
        "total": total,
        "banned": banned_n,
        "by_plan": {plan: n for plan, n in by_plan},
    }

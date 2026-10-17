"""Admin: team tab — manage admin users (owner only for writes)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin.auth import ALL_TABS, hash_password
from app.api.deps import audit, get_admin, get_db
from app.core.errors import APIError, ErrorCode
from app.db.models import AdminUser
from app.schemas import v1 as s

router = APIRouter()


async def _owner(admin: AdminUser = Depends(get_admin)) -> AdminUser:
    if admin.role != "owner":
        raise APIError(ErrorCode.FORBIDDEN, "only the owner can manage the team")
    return admin


@router.get("/team", response_model=list[s.AdminUserSchema])
async def list_team(
    _admin: AdminUser = Depends(get_admin), db: AsyncSession = Depends(get_db)
) -> list[s.AdminUserSchema]:
    rows = (await db.execute(select(AdminUser).order_by(AdminUser.created_at))).scalars().all()
    return [_schema(a) for a in rows]


def _schema(a: AdminUser) -> s.AdminUserSchema:
    return s.AdminUserSchema(
        id=a.id, email=a.email, role=a.role,
        allowed_tabs=list(a.allowed_tabs or []), disabled=a.disabled,
    )


@router.post("/team", response_model=s.AdminUserSchema, status_code=201)
async def create_member(
    body: s.TeamCreate,
    request: Request,
    admin: AdminUser = Depends(_owner),
    db: AsyncSession = Depends(get_db),
) -> s.AdminUserSchema:
    if body.role not in ("owner", "admin", "viewer"):
        raise APIError(ErrorCode.BAD_REQUEST, "role must be owner, admin or viewer")
    email = body.email.lower().strip()
    exists = (
        await db.execute(select(AdminUser).where(AdminUser.email == email))
    ).scalar_one_or_none()
    if exists:
        raise APIError(ErrorCode.BAD_REQUEST, "email already on the team")
    tabs = [t for t in body.allowed_tabs if t in ALL_TABS] if body.role != "owner" else ALL_TABS
    member = AdminUser(
        email=email, password_hash=hash_password(body.password), role=body.role, allowed_tabs=tabs
    )
    db.add(member)
    await db.commit()
    await audit(db, admin, "team.create", request, target=email, details={"role": body.role})
    return _schema(member)


@router.patch("/team/{member_id}", response_model=s.AdminUserSchema)
async def update_member(
    member_id: UUID,
    body: s.TeamUpdate,
    request: Request,
    admin: AdminUser = Depends(_owner),
    db: AsyncSession = Depends(get_db),
) -> s.AdminUserSchema:
    member = await db.get(AdminUser, member_id)
    if member is None:
        raise APIError(ErrorCode.NOT_FOUND, "team member not found")
    if member.id == admin.id and body.disabled:
        raise APIError(ErrorCode.BAD_REQUEST, "you cannot disable yourself")
    if body.role is not None:
        if body.role not in ("owner", "admin", "viewer"):
            raise APIError(ErrorCode.BAD_REQUEST, "invalid role")
        member.role = body.role
    if body.allowed_tabs is not None:
        member.allowed_tabs = [t for t in body.allowed_tabs if t in ALL_TABS]
    if body.disabled is not None:
        member.disabled = body.disabled
    await db.commit()
    await audit(db, admin, "team.update", request, target=member.email,
                details=body.model_dump(exclude_none=True))
    return _schema(member)


@router.delete("/team/{member_id}")
async def delete_member(
    member_id: UUID,
    request: Request,
    admin: AdminUser = Depends(_owner),
    db: AsyncSession = Depends(get_db),
) -> dict:
    member = await db.get(AdminUser, member_id)
    if member is None:
        raise APIError(ErrorCode.NOT_FOUND, "team member not found")
    if member.id == admin.id:
        raise APIError(ErrorCode.BAD_REQUEST, "you cannot delete yourself")
    await audit(db, admin, "team.delete", request, target=member.email)
    await db.delete(member)
    await db.commit()
    return {"ok": True}

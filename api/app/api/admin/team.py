from __future__ import annotations

import uuid

from argon2 import PasswordHasher
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ApiError
from ...db.models import AdminUser
from ...db.session import get_db
from .deps import TABS, audit, super_only

router = APIRouter(prefix="/team", dependencies=[Depends(super_only())])
_ph = PasswordHasher()


def row(a: AdminUser) -> dict:
    return {"id": str(a.id), "email": a.email, "role": a.role, "tabs": a.tabs or [], "active": a.active,
            "must_change_password": a.must_change_password, "last_login_at": a.last_login_at.isoformat() if a.last_login_at else None}


@router.get("")
async def list_team(db: AsyncSession = Depends(get_db)):
    return {"members": [row(a) for a in (await db.execute(select(AdminUser).order_by(AdminUser.created_at))).scalars()], "tabs": TABS}


class NewMember(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=320)
    password: str = Field(min_length=10, max_length=200)
    role: str = "staff"
    tabs: list[str] = []


@router.post("")
async def add_member(body: NewMember, admin: AdminUser = Depends(super_only()), db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    if (await db.execute(select(AdminUser).where(AdminUser.email == email))).scalar_one_or_none():
        raise ApiError("exists", "This email is already on the team.", 409)
    if body.role not in ("super_admin", "staff") or set(body.tabs) - set(TABS):
        raise ApiError("invalid_request", "Bad role or section.", 422)
    m = AdminUser(email=email, password_hash=_ph.hash(body.password), role=body.role, tabs=body.tabs, must_change_password=True)
    db.add(m)
    await audit(db, admin, "team.add", email, None, {"role": body.role, "tabs": body.tabs})
    await db.commit()
    return row(m)


class MemberPatch(BaseModel):
    role: str | None = None
    tabs: list[str] | None = None
    active: bool | None = None
    new_password: str | None = Field(default=None, min_length=10, max_length=200)


async def _super_count(db: AsyncSession) -> int:
    return (await db.execute(select(func.count()).select_from(AdminUser).where(AdminUser.role == "super_admin", AdminUser.active))).scalar_one()


@router.patch("/{member_id}")
async def patch_member(member_id: uuid.UUID, body: MemberPatch, admin: AdminUser = Depends(super_only()), db: AsyncSession = Depends(get_db)):
    m = await db.get(AdminUser, member_id)
    if m is None:
        raise ApiError("not_found", "Member not found.", 404)
    losing_super = m.role == "super_admin" and ((body.role and body.role != "super_admin") or body.active is False)
    if losing_super and await _super_count(db) <= 1:
        raise ApiError("last_super_admin", "There must be at least one active super admin.", 409)
    if body.tabs is not None and set(body.tabs) - set(TABS):
        raise ApiError("invalid_request", "Unknown section.", 422)
    before = row(m)
    if body.role in ("super_admin", "staff"):
        m.role = body.role
    if body.tabs is not None:
        m.tabs = body.tabs
    if body.active is not None:
        m.active = body.active
    if body.new_password:
        m.password_hash, m.must_change_password = _ph.hash(body.new_password), True
    await audit(db, admin, "team.update", m.email, before, row(m))
    await db.commit()
    return row(m)


@router.delete("/{member_id}")
async def remove_member(member_id: uuid.UUID, admin: AdminUser = Depends(super_only()), db: AsyncSession = Depends(get_db)):
    m = await db.get(AdminUser, member_id)
    if m is None:
        raise ApiError("not_found", "Member not found.", 404)
    if m.id == admin.id:
        raise ApiError("invalid_request", "You cannot remove yourself.", 409)
    if m.role == "super_admin" and await _super_count(db) <= 1:
        raise ApiError("last_super_admin", "There must be at least one active super admin.", 409)
    await audit(db, admin, "team.remove", m.email)
    await db.delete(m)
    await db.commit()
    return {"ok": True}

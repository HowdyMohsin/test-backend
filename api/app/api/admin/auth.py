from __future__ import annotations

from datetime import datetime, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.auth import validate_password
from ...core.errors import ApiError
from ...core.security import client_ip, rate_limited
from ...db.models import AdminUser
from ...db.session import get_db
from ...settings import get_settings
from .deps import COOKIE, SESSION_SECONDS, TABS, audit, get_admin, make_session

router = APIRouter(prefix="/auth")
_ph = PasswordHasher()


class LoginIn(BaseModel):
    email: str = Field(max_length=320)
    password: str = Field(max_length=200)


class PasswordIn(BaseModel):
    current: str = Field(max_length=200)
    new: str = Field(min_length=12, max_length=200)


def profile(a: AdminUser) -> dict:
    return {"email": a.email, "role": a.role, "tabs": TABS if a.role == "super_admin" else list(a.tabs or []),
            "must_change_password": a.must_change_password}


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    if rate_limited("login:" + client_ip(request), 8, 300):
        raise ApiError("rate_limited", "Too many attempts. Wait a few minutes.", 429)
    admin = (await db.execute(select(AdminUser).where(AdminUser.email == body.email.strip().lower()))).scalar_one_or_none()
    try:
        if admin is None or not admin.active:
            raise VerifyMismatchError
        _ph.verify(admin.password_hash, body.password)
    except VerificationError:
        raise ApiError("bad_login", "Wrong email or password.", 401) from None
    admin.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    response.set_cookie(COOKIE, make_session(admin), max_age=SESSION_SECONDS, httponly=True, samesite="lax",
                        secure=get_settings().env != "dev")
    return profile(admin)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(COOKIE)
    return {"ok": True}


@router.get("/me")
async def me(admin: AdminUser = Depends(get_admin)):
    return profile(admin)


@router.post("/change-password")
async def change_password(body: PasswordIn, admin: AdminUser = Depends(get_admin), db: AsyncSession = Depends(get_db)):
    try:
        _ph.verify(admin.password_hash, body.current)
    except VerificationError:
        raise ApiError("bad_login", "The current password is wrong.", 401) from None
    validate_password(body.new)
    admin.password_hash = _ph.hash(body.new)
    admin.must_change_password = False
    await audit(db, admin, "password.change", admin.email)
    await db.commit()
    return {"ok": True}

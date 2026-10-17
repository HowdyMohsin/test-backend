"""Admin auth: email + password (argon2), httpOnly cookie session, roles."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import audit, get_admin, get_db
from app.core.errors import APIError, ErrorCode
from app.db.models import AdminSession, AdminUser
from app.schemas import v1 as s
from app.settings import settings

router = APIRouter()
_ph = PasswordHasher()

ALL_TABS = ["dashboard", "formats", "plans", "users", "team", "jobs", "ads", "reports", "settings"]


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


@router.post("/auth/login", response_model=s.AdminMeResponse)
async def login(
    body: s.AdminLoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> s.AdminMeResponse:
    admin = (
        await db.execute(select(AdminUser).where(AdminUser.email == body.email.lower().strip()))
    ).scalar_one_or_none()
    if admin is None or admin.disabled or not verify_password(admin.password_hash, body.password):
        raise APIError(ErrorCode.UNAUTHORIZED, "wrong email or password")
    raw_token = secrets.token_urlsafe(48)
    db.add(
        AdminSession(
            token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
            admin_id=admin.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.admin_session_ttl_hours),
            ip=request.client.host if request.client else None,
        )
    )
    await db.commit()
    response.set_cookie(
        settings.admin_cookie_name,
        raw_token,
        httponly=True,
        samesite="lax",
        max_age=settings.admin_session_ttl_hours * 3600,
        path="/",
    )
    await audit(db, admin, "login", request)
    return _me_response(admin)


@router.post("/auth/logout")
async def logout(
    request: Request, response: Response, admin: AdminUser = Depends(get_admin), db: AsyncSession = Depends(get_db)
) -> dict:
    token = request.cookies.get(settings.admin_cookie_name)
    if token:
        th = hashlib.sha256(token.encode()).hexdigest()
        sess = (await db.execute(select(AdminSession).where(AdminSession.token_hash == th))).scalar_one_or_none()
        if sess:
            await db.delete(sess)
            await db.commit()
    response.delete_cookie(settings.admin_cookie_name, path="/")
    await audit(db, admin, "logout", request)
    return {"ok": True}


@router.get("/auth/me", response_model=s.AdminMeResponse)
async def me(admin: AdminUser = Depends(get_admin)) -> s.AdminMeResponse:
    return _me_response(admin)


def _me_response(admin: AdminUser) -> s.AdminMeResponse:
    tabs = ALL_TABS if admin.role == "owner" else list(admin.allowed_tabs or [])
    return s.AdminMeResponse(
        user=s.AdminUserSchema(
            id=admin.id, email=admin.email, role=admin.role,
            allowed_tabs=list(admin.allowed_tabs or []), disabled=admin.disabled,
        ),
        tabs=tabs,
    )

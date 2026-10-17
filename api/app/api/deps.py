"""FastAPI dependencies: DB session, identity (Firebase/anonymous), admin guard."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from fastapi import Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import APIError, ErrorCode
from app.core.firebase import try_verify_id_token
from app.core.plan_guard import Identity
from app.core.security import new_anon_id, sign_anon_cookie, verify_anon_cookie
from app.db.models import AdminSession, AdminUser, User
from app.db.session import SessionFactory
from app.settings import settings


async def get_db():
    async with SessionFactory() as session:
        yield session


async def _get_or_create_user(session: AsyncSession, firebase_uid: str, email: str | None) -> User:
    user = (
        await session.execute(select(User).where(User.firebase_uid == firebase_uid))
    ).scalar_one_or_none()
    if user is None:
        user = User(firebase_uid=firebase_uid, email=email, plan_id="free")
        session.add(user)
        await session.commit()
        await session.refresh(user)
    else:
        user.last_seen_at = datetime.now(timezone.utc)
        if email and user.email != email:
            user.email = email
        await session.commit()
    return user


async def get_identity(
    request: Request,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> tuple[Identity, str | None]:
    """Return (identity, new_anon_cookie_value). Routers set the cookie when not None."""
    if authorization and authorization.lower().startswith("bearer "):
        claims = try_verify_id_token(authorization[7:].strip())
        if claims and claims.get("uid"):
            user = await _get_or_create_user(db, claims["uid"], claims.get("email"))
            tier = user.plan_id if user.plan_id in ("free", "pro") else "free"
            return Identity(owner_key=f"user:{claims['uid']}", tier=tier, user=user), None

    raw_cookie = request.cookies.get(settings.anon_cookie_name)
    anon_id = verify_anon_cookie(raw_cookie) if raw_cookie else None
    new_cookie = None
    if anon_id is None:
        anon_id = new_anon_id()
        new_cookie = sign_anon_cookie(anon_id)
    return Identity(owner_key=f"anon:{anon_id}", tier="anonymous"), new_cookie


async def get_admin(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    token = request.cookies.get(settings.admin_cookie_name)
    if not token:
        raise APIError(ErrorCode.UNAUTHORIZED, "admin login required")
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    sess = (
        await db.execute(select(AdminSession).where(AdminSession.token_hash == token_hash))
    ).scalar_one_or_none()
    if sess is None or sess.expires_at < datetime.now(timezone.utc):
        raise APIError(ErrorCode.UNAUTHORIZED, "admin session expired")
    admin = await db.get(AdminUser, sess.admin_id)
    if admin is None or admin.disabled:
        raise APIError(ErrorCode.UNAUTHORIZED, "admin account disabled")
    return admin


def require_tab(tab: str):
    """Dependency factory: admin must have access to `tab` (or be owner)."""

    async def _check(admin: AdminUser = Depends(get_admin)) -> AdminUser:
        if admin.role == "owner":
            return admin
        if tab not in (admin.allowed_tabs or []):
            raise APIError(ErrorCode.FORBIDDEN, f"no access to the {tab} section")
        return admin

    return _check


async def audit(
    db: AsyncSession, admin: AdminUser, action: str, request: Request,
    target: str | None = None, details: dict | None = None,
) -> None:
    from app.db.models import AuditLog

    db.add(
        AuditLog(
            admin_id=admin.id,
            action=action,
            target=target,
            details=details or {},
            ip=request.client.host if request.client else None,
        )
    )
    await db.commit()

"""Customer accounts and identities owned entirely by this application."""
from __future__ import annotations

import hashlib
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import Plan, User, UserSession
from ..db.session import get_db
from ..settings import get_settings
from . import site
from .errors import ApiError
from .security import anon_key, client_ip

COOKIE = "qic_session"
_ph = PasswordHasher()
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass
class Identity:
    owner_key: str
    plan: Plan
    user: User | None
    anonymous: bool


def normalize_email(value: str) -> str:
    email = value.strip().lower()
    if len(email) > 320 or not _EMAIL.fullmatch(email):
        raise ApiError("invalid_email", "Enter a valid email address.", 422)
    return email


def validate_password(value: str) -> None:
    if len(value) < 12 or len(value) > 200:
        raise ApiError("weak_password", "Use a password between 12 and 200 characters.", 422)
    kinds = sum((any(c.islower() for c in value), any(c.isupper() for c in value), any(c.isdigit() for c in value), any(not c.isalnum() for c in value)))
    if kinds < 3:
        raise ApiError("weak_password", "Use at least three of: lowercase letters, uppercase letters, numbers and symbols.", 422)


def validate_customer_password(value: str) -> None:
    """Keep customer sign-up simple; administrator credentials use the stronger policy above."""
    if len(value) < 6 or len(value) > 200:
        raise ApiError("weak_password", "Use a password between 6 and 200 characters.", 422)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=get_settings().user_session_days)


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(COOKIE, token, max_age=get_settings().user_session_days * 86400, httponly=True, samesite="lax", secure=get_settings().env != "dev")


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE)


async def create_session(db: AsyncSession, user: User) -> str:
    token = secrets.token_urlsafe(48)
    db.add(UserSession(user_id=user.id, token_hash=_hash_token(token), expires_at=_expiry()))
    return token


async def revoke_session(db: AsyncSession, request: Request) -> None:
    token = request.cookies.get(COOKIE)
    if token:
        row = (await db.execute(select(UserSession).where(UserSession.token_hash == _hash_token(token)))).scalar_one_or_none()
        if row:
            await db.delete(row)


async def revoke_user_sessions(db: AsyncSession, user_id) -> None:
    rows = (await db.execute(select(UserSession).where(UserSession.user_id == user_id))).scalars().all()
    for row in rows:
        await db.delete(row)


async def session_user(request: Request, db: AsyncSession) -> User | None:
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    row = (await db.execute(select(UserSession).where(UserSession.token_hash == _hash_token(token)))).scalar_one_or_none()
    if row is None:
        return None
    now = datetime.now(timezone.utc)
    if row.expires_at <= now:
        await db.delete(row)
        await db.commit()
        return None
    user = await db.get(User, row.user_id)
    if user is None:
        await db.delete(row)
        await db.commit()
        return None
    if user.banned:
        raise ApiError("banned", await site.msg(db, "banned", "free"), 403)
    row.last_seen_at = now
    user.last_seen_at = now
    await db.commit()
    return user


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    user = await session_user(request, db)
    if user is None:
        raise ApiError("not_signed_in", "Please sign in to continue.", 401)
    return user


async def get_identity(request: Request, db: AsyncSession = Depends(get_db)) -> Identity:
    plans = await site.plans(db)
    user = await session_user(request, db)
    if user:
        return Identity(f"u:{user.id}", plans.get(user.plan) or plans["free"], user, False)
    return Identity(anon_key(client_ip(request)), plans["anonymous"], None, True)


def require_web_request(request: Request) -> None:
    """Cookie-authenticated mutations must originate from the first-party web app."""
    if request.headers.get("x-requested-with") != "qic-web":
        raise ApiError("csrf", "Missing security header.", 403)


def require_password_current(ident: Identity) -> None:
    if ident.user and ident.user.must_change_password:
        raise ApiError("password_change_required", "Please change the temporary password in your account before converting files.", 403)


async def verify_password(user: User, password: str) -> bool:
    if not user.password_hash:
        return False
    try:
        valid = _ph.verify(user.password_hash, password)
        if valid and _ph.check_needs_rehash(user.password_hash):
            user.password_hash = _ph.hash(password)
        return valid
    except VerificationError:
        return False


def password_hash(password: str) -> str:
    return _ph.hash(password)

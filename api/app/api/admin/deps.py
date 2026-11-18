"""Admin login (separate from customer login), roles, per-tab permissions, CSRF guard and audit log."""
from __future__ import annotations

import hashlib
import uuid
from typing import Any

from fastapi import Depends, Request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ApiError
from ...db.models import AdminApiKey, AdminUser, AuditLog
from ...db.session import get_db
from ...settings import get_settings

COOKIE = "qic_admin"
SESSION_SECONDS = 12 * 3600
TABS = ["dashboard", "formats", "plans", "users", "team", "jobs", "ads", "reports", "settings"]
_ser = URLSafeTimedSerializer(get_settings().secret_key, salt="admin-session")


def make_session(admin: AdminUser) -> str:
    return _ser.dumps({"a": str(admin.id)})


async def get_admin(request: Request, db: AsyncSession = Depends(get_db)) -> AdminUser:
    safe = request.method in ("GET", "HEAD", "OPTIONS")
    if not safe and request.headers.get("x-requested-with") != "qic-admin":
        raise ApiError("csrf", "Missing security header.", 403)
    bearer = request.headers.get("authorization", "")
    if bearer.lower().startswith("bearer qic_"):  # admin API keys: read-only
        if not safe:
            raise ApiError("forbidden", "API keys are read-only.", 403)
        h = hashlib.sha256(bearer[7:].encode()).hexdigest()
        key = (await db.execute(select(AdminApiKey).where(AdminApiKey.key_hash == h, AdminApiKey.revoked_at.is_(None)))).scalar_one_or_none()
        if key:
            return AdminUser(id=uuid.uuid4(), email=f"api-key:{key.name}", password_hash="", role="staff", tabs=list(TABS), active=True)
    token = request.cookies.get(COOKIE)
    if not token:
        raise ApiError("not_signed_in", "Please sign in.", 401)
    try:
        data = _ser.loads(token, max_age=SESSION_SECONDS)
    except (BadSignature, SignatureExpired):
        raise ApiError("not_signed_in", "Your session expired. Please sign in again.", 401) from None
    admin = await db.get(AdminUser, uuid.UUID(data["a"]))
    if admin is None or not admin.active:
        raise ApiError("not_signed_in", "This account is disabled.", 401)
    return admin


def tab(name: str):
    async def check(admin: AdminUser = Depends(get_admin)) -> AdminUser:
        if admin.role != "super_admin" and name not in (admin.tabs or []):
            raise ApiError("forbidden", "You do not have access to this section.", 403)
        return admin
    return check


def super_only():
    async def check(admin: AdminUser = Depends(get_admin)) -> AdminUser:
        if admin.role != "super_admin":
            raise ApiError("forbidden", "Only a super admin can do this.", 403)
        return admin
    return check


async def audit(db: AsyncSession, admin: AdminUser, action: str, target: str, before: Any = None, after: Any = None) -> None:
    db.add(AuditLog(admin_email=admin.email, action=action, target=target, before=before, after=after))

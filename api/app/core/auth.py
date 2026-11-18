"""Who is calling: a Firebase user, or an anonymous visitor identified by hashed IP."""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Request
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import Plan, User
from ..db.session import get_db
from ..settings import get_settings
from . import firebase, site
from .errors import ApiError
from .security import anon_key, client_ip


@dataclass
class Identity:
    owner_key: str
    plan: Plan
    user: User | None
    anonymous: bool


async def get_identity(request: Request, db: AsyncSession = Depends(get_db)) -> Identity:
    plans = await site.plans(db)
    uid = email = None
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        info = firebase.verify(header[7:].strip())
        if info is None and firebase.configured():
            raise ApiError("invalid_token", "Your login has expired. Please sign in again.", 401)
        if info:
            uid, email = info["uid"], info["email"]
    elif get_settings().env == "dev" and request.headers.get("x-dev-user"):
        email = request.headers["x-dev-user"][:200]  # local testing without Firebase
        uid = "dev:" + email
    if uid:
        user = (await db.execute(select(User).where(User.firebase_uid == uid))).scalar_one_or_none()
        if user is None:
            user = User(firebase_uid=uid, email=email, plan="free")
            db.add(user)
            await db.flush()
        else:
            await db.execute(text("update users set last_seen_at = now() where id = :i"), {"i": user.id})
        if user.banned:
            raise ApiError("banned", await site.msg(db, "banned", "free"), 403)
        await db.commit()
        return Identity(f"u:{user.id}", plans.get(user.plan) or plans["free"], user, False)
    return Identity(anon_key(client_ip(request)), plans["anonymous"], None, True)

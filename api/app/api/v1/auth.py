"""First-party customer authentication: database accounts plus opaque browser sessions."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.auth import (clear_session_cookie, create_session, get_current_user, normalize_email, password_hash,
                          require_web_request, revoke_session, revoke_user_sessions, set_session_cookie, validate_customer_password,
                          verify_password)
from ...core.errors import ApiError
from ...core.security import client_ip, rate_limited
from ...db.models import User
from ...db.session import get_db

router = APIRouter(prefix="/auth")


class Credentials(BaseModel):
    email: str = Field(max_length=320)
    password: str = Field(max_length=200)


class PasswordChange(BaseModel):
    current_password: str = Field(max_length=200)
    new_password: str = Field(max_length=200)


def profile(user: User) -> dict:
    return {"email": user.email, "plan": user.plan, "must_change_password": user.must_change_password}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return profile(user)


@router.post("/register", status_code=201)
async def register(body: Credentials, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    require_web_request(request)
    if rate_limited("register:" + client_ip(request), 5, 900):
        raise ApiError("rate_limited", "Too many attempts. Please wait a few minutes.", 429)
    email = normalize_email(body.email)
    validate_customer_password(body.password)
    if (await db.execute(select(User.id).where(User.email_normalized == email))).scalar_one_or_none():
        raise ApiError("account_exists", "An account with this email already exists. Please sign in instead.", 409)
    user = User(auth_subject=f"local:{uuid.uuid4()}", email=email, email_normalized=email, password_hash=password_hash(body.password), plan="free", must_change_password=False)
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise ApiError("account_exists", "An account with this email already exists. Please sign in instead.", 409) from None
    token = await create_session(db, user)
    await db.commit()
    set_session_cookie(response, token)
    return profile(user)


@router.post("/login")
async def login(body: Credentials, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    require_web_request(request)
    if rate_limited("login:" + client_ip(request), 10, 900):
        raise ApiError("rate_limited", "Too many attempts. Please wait a few minutes.", 429)
    email = normalize_email(body.email)
    user = (await db.execute(select(User).where(User.email_normalized == email))).scalar_one_or_none()
    if user is None or not await verify_password(user, body.password):
        raise ApiError("bad_login", "Wrong email or password.", 401)
    if user.banned:
        raise ApiError("banned", "This account has been blocked.", 403)
    token = await create_session(db, user)
    await db.commit()
    set_session_cookie(response, token)
    return profile(user)


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    require_web_request(request)
    await revoke_session(db, request)
    await db.commit()
    clear_session_cookie(response)
    return {"ok": True}


@router.post("/change-password")
async def change_password(body: PasswordChange, request: Request, response: Response, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    require_web_request(request)
    if not await verify_password(user, body.current_password):
        raise ApiError("bad_login", "The current password is wrong.", 401)
    validate_customer_password(body.new_password)
    user.password_hash = password_hash(body.new_password)
    user.must_change_password = False
    await revoke_user_sessions(db, user.id)
    token = await create_session(db, user)
    await db.commit()
    set_session_cookie(response, token)
    return {"ok": True}

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ...core import billing
from ...core.auth import Identity, get_identity, require_password_current, require_web_request
from ...core.errors import ApiError
from ...core.security import rate_limited
from ...db.models import Waitlist
from ...db.session import get_db

router = APIRouter(prefix="/billing")


class WaitIn(BaseModel):
    email: str = Field(min_length=5, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    plan: str = "pro"
    source: str | None = Field(default=None, max_length=32)


@router.get("/config")
async def config():
    return {"checkout_enabled": billing.enabled()}


@router.post("/checkout")
async def checkout(request: Request, ident: Identity = Depends(get_identity)):
    require_web_request(request)
    require_password_current(ident)
    if ident.anonymous:
        raise ApiError("login_required", "Please sign in before upgrading.", 401)
    url = await billing.create_checkout(ident.user.email if ident.user else None, "pro", "")
    if not url:
        raise ApiError("billing_not_configured", "Payments are not open yet. Join the waiting list and we will email you.", 501)
    return {"url": url}


@router.post("/waitlist")
async def waitlist(body: WaitIn, request: Request, ident: Identity = Depends(get_identity), db: AsyncSession = Depends(get_db)):
    require_web_request(request)
    if rate_limited("wait:" + ident.owner_key, 5):
        raise ApiError("rate_limited", "Please try again in a minute.", 429)
    db.add(Waitlist(email=body.email.lower(), plan=body.plan[:32], source=body.source))
    await db.commit()
    return {"ok": True}

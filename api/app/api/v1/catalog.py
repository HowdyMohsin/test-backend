"""Catalog endpoints: formats, plans, me, ads."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_identity
from app.core.plan_guard import Identity
from app.schemas import v1 as api_schemas
from app.services import catalog as catalog_service
from app.services import site as site_service
from app.settings import settings

router = APIRouter()


def _maybe_set_cookie(response: Response, new_cookie: str | None) -> None:
    if new_cookie:
        response.set_cookie(
            settings.anon_cookie_name, new_cookie, httponly=True, samesite="lax", max_age=31536000
        )


@router.get("/formats", response_model=api_schemas.FormatsResponse)
async def formats(
    response: Response,
    db: AsyncSession = Depends(get_db),
    ident: tuple[Identity, str | None] = Depends(get_identity),
) -> api_schemas.FormatsResponse:
    identity, new_cookie = ident
    _maybe_set_cookie(response, new_cookie)
    return await catalog_service.get_formats(db, identity.tier)


@router.get("/plans", response_model=api_schemas.PlansResponse)
async def plans(db: AsyncSession = Depends(get_db)) -> api_schemas.PlansResponse:
    return await catalog_service.get_plans(db)


@router.get("/me", response_model=api_schemas.MeResponse)
async def me(
    response: Response,
    db: AsyncSession = Depends(get_db),
    ident: tuple[Identity, str | None] = Depends(get_identity),
) -> api_schemas.MeResponse:
    identity, new_cookie = ident
    _maybe_set_cookie(response, new_cookie)
    return await catalog_service.get_me(db, identity)


@router.get("/ads", response_model=api_schemas.AdsResponse)
async def ads(
    response: Response,
    slot: str = Query(default="homepage_top", max_length=64),
    db: AsyncSession = Depends(get_db),
    ident: tuple[Identity, str | None] = Depends(get_identity),
) -> api_schemas.AdsResponse:
    identity, new_cookie = ident
    _maybe_set_cookie(response, new_cookie)
    return await catalog_service.get_ad(db, slot, identity.tier)


@router.get("/site", response_model=api_schemas.SiteResponse)
async def site_status(db: AsyncSession = Depends(get_db)) -> api_schemas.SiteResponse:
    """Public site settings: maintenance mode, announcement bar, honest counter."""
    return await site_service.get_site_status(db)

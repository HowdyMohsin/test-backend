"""Public v1 router."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import catalog, convert, health, jobs, uploads

router = APIRouter(prefix="/v1")
router.include_router(health.router, tags=["health"])
router.include_router(catalog.router, tags=["catalog"])
router.include_router(uploads.router, tags=["uploads"])
router.include_router(convert.router, tags=["convert"])
router.include_router(jobs.router, tags=["jobs"])

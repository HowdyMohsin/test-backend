"""Admin router: /v1/admin/* (separate cookie auth)."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.admin import ads, auth, formats, jobs, plans, reports, settings, team, users

router = APIRouter(prefix="/v1/admin")
router.include_router(auth.router, tags=["admin-auth"])
router.include_router(formats.router, tags=["admin-formats"])
router.include_router(plans.router, tags=["admin-plans"])
router.include_router(users.router, tags=["admin-users"])
router.include_router(team.router, tags=["admin-team"])
router.include_router(jobs.router, tags=["admin-jobs"])
router.include_router(ads.router, tags=["admin-ads"])
router.include_router(reports.router, tags=["admin-reports"])
router.include_router(settings.router, tags=["admin-settings"])

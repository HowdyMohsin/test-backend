from fastapi import APIRouter

from . import ads, auth, dashboard, formats, jobs, plans, reports, settings, team, users

router = APIRouter(prefix="/v1/admin")
for module in (auth, dashboard, formats, plans, users, team, jobs, ads, reports, settings):
    router.include_router(module.router)

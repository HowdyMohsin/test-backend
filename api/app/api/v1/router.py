from fastapi import APIRouter

from . import billing, catalog, convert, history, jobs, uploads

router = APIRouter(prefix="/v1")
for module in (catalog, uploads, convert, jobs, history, billing):
    router.include_router(module.router)

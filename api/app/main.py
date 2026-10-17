"""FastAPI application factory."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.admin.router import router as admin_router
from app.api.v1.router import router as v1_router
from app.core.errors import APIError
from app.core.worker import cleanup_loop, startup_recovery, worker_loop
from app.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    stop = asyncio.Event()
    tasks: list[asyncio.Task] = []
    if settings.role in ("worker", "both"):
        recovered = await startup_recovery()
        print(f"[worker] recovered {recovered} stuck jobs")
        for i in range(settings.worker_count):
            tasks.append(asyncio.create_task(worker_loop(i, stop), name=f"worker-{i}"))
        tasks.append(asyncio.create_task(cleanup_loop(stop), name="cleanup"))
        print(f"[worker] started {settings.worker_count} workers (role={settings.role})")
    yield
    stop.set()
    for t in tasks:
        t.cancel()


def create_app() -> FastAPI:
    app = FastAPI(title="QuickImgConvert v2 API", version=settings.app_version, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(APIError)
    async def api_error_handler(_request: Request, exc: APIError) -> JSONResponse:
        return JSONResponse(status_code=exc.http_status, content=exc.to_dict())

    @app.exception_handler(Exception)
    async def unhandled_handler(_request: Request, exc: Exception) -> JSONResponse:  # noqa: BLE001
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "internal", "message": "unexpected server error", "details": {}}},
        )

    app.include_router(v1_router)
    app.include_router(admin_router)

    @app.get("/")
    async def root() -> dict:
        return {"service": "quickimgconvert-v2", "version": settings.app_version}

    return app


app = create_app()

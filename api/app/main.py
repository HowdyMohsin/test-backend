from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.admin.router import router as admin_router
from .api.v1.router import router as v1
from .core import worker
from .core.errors import ApiError
from .settings import get_settings

log = logging.getLogger("qic")


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    tasks: list[asyncio.Task] = []
    if s.role in ("worker", "both"):
        tasks = await worker.start(s.workers)
    yield
    for t in tasks:
        t.cancel()


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title="QuickImgConvert API", version=s.version, lifespan=lifespan, docs_url="/docs" if s.env == "dev" else None)
    app.add_middleware(CORSMiddleware, allow_origins=s.cors_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

    @app.exception_handler(ApiError)
    async def api_error(_: Request, e: ApiError):
        return JSONResponse({"error": {"code": e.code, "message": e.message, "details": e.details}}, status_code=e.status)

    @app.exception_handler(RequestValidationError)
    async def bad_request(_: Request, e: RequestValidationError):
        return JSONResponse({"error": {"code": "invalid_request", "message": "The request was not valid.", "details": e.errors()[:5]}}, status_code=422)

    @app.exception_handler(Exception)
    async def crash(_: Request, e: Exception):
        log.exception("unhandled error")
        res = JSONResponse({"error": {"code": "internal", "message": "Something went wrong. Please try again.", "details": None}}, status_code=500)
        origin = _.headers.get("origin")
        if origin in s.cors_list:  # the CORS middleware does not wrap this handler, so add the headers here
            res.headers.update({"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true", "Vary": "Origin"})
        return res

    if s.role in ("api", "both"):
        app.include_router(v1)
        app.include_router(admin_router)
    return app


app = create_app()

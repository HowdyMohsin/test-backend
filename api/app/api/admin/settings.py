from __future__ import annotations

import hashlib
import secrets
import subprocess
import uuid
from datetime import datetime, timezone

import pyvips
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ...core import site
from ...core.errors import ApiError
from ...core.storage import storage
from ...db.models import AdminApiKey, AdminUser, AuditLog, SiteSetting
from ...db.session import get_db
from ...formats import registry
from ...settings import get_settings
from .deps import audit, super_only, tab

router = APIRouter(prefix="/settings", dependencies=[Depends(tab("settings"))])


@router.get("/site")
async def get_site(db: AsyncSession = Depends(get_db)):
    return await site.site_settings(db)


class SiteIn(BaseModel):
    maintenance_enabled: bool | None = None
    maintenance_message: str | None = None
    announcement_text: str | None = None
    announcement_link: str | None = None
    announcement_expires: str | None = None
    public_stats_enabled: bool | None = None
    retention_minutes: int | None = None


@router.put("/site")
async def put_site(body: SiteIn, admin: AdminUser = Depends(tab("settings")), db: AsyncSession = Depends(get_db)):
    before = await site.site_settings(db)
    changes = body.model_dump(exclude_unset=True)
    if "retention_minutes" in changes and changes["retention_minutes"] is not None and not (5 <= changes["retention_minutes"] <= 1440):
        raise ApiError("invalid_request", "File retention must be between 5 and 1440 minutes.", 422)
    for k, v in changes.items():
        row = await db.get(SiteSetting, k) or SiteSetting(key=k)
        row.value = v
        db.add(row)
    await audit(db, admin, "site.update", "site_settings", {k: before.get(k) for k in changes}, changes)
    await db.commit()
    site.invalidate()
    return {"ok": True}


@router.get("/audit")
async def audit_log(page: int = Query(1, ge=1), action: str = "", who: str = "", db: AsyncSession = Depends(get_db)):
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action}%"))
    if who:
        stmt = stmt.where(AuditLog.admin_email.ilike(f"%{who}%"))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.order_by(AuditLog.id.desc()).limit(30).offset((page - 1) * 30))).scalars()
    return {"total": total, "page": page, "entries": [{"id": r.id, "ts": r.ts.isoformat(), "admin": r.admin_email, "action": r.action,
                                                       "target": r.target, "before": r.before, "after": r.after} for r in rows]}


@router.get("/api-keys")
async def list_keys(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(AdminApiKey).order_by(AdminApiKey.created_at.desc()))).scalars()
    return {"keys": [{"id": str(r.id), "name": r.name, "created_by": r.created_by, "created_at": r.created_at.isoformat(),
                      "revoked": r.revoked_at is not None} for r in rows]}


class KeyIn(BaseModel):
    name: str


@router.post("/api-keys")
async def create_key(body: KeyIn, admin: AdminUser = Depends(super_only()), db: AsyncSession = Depends(get_db)):
    raw = "qic_" + secrets.token_urlsafe(32)
    db.add(AdminApiKey(name=body.name[:64], key_hash=hashlib.sha256(raw.encode()).hexdigest(), created_by=admin.email))
    await audit(db, admin, "apikey.create", body.name)
    await db.commit()
    return {"key": raw, "note": "Copy it now. It is shown only once."}


@router.delete("/api-keys/{key_id}")
async def revoke_key(key_id: uuid.UUID, admin: AdminUser = Depends(super_only()), db: AsyncSession = Depends(get_db)):
    k = await db.get(AdminApiKey, key_id)
    if k is None:
        raise ApiError("not_found", "Key not found.", 404)
    k.revoked_at = datetime.now(timezone.utc)
    await audit(db, admin, "apikey.revoke", k.name)
    await db.commit()
    return {"ok": True}


@router.get("/system")
async def system(db: AsyncSession = Depends(get_db)):
    s = get_settings()
    ff = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True).stdout.splitlines()[0]
    return {"version": s.version, "env": s.env, "role": s.role, "workers": s.workers, "retention_minutes": s.retention_minutes,
            "libvips": f"{pyvips.version(0)}.{pyvips.version(1)}.{pyvips.version(2)}", "ffmpeg": ff,
            "formats": len(registry.formats()), "pairs": len(registry.pairs()),
            "disk_free_gb": round(storage.free_bytes() / 1024 ** 3, 1),
            "database_size_mb": round((await db.execute(text("select pg_database_size(current_database())"))).scalar_one() / 1024 ** 2, 1)}

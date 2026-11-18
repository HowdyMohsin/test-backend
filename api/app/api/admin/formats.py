from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core import selfcheck, site
from ...core.errors import ApiError
from ...core.samples import GEN, ROOT
from ...db.models import AdminUser, FormatState, Preset, SelfcheckRun
from ...db.session import SessionLocal, get_db
from ...formats import registry
from .deps import audit, tab

router = APIRouter(prefix="/formats", dependencies=[Depends(tab("formats"))])
_RAW_NEEDS_FILE = {"cr2", "nef", "arw", "rw2", "orf", "pef", "raf"}
_run: dict[str, Any] = {"running": False, "done": 0, "total": 0}


def _has_sample(slug: str) -> bool:
    exts = set(registry.formats()[slug].extensions)
    d = ROOT / slug
    if d.is_dir() and any(p.suffix.lstrip(".").lower() in exts for p in d.iterdir() if p.is_file()):
        return True
    return slug not in _RAW_NEEDS_FILE


@router.get("")
async def list_formats(db: AsyncSession = Depends(get_db)):
    st = {s.key: s for s in (await db.execute(select(FormatState))).scalars()}
    pairs = []
    for p in registry.pairs().values():
        s = st.get(p.slug)
        pairs.append({"slug": p.slug, "from": p.src.slug, "to": p.dst.slug, "route": p.route, "label": p.label,
                      "status": s.status if s else "testing", "visible": s.visible if s else True,
                      "plans": s.plans if s else ["free", "pro"], "pinned": bool(s and s.pinned), "note": s.note if s else None,
                      "last_check_at": s.last_check_at.isoformat() if s and s.last_check_at else None, "has_sample": _has_sample(p.src.slug)})
    fm = [{"slug": f.slug, "name": f.name, "category": f.category, "subgroup": f.subgroup,
           "visible": st[f.slug].visible if f.slug in st else True, "has_sample": _has_sample(f.slug)} for f in registry.formats().values()]
    return {"formats": fm, "pairs": pairs}


class StateIn(BaseModel):
    key: str
    visible: bool | None = None
    status: str | None = None
    plans: list[str] | None = None
    pinned: bool | None = None
    note: str | None = None


@router.patch("/state")
async def set_state(body: StateIn, admin: AdminUser = Depends(tab("formats")), db: AsyncSession = Depends(get_db)):
    if body.key not in registry.pairs() and body.key not in registry.formats():
        raise ApiError("not_found", "Unknown format or pair.", 404)
    if body.status is not None and body.status not in ("live", "testing", "broken"):
        raise ApiError("invalid_request", "Status must be live, testing or broken.", 422)
    row = await db.get(FormatState, body.key) or FormatState(key=body.key, kind="pair" if "-to-" in body.key else "format")
    before = {"visible": row.visible, "status": row.status, "plans": row.plans, "pinned": row.pinned}
    for f in ("visible", "status", "plans", "pinned", "note"):
        v = getattr(body, f)
        if v is not None:
            setattr(row, f, v)
    db.add(row)
    await audit(db, admin, "format.update", body.key, before, body.model_dump(exclude_none=True))
    await db.commit()
    site.invalidate()
    return {"ok": True}


class CheckIn(BaseModel):
    pairs: list[str] | None = None


@router.post("/selfcheck")
async def start_selfcheck(body: CheckIn, admin: AdminUser = Depends(tab("formats"))):
    if _run["running"]:
        raise ApiError("busy", "A check is already running.", 409)
    chosen = body.pairs or list(registry.pairs())
    _run.update(running=True, done=0, total=len(chosen))

    async def job() -> None:
        try:
            async with SessionLocal() as db:
                await selfcheck.run(db, chosen, 2, log=lambda _m: _run.update(done=_run["done"] + 1))
        finally:
            _run["running"] = False

    asyncio.create_task(job())
    return {"started": True, "total": len(chosen)}


@router.get("/selfcheck")
async def selfcheck_status(db: AsyncSession = Depends(get_db)):
    last = (await db.execute(select(SelfcheckRun).where(SelfcheckRun.finished_at.is_not(None)).order_by(SelfcheckRun.id.desc()).limit(1))).scalar_one_or_none()
    return {"running": _run["running"], "done": _run["done"], "total": _run["total"],
            "last": {"finished_at": last.finished_at.isoformat(), "total": last.total, "passed": last.passed, "failed": last.failed,
                     "skipped": last.skipped} if last else None}


class PresetIn(BaseModel):
    label: str
    settings: dict
    enabled: bool = True
    sort: int = 0


@router.get("/presets")
async def presets(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Preset).order_by(Preset.category, Preset.sort))).scalars()
    return {"presets": [{"id": r.id, "category": r.category, "key": r.key, "label": r.label, "settings": r.settings, "enabled": r.enabled, "sort": r.sort} for r in rows]}


@router.put("/presets/{preset_id}")
async def update_preset(preset_id: int, body: PresetIn, admin: AdminUser = Depends(tab("formats")), db: AsyncSession = Depends(get_db)):
    r = await db.get(Preset, preset_id)
    if r is None:
        raise ApiError("not_found", "Preset not found.", 404)
    before = {"label": r.label, "settings": r.settings, "enabled": r.enabled}
    r.label, r.settings, r.enabled, r.sort = body.label, body.settings, body.enabled, body.sort
    await audit(db, admin, "preset.update", f"{r.category}/{r.key}", before, body.model_dump())
    await db.commit()
    site.invalidate()
    return {"ok": True}

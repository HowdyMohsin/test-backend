from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ...core import catalog, quota, site
from ...core.auth import Identity, get_identity
from ...db.models import AdSlot
from ...db.session import get_db
from ...settings import get_settings

router = APIRouter()


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    depth = (await db.execute(text("select count(*) from jobs where status='queued'"))).scalar_one()
    return {"status": "ok", "queue_depth": depth, "version": get_settings().version}


@router.get("/formats")
async def formats(db: AsyncSession = Depends(get_db)):
    return await catalog.formats_payload(db)


@router.get("/plans")
async def plans(db: AsyncSession = Depends(get_db)):
    return {"plans": [{"id": p.id, "name": p.name, "price_cents": p.price_cents, "limits": p.limits} for p in (await site.plans(db)).values()],
            "messages": await site.messages(db)}


@router.get("/me")
async def me(ident: Identity = Depends(get_identity), db: AsyncSession = Depends(get_db)):
    used = await quota.used_today(db, ident.owner_key)
    limit = int(ident.plan.limits.get("daily_conversions", 0))
    pid = ident.plan.id
    if pid == "pro":
        kind, text_ = "pro_usage", await site.msg(db, "pro_usage", pid, used=used, limit=limit)
    elif used >= limit:
        kind, text_ = "quota_hit", await site.msg(db, "quota_hit", pid, used=used, limit=limit)
    elif pid == "anonymous" and used == 0:
        kind, text_ = "anon_teaser", await site.msg(db, "anon_teaser", pid, used=used, limit=limit)
    else:
        kind, text_ = "usage_light", await site.msg(db, "usage_light", pid, used=used, limit=limit)
    reset = datetime.now(timezone.utc).timestamp() + site.seconds_to_reset()
    return {"plan": {"id": pid, "name": ident.plan.name}, "limits": ident.plan.limits,
            "usage": {"used": used, "limit": limit, "resets_at": datetime.fromtimestamp(reset, timezone.utc).isoformat()},
            "banner": {"kind": kind, "text": text_}, "user": {"email": ident.user.email} if ident.user else None}


@router.get("/ads")
async def ads(ident: Identity = Depends(get_identity), db: AsyncSession = Depends(get_db)):
    if not ident.plan.limits.get("ads", True):
        return {"slots": {}}
    rows = (await db.execute(select(AdSlot).where(AdSlot.enabled, AdSlot.code != ""))).scalars()
    return {"slots": {r.key: r.code for r in rows}}


@router.get("/site")
async def site_info(db: AsyncSession = Depends(get_db)):
    s = await site.site_settings(db)
    exp = s.get("announcement_expires")
    live = bool(s.get("announcement_text")) and (not exp or exp > datetime.now(timezone.utc).isoformat())
    total = None
    if s.get("public_stats_enabled"):
        total = (await db.execute(text("select (select count(*) from events where status='done') + "
                                       "coalesce((select sum(count) from event_daily where status='done'), 0)"))).scalar_one()
    return {"maintenance": {"enabled": bool(s.get("maintenance_enabled")), "message": s.get("maintenance_message") or None},
            "announcement": {"text": s["announcement_text"], "link": s.get("announcement_link") or None} if live else None,
            "public_counter": int(total) if total is not None else None}

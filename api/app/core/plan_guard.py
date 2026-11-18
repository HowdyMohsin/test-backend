"""The plan check. It runs BEFORE any conversion work; a failure means nothing is converted."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import Upload
from ..formats.base import Pair
from ..settings import get_settings
from . import catalog, events, quota, site
from .auth import Identity
from .errors import ApiError

_TIER = {"anonymous": 0, "free": 0, "basic": 1, "pro": 2}
_LIMIT_KEY = {"image": "max_image_mb", "audio": "max_audio_mb", "video": "max_video_mb"}


def max_bytes(ident: Identity, category: str) -> int:
    return int(ident.plan.limits.get(_LIMIT_KEY[category], 0)) * 1024 * 1024


async def _next_plan(db: AsyncSession, pid: str):
    return (await site.plans(db)).get(site.NEXT_PLAN.get(pid, ""))


async def check_upload(db: AsyncSession, ident: Identity, category: str, size: int, info: dict) -> None:
    mx, pid = max_bytes(ident, category), ident.plan.id
    if size > mx:
        nxt = await _next_plan(db, pid)
        nxt_max = site.fmt_size(int(nxt.limits.get(_LIMIT_KEY[category], 0)) * 1024 * 1024) if nxt else ""
        raise ApiError("file_too_large", await site.msg(db, "size_hit", pid, size=site.fmt_size(size), max=site.fmt_size(mx), next_max=nxt_max), 413)
    if category == "image" and (info.get("width") or 0) * (info.get("height") or 0) > get_settings().max_pixels:
        raise ApiError("pixel_limit", f"This image is too large ({info['width']}x{info['height']} pixels).", 422)
    if category == "video":
        limit = int(ident.plan.limits.get("max_video_minutes", 0)) * 60
        if limit and (info.get("duration") or 0) > limit:
            nxt = await _next_plan(db, pid)
            nxt_max = site.fmt_duration(int(nxt.limits.get("max_video_minutes", 0)) * 60) if nxt else ""
            raise ApiError("duration_limit", await site.msg(db, "duration_hit", pid, duration=site.fmt_duration(info["duration"]),
                                                            max=site.fmt_duration(limit), next_max=nxt_max), 413)


def timeout_for(category: str, size: int, info: dict) -> int:
    mb, dur = size / 1e6, float(info.get("duration") or 0)
    if category == "video":
        return int(min(6 * 3600, 300 + 4 * dur + mb))
    if category == "audio":
        return int(120 + 0.5 * dur + mb)
    return int(min(900, 120 + 2 * mb))


async def check_convert(db: AsyncSession, ident: Identity, pair: Pair, upload: Upload, batch_id: UUID | None) -> None:
    """Raises ApiError, or reserves one unit of today's quota (caller commits it with the job row)."""
    pid, lim = ident.plan.id, ident.plan.limits
    st = await catalog.states(db)
    if not catalog.pair_live(st, pair):
        raise ApiError("pair_not_available", await site.msg(db, "pair_unavailable", pid), 422)
    lowest = min((_TIER.get(p, 2) for p in catalog.pair_plans(st, pair)), default=0)
    if _TIER.get(pid, 0) < lowest:
        raise ApiError("plan_required", "This conversion needs a paid plan. See the plans page.", 403)
    await check_upload(db, ident, upload.category, upload.size, upload.info)
    if batch_id:
        n = (await db.execute(text("select count(*) from jobs where batch_id=:b and owner_key=:o"),
                              {"b": batch_id, "o": ident.owner_key})).scalar_one()
        if n >= int(lim.get("max_batch", 1)):
            nxt = await _next_plan(db, pid)
            raise ApiError("batch_too_large", await site.msg(db, "batch_hit", pid, limit=lim.get("max_batch"),
                                                             next_limit=nxt.limits.get("max_batch") if nxt else ""), 429)
    limit = int(lim.get("daily_conversions", 0))
    if not await quota.reserve(db, ident.owner_key, limit):
        used = await quota.used_today(db, ident.owner_key)
        await events.record_block(pid, ident.owner_key, pair.slug, upload.category, "quota_exceeded")
        raise ApiError("quota_exceeded", await site.msg(db, "quota_hit", pid, used=used, limit=limit), 429)

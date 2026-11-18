"""Plans, messages and site settings read from the database with a short cache."""
from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import Message, Plan, SiteSetting

_TTL = 10.0
_cache: dict[str, tuple[float, Any]] = {}
NEXT_PLAN = {"anonymous": "free", "free": "basic", "basic": "pro"}
DEFAULT_SITE = {
    "maintenance_enabled": False, "maintenance_message": "", "announcement_text": "", "announcement_link": "",
    "announcement_expires": None, "public_stats_enabled": False, "retention_minutes": None,
}


def invalidate() -> None:
    _cache.clear()


async def cached(key: str, loader):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < _TTL:
        return hit[1]
    val = await loader()
    _cache[key] = (time.time(), val)
    return val


async def plans(db: AsyncSession) -> dict[str, Plan]:
    async def load():
        return {p.id: p for p in (await db.execute(select(Plan).order_by(Plan.sort))).scalars()}
    return await cached("plans", load)


async def messages(db: AsyncSession) -> dict[str, str]:
    async def load():
        return {m.key: m.text for m in (await db.execute(select(Message).where(Message.locale == "en"))).scalars()}
    return await cached("messages", load)


async def site_settings(db: AsyncSession) -> dict[str, Any]:
    async def load():
        rows = {s.key: s.value for s in (await db.execute(select(SiteSetting))).scalars()}
        return {**DEFAULT_SITE, **rows}
    return await cached("site", load)


def fmt_size(n: int) -> str:
    return f"{n / 1024 ** 3:.1f} GB" if n >= 1024 ** 3 else f"{n / 1024 ** 2:.0f} MB" if n >= 1024 ** 2 else f"{max(1, n // 1024)} KB"


def fmt_duration(sec: float) -> str:
    sec = int(sec)
    return f"{sec // 3600}h {sec % 3600 // 60}m" if sec >= 3600 else f"{sec // 60}m {sec % 60}s"


def fmt_reset(sec: int) -> str:
    return f"{sec // 3600}h {sec % 3600 // 60}m" if sec >= 3600 else f"{max(1, sec // 60)}m"


def seconds_to_reset() -> int:
    now = datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((tomorrow - now).total_seconds())


async def msg(db: AsyncSession, key: str, plan: str, **vars: Any) -> str:
    """Looks up key.plan, then key. The text is edited from the admin panel, not from code."""
    table = await messages(db)
    text = table.get(f"{key}.{plan}") or table.get(key) or key
    nxt = (await plans(db)).get(NEXT_PLAN.get(plan, ""))
    if nxt:
        vars.setdefault("next_limit", nxt.limits.get("daily_conversions"))
        vars.setdefault("next_max", fmt_size(int(nxt.limits.get("max_video_mb", 0)) * 1024 * 1024))
    vars.setdefault("reset_in", fmt_reset(seconds_to_reset()))

    class Safe(dict):
        def __missing__(self, k):
            return "{" + k + "}"

    return text.format_map(Safe(vars))

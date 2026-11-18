"""Daily conversion counter. Reserving is one atomic SQL statement, so races cannot overspend."""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def today() -> date:
    return datetime.now(timezone.utc).date()


async def used_today(db: AsyncSession, owner_key: str) -> int:
    row = (await db.execute(text("select used from quotas where owner_key=:k and day=:d"), {"k": owner_key, "d": today()})).first()
    return row[0] if row else 0


async def reserve(db: AsyncSession, owner_key: str, limit: int) -> bool:
    row = (await db.execute(text(
        "insert into quotas(owner_key, day, used) values (:k, :d, 1) "
        "on conflict (owner_key, day) do update set used = quotas.used + 1 where quotas.used + 1 <= :lim "
        "returning used"), {"k": owner_key, "d": today(), "lim": limit})).first()
    return row is not None


async def refund(db: AsyncSession, owner_key: str, day: date | None = None) -> None:
    await db.execute(text("update quotas set used = greatest(used - 1, 0) where owner_key=:k and day=:d"),
                     {"k": owner_key, "d": day or today()})

"""Daily quota: one atomic reserve per conversion, refund on failure."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def reserve(session: AsyncSession, owner_key: str, limit: int) -> int:
    """Atomically increment today's counter if under `limit`.

    Returns the new `used` count. Raises QuotaExceeded (as bool) when the
    limit is already reached — the caller maps it to the 429 error.
    """
    row = (
        await session.execute(
            text(
                """
                INSERT INTO quotas (owner_key, day, used)
                VALUES (:k, CURRENT_DATE, 1)
                ON CONFLICT (owner_key, day)
                DO UPDATE SET used = quotas.used + 1
                WHERE quotas.used < :limit
                RETURNING used
                """
            ),
            {"k": owner_key, "limit": limit},
        )
    ).first()
    if row is None:
        # Either the row existed and was already at the limit, or the insert
        # raced. Check which one honestly.
        used = (
            await session.execute(
                text("SELECT used FROM quotas WHERE owner_key=:k AND day=CURRENT_DATE"),
                {"k": owner_key},
            )
        ).scalar()
        if used is not None and used >= limit:
            raise QuotaExceeded(limit, used)
        # Lost race on a fresh row: retry once.
        row = (
            await session.execute(
                text(
                    """
                    INSERT INTO quotas (owner_key, day, used)
                    VALUES (:k, CURRENT_DATE, 1)
                    ON CONFLICT (owner_key, day)
                    DO UPDATE SET used = quotas.used + 1
                    WHERE quotas.used < :limit
                    RETURNING used
                    """
                ),
                {"k": owner_key, "limit": limit},
            )
        ).first()
        if row is None:
            raise QuotaExceeded(limit, used or limit)
    await session.flush()
    return int(row[0])


async def refund(session: AsyncSession, owner_key: str) -> None:
    await session.execute(
        text(
            "UPDATE quotas SET used = GREATEST(used - 1, 0)"
            " WHERE owner_key=:k AND day=CURRENT_DATE"
        ),
        {"k": owner_key},
    )
    await session.flush()


async def usage_today(session: AsyncSession, owner_key: str) -> int:
    return (
        await session.execute(
            text("SELECT COALESCE(used, 0) FROM quotas WHERE owner_key=:k AND day=CURRENT_DATE"),
            {"k": owner_key},
        )
    ).scalar() or 0


class QuotaExceeded(Exception):
    def __init__(self, limit: int, used: int) -> None:
        super().__init__(f"daily quota exceeded ({used}/{limit})")
        self.limit = limit
        self.used = used

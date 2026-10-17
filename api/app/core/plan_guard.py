"""Plan guard: every check happens BEFORE a conversion starts (spec 4.5)."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import APIError, ErrorCode
from app.core.quota import QuotaExceeded, reserve
from app.db.models import FormatState, Message, Plan, User
from app.formats import registry
from app.formats.base import AUDIO_SLUGS, VIDEO_SLUGS


@dataclass
class Identity:
    owner_key: str  # "user:<firebase_uid>" | "anon:<anon_id>"
    tier: str  # anonymous | free | pro
    user: User | None = None


async def _message(session: AsyncSession, key: str, **kw: object) -> str:
    row = (await session.execute(select(Message).where(Message.key == key))).scalar_one_or_none()
    text = row.text if row else key
    try:
        return text.format(**kw)
    except Exception:
        return text


async def _plan_limits(session: AsyncSession, tier: str) -> dict:
    plan = (await session.execute(select(Plan).where(Plan.id == tier))).scalar_one_or_none()
    if plan is None and tier == "anonymous":
        plan = (await session.execute(select(Plan).where(Plan.id == "free"))).scalar_one_or_none()
    if plan is None:
        raise APIError(ErrorCode.INTERNAL, "plan configuration missing")
    return dict(plan.limits or {})


async def _format_state(session: AsyncSession, key: str) -> FormatState | None:
    return (await session.execute(select(FormatState).where(FormatState.key == key))).scalar_one_or_none()


async def check_pair_available(
    session: AsyncSession, identity: Identity, pair_slug: str
) -> None:
    """Pair must exist, be visible, live, and allowed for this tier."""
    try:
        pair = registry.get_pair(pair_slug)
    except KeyError as exc:
        raise APIError(ErrorCode.PAIR_NOT_AVAILABLE, "this conversion is not offered") from exc

    pair_state = await _format_state(session, f"pair:{pair_slug}")
    if pair_state and (not pair_state.visible or pair_state.status != "live"):
        raise APIError(ErrorCode.PAIR_NOT_AVAILABLE, "this conversion is not available right now")
    if pair_state and identity.tier not in (pair_state.plans or []):
        raise APIError(
            ErrorCode.PLAN_REQUIRED,
            await _message(session, "pro_only", tier=identity.tier),
        )
    # source and target formats must also be visible+live
    for slug in (pair.from_format, pair.to_format):
        st = await _format_state(session, slug)
        if st and (not st.visible or st.status == "broken"):
            raise APIError(ErrorCode.PAIR_NOT_AVAILABLE, "this conversion is not available right now")


async def check_conversion(
    session: AsyncSession,
    identity: Identity,
    *,
    pair_slug: str,
    size_bytes: int,
    to_format: str,
    video_seconds: float | None = None,
    batch_n: int = 1,
) -> dict:
    """Full pre-conversion gate. Returns the plan limits used."""
    if identity.user is not None and identity.user.banned:
        raise APIError(ErrorCode.BANNED, "this account is banned")

    await check_pair_available(session, identity, pair_slug)
    limits = await _plan_limits(session, identity.tier)

    is_video = to_format in VIDEO_SLUGS or video_seconds is not None
    if to_format in VIDEO_SLUGS:
        cap_mb = int(limits.get("video_mb", 500))
    elif to_format in AUDIO_SLUGS:
        cap_mb = int(limits.get("audio_mb", 200))
    else:
        cap_mb = int(limits.get("image_mb", 200))
    if size_bytes > cap_mb * 1024 * 1024:
        raise APIError(
            ErrorCode.FILE_TOO_LARGE,
            await _message(session, "size_hit", limit=f"{cap_mb} MB"),
            {"limit_mb": cap_mb},
        )

    if is_video and video_seconds:
        max_sec = float(limits.get("video_max_sec", 1800))
        if video_seconds > max_sec:
            raise APIError(
                ErrorCode.FILE_TOO_LARGE,
                await _message(session, "size_hit", limit=f"{int(max_sec // 60)} min video"),
                {"limit_sec": max_sec},
            )

    batch_cap = int(limits.get("batch", 10))
    if batch_n > batch_cap:
        raise APIError(
            ErrorCode.BATCH_TOO_LARGE,
            await _message(session, "batch_hit", limit=batch_cap),
            {"limit": batch_cap},
        )

    daily = int(limits.get("daily", 25))
    try:
        used = await reserve(session, identity.owner_key, daily)
    except QuotaExceeded as exc:
        raise APIError(
            ErrorCode.QUOTA_EXCEEDED,
            await _message(session, "quota_hit", used=exc.used, limit=exc.limit, reset_in="midnight UTC"),
            {"used": exc.used, "limit": exc.limit},
        ) from exc
    await session.flush()
    return {"limits": limits, "used": used, "daily": daily}

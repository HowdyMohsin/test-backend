"""Catalog service: registry truth merged with admin-controlled DB state.

/v1/formats shows only visible + live pairs (spec 4.2). New pairs start as
"testing" (hidden) until the selfcheck passes them.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.plan_guard import Identity
from app.core.quota import usage_today
from app.db.models import AdSlot, AppSetting, Event, FormatState, Message, Plan
from app.formats import registry
from app.schemas import v1 as api_schemas


async def _state_map(session: AsyncSession) -> dict[str, FormatState]:
    rows = (await session.execute(select(FormatState))).scalars().all()
    return {r.key: r for r in rows}


def _pair_visible(states: dict[str, FormatState], pair_slug: str, tier: str) -> tuple[bool, str, list[str]]:
    st = states.get(f"pair:{pair_slug}")
    if st is None:
        return False, "testing", []
    if not st.visible or st.status != "live":
        return False, st.status, list(st.plans or [])
    plans = list(st.plans or [])
    return (tier in plans), st.status, plans


async def get_formats(session: AsyncSession, tier: str) -> api_schemas.FormatsResponse:
    states = await _state_map(session)
    specs = registry.all_formats()

    formats: list[api_schemas.FormatSchema] = []
    for mod_slug in registry.format_slugs():
        spec = specs[mod_slug]
        st = states.get(spec.slug)
        if st is not None and not st.visible:
            continue
        formats.append(
            api_schemas.FormatSchema(
                slug=spec.slug,
                name=spec.name,
                category=spec.category,
                subgroup=spec.subgroup,
                extensions=list(spec.extensions),
                mime=spec.mime,
                flags=list(spec.flags),
                output_settings=[
                    api_schemas.SettingFieldSchema(
                        key=f.key, label=f.label, type=f.type, default=f.default,
                        min=f.min, max=f.max, options=list(f.options), help=f.help,
                    )
                    for f in spec.output_settings
                ],
            )
        )

    pairs: list[api_schemas.PairSchema] = []
    for pair in registry.all_pairs():
        # source and target formats must be visible too
        hidden = any(
            states.get(sl) is not None and not states[sl].visible
            for sl in (pair.from_format, pair.to_format)
        )
        if hidden:
            continue
        ok, status, plans = _pair_visible(states, pair.slug, tier)
        if not ok:
            continue
        pairs.append(
            api_schemas.PairSchema(
                **{"from": pair.from_format, "to": pair.to_format},
                slug=pair.slug,
                label=pair.label,
                status=status,
                plans=plans,
            )
        )

    cats = [api_schemas.CategorySchema(id=c["id"], formats=c["formats"]) for c in registry.categories()]
    live_pair_slugs = [pair.slug for pair in pairs]
    return api_schemas.FormatsResponse(
        categories=cats,
        formats=formats,
        pairs=pairs,
        presets=await _load_presets(session),
        popular=await _popular_pair_slugs(session, live_pair_slugs),
    )


async def _load_presets(session: AsyncSession) -> list[api_schemas.PresetSchema]:
    """Conversion presets from the admin-editable app_settings table."""
    setting_row = await session.get(AppSetting, "presets")
    items = []
    if setting_row and isinstance(setting_row.value, dict):
        raw_items = setting_row.value.get("items", [])
        if isinstance(raw_items, list):
            items = raw_items
    presets: list[api_schemas.PresetSchema] = []
    for item in items:
        if not isinstance(item, dict) or not item.get("id"):
            continue
        presets.append(
            api_schemas.PresetSchema(
                id=str(item["id"]),
                name=str(item.get("name", item["id"])),
                category=str(item.get("category", "image")),
                settings=dict(item.get("settings", {}) or {}),
            )
        )
    return presets


async def _popular_pair_slugs(session: AsyncSession, live_pair_slugs: list[str]) -> list[str]:
    """12 popular pairs: admin-pinned first, then top pairs of the last 30 days."""
    live_set = set(live_pair_slugs)
    pinned_setting = await session.get(AppSetting, "popular_pinned")
    pinned: list[str] = []
    if pinned_setting and isinstance(pinned_setting.value, dict):
        raw_slugs = pinned_setting.value.get("slugs", [])
        if isinstance(raw_slugs, list):
            pinned = [str(slug) for slug in raw_slugs if str(slug) in live_set]

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    top_rows = (
        await session.execute(
            select(Event.pair_slug, func.count())
            .where(
                Event.created_at >= thirty_days_ago,
                Event.status == "done",
                Event.pair_slug.in_(live_pair_slugs),
            )
            .group_by(Event.pair_slug)
            .order_by(func.count().desc())
            .limit(12)
        )
    ).all() if live_pair_slugs else []

    popular = list(pinned)
    for pair_slug, _count in top_rows:
        if pair_slug not in popular:
            popular.append(pair_slug)
        if len(popular) >= 12:
            break
    return popular[:12]


async def get_plans(session: AsyncSession) -> api_schemas.PlansResponse:
    plans = (await session.execute(select(Plan).order_by(Plan.price_cents))).scalars().all()
    messages = (await session.execute(select(Message))).scalars().all()
    return api_schemas.PlansResponse(
        plans=[
            api_schemas.PlanSchema(id=p.id, name=p.name, price_cents=p.price_cents, limits=dict(p.limits or {}))
            for p in plans
        ],
        messages={m.key: m.text for m in messages},
    )


async def get_me(session: AsyncSession, identity: Identity) -> api_schemas.MeResponse:
    plan_row = (
        await session.execute(select(Plan).where(Plan.id == identity.tier))
    ).scalar_one_or_none()
    limits = dict(plan_row.limits or {}) if plan_row else {}
    daily = int(limits.get("daily", 5 if identity.tier == "anonymous" else 25))
    used = await usage_today(session, identity.owner_key)
    resets_at = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)

    banner = None
    if identity.tier == "anonymous" and used >= 3:
        banner = api_schemas.BannerSchema(kind="info", text="Create a free account to get 25 conversions a day.")
    elif used >= daily:
        banner = api_schemas.BannerSchema(kind="warning", text="Daily limit reached. Resets at midnight UTC.")

    user = identity.user
    return api_schemas.MeResponse(
        user=api_schemas.MeUserSchema(
            id=user.firebase_uid if user and user.firebase_uid else identity.owner_key,
            email=user.email if user else None,
            anonymous=identity.tier == "anonymous",
        ),
        plan=identity.tier,
        usage=api_schemas.UsageSchema(used=used, limit=daily, resets_at=resets_at),
        banner=banner,
    )


async def get_ad(session: AsyncSession, slot: str, tier: str) -> api_schemas.AdsResponse:
    # Pro users never see ads (spec 4.4).
    if tier == "pro":
        return api_schemas.AdsResponse(slot=slot, code="")
    row = (await session.execute(select(AdSlot).where(AdSlot.id == slot))).scalar_one_or_none()
    if row is None or not row.enabled:
        return api_schemas.AdsResponse(slot=slot, code="")
    return api_schemas.AdsResponse(slot=slot, code=row.code or "")

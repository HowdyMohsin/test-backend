"""What the public site may show: formats, pairs, presets, popular list. Code defines what is possible;
the format_state table (admin) decides what is visible and live."""
from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import FormatState, Preset
from ..formats import registry
from ..formats.base import Pair, SettingField
from .site import cached

SEED = Path(__file__).resolve().parents[2] / "seed"
CATEGORIES = [{"key": "image", "label": "Images"}, {"key": "audio", "label": "Audio"}, {"key": "video", "label": "Video"}]


async def states(db: AsyncSession) -> dict[str, FormatState]:
    async def load():
        return {s.key: s for s in (await db.execute(select(FormatState))).scalars()}
    return await cached("fstates", load)


def pair_live(st: dict[str, FormatState], pair: Pair) -> bool:
    ps = st.get(pair.slug)
    if not ps or ps.status != "live" or not ps.visible:
        return False
    return all((st.get(f.slug) is None or st[f.slug].visible) for f in (pair.src, pair.dst))


def pair_plans(st: dict[str, FormatState], pair: Pair) -> list[str]:
    ps = st.get(pair.slug)
    return list(ps.plans) if ps and ps.plans else ["free", "pro"]


def field_dict(f: SettingField) -> dict:
    d = asdict(f)
    d["options"] = [{"value": o["value"], "label": o["label"]} for o in d["options"]]
    return d


async def popular(db: AsyncSession, live: set[str], st: dict[str, FormatState]) -> list[str]:
    pinned = [k for k, v in st.items() if v.kind == "pair" and v.pinned and k in live]
    rows = (await db.execute(text(
        "select pair_slug from events where ts > now() - interval '30 days' and status='done' "
        "group by pair_slug order by count(*) desc limit 40"))).all()
    ranked = [r[0] for r in rows if r[0] in live]
    seeds = [s for s in json.loads((SEED / "popular.json").read_text()) if s in live]
    out: list[str] = []
    for s in pinned + ranked + seeds:
        if s not in out:
            out.append(s)
    return out[:12]


async def formats_payload(db: AsyncSession) -> dict:
    async def load():
        st = await states(db)
        live_pairs = [p for p in registry.pairs().values() if pair_live(st, p)]
        live = {p.slug for p in live_pairs}
        used = {p.src.slug for p in live_pairs} | {p.dst.slug for p in live_pairs}
        fm = []
        for s in registry.formats().values():
            if s.slug not in used:
                continue
            targets = [p.dst.slug for p in live_pairs if p.src is s]
            default = s.default_target if s.default_target in targets else (targets[0] if targets else None)
            fm.append({"slug": s.slug, "name": s.name, "category": s.category, "subgroup": s.subgroup,
                       "extensions": list(s.extensions), "mime": s.mime, "flags": asdict(s.flags),
                       "default_target": default, "tips": list(s.tips), "can_read": bool(targets), "can_write": s.writer is not None,
                       "input_settings": [field_dict(f) for f in s.input_settings],
                       "output_settings": [field_dict(f) for f in s.output_settings]})
        pr = [{"slug": p.slug, "from": p.src.slug, "to": p.dst.slug, "label": p.label, "note": p.note,
               "plans": pair_plans(st, p),
               "settings_override": [field_dict(f) for f in p.spec.settings] if p.spec.settings is not None else None}
              for p in live_pairs]
        presets: dict[str, list] = {}
        for r in (await db.execute(select(Preset).where(Preset.enabled).order_by(Preset.sort))).scalars():
            presets.setdefault(r.category, []).append({"key": r.key, "label": r.label, "settings": r.settings})
        return {"categories": CATEGORIES, "formats": fm, "pairs": pr, "presets": presets,
                "popular": await popular(db, live, st), "counts": {"formats": len(fm), "pairs": len(pr)}}
    return await cached("formats_payload", load)

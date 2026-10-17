"""Format registry: auto-loads all 32 format files and derives the 210 pairs.

There is no separate pair-list file and no same-category auto rule —
pairs come only from each format file's `targets`.
"""

from __future__ import annotations

import importlib
from functools import lru_cache

from app.formats.base import (
    ENGINES,
    FormatSpec,
    Pair,
    default_engine,
)

# Explicit module list: frozen, no filesystem scanning surprises.
_FORMAT_MODULES: tuple[str, ...] = (
    "app.formats.images.jpg",
    "app.formats.images.png",
    "app.formats.images.webp",
    "app.formats.images.avif",
    "app.formats.images.gif",
    "app.formats.images.tiff",
    "app.formats.images.heic",
    "app.formats.images.svg",
    "app.formats.images.psd",
    "app.formats.images.pdf",
    "app.formats.raw.cr2",
    "app.formats.raw.nef",
    "app.formats.raw.arw",
    "app.formats.raw.dng",
    "app.formats.raw.rw2",
    "app.formats.raw.orf",
    "app.formats.raw.pef",
    "app.formats.raw.raf",
    "app.formats.audio.mp3",
    "app.formats.audio.wav",
    "app.formats.audio.flac",
    "app.formats.audio.aac",
    "app.formats.audio.ogg",
    "app.formats.audio.m4a",
    "app.formats.audio.opus",
    "app.formats.audio.aiff",
    "app.formats.video.mp4",
    "app.formats.video.mov",
    "app.formats.video.mkv",
    "app.formats.video.avi",
    "app.formats.video.webm",
    "app.formats.video.wmv",
)

# Detection order: most specific magic first.
_DETECTION_ORDER: tuple[str, ...] = (
    "cr2",
    "webm",
    "mkv",
    "opus",
    "jpg",
    "png",
    "webp",
    "avif",
    "gif",
    "svg",
    "heic",
    "psd",
    "pdf",
    "mp3",
    "wav",
    "flac",
    "aac",
    "ogg",
    "m4a",
    "aiff",
    "mp4",
    "mov",
    "avi",
    "wmv",
    "tiff",
    "nef",
    "arw",
    "dng",
    "rw2",
    "orf",
    "pef",
    "raf",
)


@lru_cache(maxsize=1)
def _load() -> dict[str, FormatSpec]:
    specs: dict[str, FormatSpec] = {}
    for mod_name in _FORMAT_MODULES:
        mod = importlib.import_module(mod_name)
        spec: FormatSpec = mod.SPEC
        if spec.slug in specs:
            raise RuntimeError(f"duplicate format slug: {spec.slug}")
        specs[spec.slug] = spec
    if len(specs) != 32:
        raise RuntimeError(f"expected 32 formats, loaded {len(specs)}")
    return specs


def all_formats() -> dict[str, FormatSpec]:
    return _load()


def get_format(slug: str) -> FormatSpec:
    try:
        return _load()[slug]
    except KeyError:
        raise KeyError(f"unknown format: {slug}") from None


def detection_order() -> tuple[str, ...]:
    return _DETECTION_ORDER


def format_slugs() -> tuple[str, ...]:
    """All format slugs in registry order (public accessor)."""
    return tuple(m.rsplit(".", 1)[1] for m in _FORMAT_MODULES)


def get_magic_group(group: str) -> list[FormatSpec]:
    return [s for s in _load().values() if s.magic_group == group]


@lru_cache(maxsize=1)
def all_pairs() -> list[Pair]:
    specs = _load()
    pairs: list[Pair] = []
    for mod_name in _FORMAT_MODULES:
        slug = mod_name.rsplit(".", 1)[1]
        spec = specs[slug]
        for ps in spec.pair_specs():
            if ps.to not in specs:
                raise RuntimeError(f"{slug}: unknown target {ps.to}")
            to_spec = specs[ps.to]
            if to_spec.writer is None:
                raise RuntimeError(f"{slug}: target {ps.to} is input-only")
            engine = ps.engine or default_engine(spec.slug, spec.category, ps.to)
            if engine not in ENGINES:
                raise RuntimeError(f"{slug}->{ps.to}: unknown engine {engine}")
            pairs.append(
                Pair(
                    slug=f"{slug}-to-{ps.to}",
                    from_format=slug,
                    to_format=ps.to,
                    label=ps.label,
                    engine=engine,
                )
            )
    # Pair slugs are SEO-frozen: they must be unique.
    slugs = [p.slug for p in pairs]
    if len(set(slugs)) != len(slugs):
        raise RuntimeError("duplicate pair slug")
    return pairs


def get_pair(pair_slug: str) -> Pair:
    for p in all_pairs():
        if p.slug == pair_slug:
            return p
    raise KeyError(f"unknown pair: {pair_slug}")


def pairs_from(slug: str) -> list[Pair]:
    return [p for p in all_pairs() if p.from_format == slug]


def categories() -> list[dict]:
    specs = _load()
    cats: dict[str, dict] = {}
    for spec in specs.values():
        cat = cats.setdefault(spec.category, {"id": spec.category, "formats": []})
        cat["formats"].append(spec.slug)
    # stable order: image, audio, video
    return [cats[c] for c in ("image", "audio", "video") if c in cats]


def snapshot() -> dict:
    """JSON-serializable registry dump for formats.json / frontend build."""
    specs = _load()
    return {
        "version": "2.1.0",
        "pair_count": len(all_pairs()),
        "categories": categories(),
        "formats": [
            {
                "slug": s.slug,
                "name": s.name,
                "category": s.category,
                "subgroup": s.subgroup,
                "extensions": list(s.extensions),
                "mime": s.mime,
                "flags": list(s.flags),
                "reader": s.reader,
                "writer": s.writer,
                "output_settings": [
                    {
                        "key": f.key,
                        "label": f.label,
                        "type": f.type,
                        "default": f.default,
                        "min": f.min,
                        "max": f.max,
                        "options": list(f.options),
                        "help": f.help,
                    }
                    for f in s.output_settings
                ],
            }
            for s in (_load()[m.rsplit(".", 1)[1]] for m in _FORMAT_MODULES)
        ],
        "pairs": [
            {
                "slug": p.slug,
                "from": p.from_format,
                "to": p.to_format,
                "label": p.label,
                "engine": p.engine,
            }
            for p in all_pairs()
        ],
    }

"""Auto-discovers every format file and derives the pairs. Nothing is listed by hand."""
from __future__ import annotations

import importlib
import pkgutil
from functools import lru_cache

from . import audio, images, raw, video
from .base import FormatSpec, Pair

_PACKAGES = (images, raw, audio, video)


@lru_cache(maxsize=1)
def formats() -> dict[str, FormatSpec]:
    found: dict[str, FormatSpec] = {}
    for pkg in _PACKAGES:
        for mod in pkgutil.iter_modules(pkg.__path__):
            spec = importlib.import_module(f"{pkg.__name__}.{mod.name}").SPEC
            if spec.slug in found:
                raise RuntimeError(f"duplicate format slug: {spec.slug}")
            found[spec.slug] = spec
    return found


def route_for(src: FormatSpec, dst: FormatSpec, override: str | None) -> str:
    if override:
        return override
    if src.category == "video":
        if dst.category == "audio":
            return "ffmpeg_audio"
        return "ffmpeg_gif" if dst.slug == "gif" else "ffmpeg_video"
    if src.category == "audio":
        return "ffmpeg_audio"
    if dst.slug == "svg":
        return "trace"
    return {"svg": "svg", "psd": "psd", "pdf": "pdf"}.get(src.slug, "raw" if src.subgroup == "raw" else "raster")


@lru_cache(maxsize=1)
def pairs() -> dict[str, Pair]:
    fm = formats()
    out: dict[str, Pair] = {}
    for src in fm.values():
        for dst_slug, ps in src.targets.items():
            dst = fm.get(dst_slug)
            if dst is None:
                raise RuntimeError(f"{src.slug} targets unknown format {dst_slug}")
            if dst.writer is None:
                raise RuntimeError(f"{src.slug} targets {dst_slug}, which cannot be written")
            slug = f"{src.slug}-to-{dst_slug}"
            out[slug] = Pair(slug=slug, src=src, dst=dst, spec=ps, route=route_for(src, dst, ps.route),
                             label=ps.label, note=ps.note)
    return out


def pair_for(src: str, dst: str) -> Pair | None:
    return pairs().get(f"{src}-to-{dst}")


def detect(head: bytes, filename: str = "") -> str | None:
    """Return the format slug for the first bytes of a file, or None."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    cands = [s for s in formats().values() if s.sniff(head)]
    specific = [s for s in cands if not s.tiff_family and s.slug != "tiff"]
    if specific:
        return specific[0].slug
    fam = [s for s in cands if s.tiff_family and ext in s.extensions]
    if fam:
        return fam[0].slug
    if any(s.slug == "tiff" for s in cands):
        return "tiff"
    return None


@lru_cache(maxsize=1)
def ext_map() -> dict[str, str]:
    m: dict[str, str] = {}
    for s in formats().values():
        for e in s.extensions:
            m[e] = s.slug
    return m


def slug_for_extension(filename: str) -> str | None:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext_map().get(ext)

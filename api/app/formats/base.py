"""Format declaration primitives.

A format file only DECLARES truth (magic bytes, targets, settings). It never
does work. The registry auto-loads every module and derives the pair list —
there is no separate pair list file and no same-category auto rule.
"""

from __future__ import annotations

from dataclasses import dataclass


# A magic pattern: tuple of (offset, bytes) — ALL must match.
# `magic` on a spec holds ALTERNATIVE patterns — ANY one may match.
MagicPattern = tuple[tuple[int, bytes], ...]


@dataclass(frozen=True)
class SettingField:
    key: str
    label: str
    type: str  # select | range | number | boolean | color
    default: object = None
    min: float | None = None
    max: float | None = None
    options: tuple[str, ...] = ()
    help: str = ""


@dataclass(frozen=True)
class PairSpec:
    to: str
    label: str | None = None
    engine: str | None = None  # engine override, e.g. "trace" for raster->svg
    extra_settings: tuple[SettingField, ...] = ()


@dataclass(frozen=True)
class FormatSpec:
    slug: str
    name: str
    category: str  # image | audio | video
    subgroup: str | None = None  # "raw" for camera RAW
    extensions: tuple[str, ...] = ()
    mime: str = ""
    magic: tuple[MagicPattern, ...] = ()
    magic_contains: tuple[bytes, ...] = ()  # must appear within first 4 KiB
    magic_group: str | None = None  # shared-magic group id (e.g. "tiff")
    reader: str | None = None  # engine that reads this format (None = output-only)
    writer: str | None = None  # engine that writes this format (None = input-only)
    targets: tuple[PairSpec | str, ...] = ()
    output_settings: tuple[SettingField, ...] = ()
    flags: tuple[str, ...] = ()  # lossy, alpha, animated, vector, multipage

    def pair_specs(self) -> list[PairSpec]:
        out: list[PairSpec] = []
        for t in self.targets:
            out.append(t if isinstance(t, PairSpec) else PairSpec(to=t))
        return out


@dataclass(frozen=True)
class Pair:
    slug: str  # {from}-to-{to}, never changes (SEO)
    from_format: str
    to_format: str
    label: str | None
    engine: str


# Engine names used across the codebase
ENGINES = ("vips", "svg", "psd", "pdf", "trace", "raw", "ffmpeg")

VIDEO_SLUGS = ("mp4", "mov", "mkv", "avi", "webm", "wmv")
AUDIO_SLUGS = ("mp3", "wav", "flac", "aac", "ogg", "m4a", "opus", "aiff")
RAW_SLUGS = ("cr2", "nef", "arw", "dng", "rw2", "orf", "pef", "raf")


def default_engine(from_slug: str, from_category: str, to_slug: str) -> str:
    """Engine routing for a pair (overridable per PairSpec)."""
    if from_category in ("audio", "video") or to_slug in VIDEO_SLUGS:
        return "ffmpeg"
    if from_slug == "svg":
        return "svg"
    if from_slug == "psd":
        return "psd"
    if from_slug == "pdf":
        return "pdf"
    if from_slug in RAW_SLUGS:
        return "raw"
    if to_slug == "svg":
        return "trace"
    return "vips"


def _sel(key: str, label: str, options: tuple[str, ...], default: str, help: str = "") -> SettingField:
    return SettingField(key=key, label=label, type="select", default=default, options=options, help=help)


def _range(
    key: str, label: str, default: float, min: float, max: float, help: str = ""
) -> SettingField:
    return SettingField(
        key=key, label=label, type="range", default=default, min=min, max=max, help=help
    )


def _bool(key: str, label: str, default: bool = False, help: str = "") -> SettingField:
    return SettingField(key=key, label=label, type="boolean", default=default, help=help)


def _color(key: str, label: str, default: str = "#ffffff", help: str = "") -> SettingField:
    return SettingField(key=key, label=label, type="color", default=default, help=help)

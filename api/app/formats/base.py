"""Building blocks for format files. A format file only declares; engines do the work."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass(frozen=True)
class Option:
    value: str
    label: str


@dataclass(frozen=True)
class SettingField:
    """One option shown in the UI. The frontend renders it from this schema."""

    key: str
    label: str
    type: str  # select | range | number | boolean | color | text
    default: Any = None
    min: float | None = None
    max: float | None = None
    step: float | None = None
    options: tuple[Option, ...] = ()
    level: str = "basic"  # basic | advanced
    group: str = "format"  # resize | transform | color | metadata | format | source | trim | audio | video
    help: str = ""
    # Tiny condition language evaluated by the frontend:
    #   key=value | key!=value | key in a,b | source.alpha
    show_if: str | None = None


@dataclass(frozen=True)
class Flags:
    lossy: bool = False
    alpha: bool = False
    animated: bool = False
    vector: bool = False
    multipage: bool = False


@dataclass(frozen=True)
class PairSpec:
    label: str | None = None  # e.g. "Vectorized (traced)"
    route: str | None = None  # override the automatically derived route
    settings: tuple[SettingField, ...] | None = None  # replaces the target's output_settings
    note: str | None = None


@dataclass(frozen=True)
class FormatSpec:
    slug: str
    name: str
    category: str  # image | audio | video
    extensions: tuple[str, ...]
    mime: str
    sniff: Callable[[bytes], bool]
    flags: Flags
    default_target: str
    targets: dict[str, PairSpec]
    subgroup: str | None = None  # "raw" for camera RAW formats
    reader: str | None = None  # engine that reads it (None = output only)
    writer: str | None = None  # engine that writes it (None = input only)
    output_settings: tuple[SettingField, ...] = ()
    input_settings: tuple[SettingField, ...] = ()
    tips: tuple[str, ...] = ()
    tiff_family: bool = False  # header looks like TIFF; resolved by file extension

    @property
    def ext(self) -> str:
        return self.extensions[0]


@dataclass(frozen=True)
class Pair:
    slug: str  # jpg-to-png
    src: FormatSpec
    dst: FormatSpec
    spec: PairSpec
    route: str
    label: str | None = None
    note: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    @property
    def fields(self) -> tuple[SettingField, ...]:
        out = self.spec.settings if self.spec.settings is not None else self.dst.output_settings
        return tuple(self.src.input_settings) + tuple(out)

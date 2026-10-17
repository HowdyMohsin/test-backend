"""ARW (Sony RAW) format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec

SPEC = FormatSpec(
    slug="arw",
    name="ARW (Sony RAW)",
    category="image",
    subgroup="raw",
    extensions=('arw',),
    mime="image/x-sony-arw",
    magic=(
        ((0, b'II*\x00'),),
        ((0, b'MM\x00*'),),
    ),
    magic_group="tiff",
    reader="raw",
    writer=None,
    targets=(
        "jpg",
        "png",
        "webp",
        "tiff"
    ),
    output_settings=(
        
    ),
    flags=(),
)

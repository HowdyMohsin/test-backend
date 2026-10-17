"""ORF (Olympus RAW) format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec

SPEC = FormatSpec(
    slug="orf",
    name="ORF (Olympus RAW)",
    category="image",
    subgroup="raw",
    extensions=('orf',),
    mime="image/x-olympus-orf",
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

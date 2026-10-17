"""CR2 (Canon RAW) format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec

SPEC = FormatSpec(
    slug="cr2",
    name="CR2 (Canon RAW)",
    category="image",
    subgroup="raw",
    extensions=('cr2',),
    mime="image/x-canon-cr2",
    magic=(
        ((0, b'II*\x00'), (8, b'CR'),),
    ),
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

"""PDF format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec

SPEC = FormatSpec(
    slug="pdf",
    name="PDF",
    category="image",
    extensions=('pdf',),
    mime="application/pdf",
    magic=(
        ((0, b'%PDF-'),),
    ),
    reader="pdf",
    writer=None,
    targets=(
        "jpg",
        "png",
        "webp",
        "tiff"
    ),
    output_settings=(
        
    ),
    flags=("vector", "multipage",),
)

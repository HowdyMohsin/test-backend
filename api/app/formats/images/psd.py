"""PSD format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec

SPEC = FormatSpec(
    slug="psd",
    name="PSD",
    category="image",
    extensions=('psd',),
    mime="image/vnd.adobe.photoshop",
    magic=(
        ((0, b'8BPS'),),
    ),
    reader="psd",
    writer=None,
    targets=(
        "jpg",
        "png",
        "webp",
        "avif",
        "tiff"
    ),
    output_settings=(
        
    ),
    flags=("alpha",),
)

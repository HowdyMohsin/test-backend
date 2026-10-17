"""HEIC format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec

SPEC = FormatSpec(
    slug="heic",
    name="HEIC",
    category="image",
    extensions=('heic', 'heif'),
    mime="image/heic",
    magic=(
        ((4, b'ftypheic'),),
        ((4, b'ftypheix'),),
        ((4, b'ftyphevc'),),
        ((4, b'ftypheim'),),
        ((4, b'ftypheis'),),
        ((4, b'ftypmif1'),),
    ),
    reader="vips",
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
    flags=("lossy", "alpha",),
)

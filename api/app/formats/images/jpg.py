"""JPG format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, PairSpec, _range, _color, _bool

SPEC = FormatSpec(
    slug="jpg",
    name="JPG",
    category="image",
    extensions=('jpg', 'jpeg'),
    mime="image/jpeg",
    magic=(
        ((0, b'\xff\xd8\xff'),),
    ),
    reader="vips",
    writer="vips",
    targets=(
        "png",
        "webp",
        "avif",
        "gif",
        "tiff",
        PairSpec(to="svg", label="Vectorized (traced)", engine="trace")
    ),
    output_settings=(
        _range("quality", "Quality", 85, 1, 100, "Higher = bigger file, better look"),
        _color("background", "Background color", "#ffffff", "Used when the source has transparency"),
        _bool("strip_metadata", "Remove metadata (EXIF)"),
        _bool("progressive", "Progressive JPEG"),
    ),
    flags=("lossy",),
)

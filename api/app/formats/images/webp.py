"""WebP format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, PairSpec, _range, _bool

SPEC = FormatSpec(
    slug="webp",
    name="WebP",
    category="image",
    extensions=('webp',),
    mime="image/webp",
    magic=(
        ((0, b'RIFF'), (8, b'WEBP'),),
    ),
    reader="vips",
    writer="vips",
    targets=(
        "jpg",
        "png",
        "avif",
        "gif",
        "tiff",
        PairSpec(to="svg", label="Vectorized (traced)", engine="trace")
    ),
    output_settings=(
        _range("quality", "Quality", 85, 1, 100),
        _bool("lossless", "Lossless mode"),
        _bool("strip_metadata", "Remove metadata"),
    ),
    flags=("lossy", "alpha", "animated",),
)

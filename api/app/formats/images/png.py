"""PNG format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, PairSpec, _range, _bool

SPEC = FormatSpec(
    slug="png",
    name="PNG",
    category="image",
    extensions=('png',),
    mime="image/png",
    magic=(
        ((0, b'\x89PNG\r\n\x1a\n'),),
    ),
    reader="vips",
    writer="vips",
    targets=(
        "jpg",
        "webp",
        "avif",
        "gif",
        "tiff",
        PairSpec(to="svg", label="Vectorized (traced)", engine="trace")
    ),
    output_settings=(
        _range("compression", "Compression level", 6, 0, 9, "Higher = smaller file, slower"),
        _bool("strip_metadata", "Remove metadata"),
    ),
    flags=("alpha",),
)

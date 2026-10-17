"""AVIF format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, PairSpec, _range, _bool

SPEC = FormatSpec(
    slug="avif",
    name="AVIF",
    category="image",
    extensions=('avif',),
    mime="image/avif",
    magic=(
        ((4, b'ftypavif'),),
        ((4, b'ftypavis'),),
    ),
    reader="vips",
    writer="vips",
    targets=(
        "jpg",
        "png",
        "webp",
        "gif",
        "tiff",
        PairSpec(to="svg", label="Vectorized (traced)", engine="trace")
    ),
    output_settings=(
        _range("quality", "Quality", 80, 1, 100),
        _bool("strip_metadata", "Remove metadata"),
    ),
    flags=("lossy", "alpha", "animated",),
)

"""TIFF format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, PairSpec, _sel, _bool

SPEC = FormatSpec(
    slug="tiff",
    name="TIFF",
    category="image",
    extensions=('tif', 'tiff'),
    mime="image/tiff",
    magic=(
        ((0, b'II*\x00'),),
        ((0, b'MM\x00*'),),
    ),
    magic_group="tiff",
    reader="vips",
    writer="vips",
    targets=(
        "jpg",
        "png",
        "webp",
        "avif",
        "gif",
        PairSpec(to="svg", label="Vectorized (traced)", engine="trace")
    ),
    output_settings=(
        _sel("compression", "Compression", ("lzw", "deflate", "zip", "none"), "lzw"),
        _bool("strip_metadata", "Remove metadata"),
    ),
    flags=("alpha", "multipage",),
)

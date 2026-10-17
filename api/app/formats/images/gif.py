"""GIF format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, PairSpec, _range

SPEC = FormatSpec(
    slug="gif",
    name="GIF",
    category="image",
    extensions=('gif',),
    mime="image/gif",
    magic=(
        ((0, b'GIF87a'),),
        ((0, b'GIF89a'),),
    ),
    reader="vips",
    writer="vips",
    targets=(
        "jpg",
        "png",
        "webp",
        "avif",
        "tiff",
        PairSpec(to="svg", label="Vectorized (traced)", engine="trace")
    ),
    output_settings=(
        _range("fps", "Frames per second", 15, 1, 30, "Only for video sources"),
        _range("width", "Max width (px)", 480, 64, 1920, "Only for video sources, keeps aspect ratio"),
    ),
    flags=("alpha", "animated",),
)

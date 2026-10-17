"""SVG format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, _sel, _range

SPEC = FormatSpec(
    slug="svg",
    name="SVG",
    category="image",
    extensions=('svg',),
    mime="image/svg+xml",
    magic=(
        ((0, b'<?xml'),),
        ((0, b'<svg'),),
    ),
    reader="svg",
    writer="trace",
    targets=(
        "jpg",
        "png",
        "webp",
        "avif",
        "tiff",
        "gif"
    ),
    output_settings=(
        _sel("color_mode", "Trace mode", ("color", "binary"), "color", "How the raster is vectorized"),
        _range("max_size", "Max input size (px)", 2048, 256, 4096, "Larger input = slower trace"),
    ),
    flags=("vector",),
)

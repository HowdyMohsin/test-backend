"""SVG. Source: rendered with resvg. Target: traced with vtracer (not an exact copy)."""
from ..base import Flags, FormatSpec
from ..fields import TRACE_FIELDS, color, num, sel
from ..groups import plain
from ..sniff import svg

SPEC = FormatSpec(
    slug="svg", name="SVG", category="image",
    extensions=("svg",), mime="image/svg+xml",
    sniff=svg,
    flags=Flags(vector=True, alpha=True),
    default_target="png", reader="svg", writer="trace",
    targets=plain("jpg", "png", "webp", "avif", "tiff", "gif"),
    output_settings=TRACE_FIELDS,
    input_settings=(
        num("svg_width", "Output width (px, 0 = original)", 0, 0, 16384, group="source"),
        sel("svg_dpi", "DPI", [("96", "96"), ("150", "150"), ("300", "300")], "96", group="source", level="advanced"),
        color("svg_background", "Background", "transparent", group="source", level="advanced",
              help="Use transparent or a color like #ffffff."),
    ),
    tips=("SVG is a vector format that scales without losing quality.",),
)

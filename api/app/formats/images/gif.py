"""GIF."""
from ..base import Flags, FormatSpec
from ..fields import IMAGE_COMMON, flag, num, sel
from ..groups import raster_targets
from ..sniff import sig

SPEC = FormatSpec(
    slug="gif", name="GIF", category="image",
    extensions=("gif",), mime="image/gif",
    sniff=sig(b"GIF87a", b"GIF89a"),
    flags=Flags(alpha=True, animated=True),
    default_target="png", reader="vips", writer="vips",
    targets=raster_targets("gif"),
    output_settings=IMAGE_COMMON + (
        num("gif_colors", "Colors (2-256)", 256, 2, 256),
        flag("gif_dither", "Dither", True, level="advanced"),
        num("gif_delay_ms", "Frame delay (ms, 0 = keep)", 0, 0, 10000, level="advanced", show_if="source.animated"),
        sel("gif_loop", "Loop", [("inf", "Forever"), ("once", "Once")], "inf", level="advanced", show_if="source.animated"),
    ),
    tips=("GIF is limited to 256 colors. Animated GIFs convert to WebP with the animation kept.",),
)

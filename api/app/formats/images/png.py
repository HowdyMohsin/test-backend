"""PNG."""
from ..base import Flags, FormatSpec
from ..fields import IMAGE_COMMON, flag, num, rng, sel
from ..groups import raster_targets
from ..sniff import sig

SPEC = FormatSpec(
    slug="png", name="PNG", category="image",
    extensions=("png",), mime="image/png",
    sniff=sig(b"\x89PNG\r\n\x1a\n"),
    flags=Flags(alpha=True),
    default_target="jpg", reader="vips", writer="vips",
    targets=raster_targets("png"),
    output_settings=IMAGE_COMMON + (
        rng("png_compression", "Compression (0-9)", 6, 0, 9),
        flag("interlace", "Interlaced", False, level="advanced"),
        flag("reduce_colors", "Reduce colors (smaller file)", False, level="advanced"),
        num("png_colors", "Colors", 256, 2, 256, level="advanced", show_if="reduce_colors=true"),
        flag("png_dither", "Dither", True, level="advanced", show_if="reduce_colors=true"),
        sel("bit_depth", "Bit depth", [("8", "8-bit"), ("16", "16-bit")], "8", level="advanced"),
    ),
    tips=("PNG is lossless and keeps transparency. Photos become large files.",),
)

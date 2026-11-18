"""JPEG."""
from ..base import Flags, FormatSpec
from ..fields import IMAGE_COMMON, TARGET_SIZE, color, flag, rng, sel
from ..groups import raster_targets
from ..sniff import sig

SPEC = FormatSpec(
    slug="jpg", name="JPEG", category="image",
    extensions=("jpg", "jpeg", "jpe", "jfif"), mime="image/jpeg",
    sniff=sig(b"\xff\xd8\xff"),
    flags=Flags(lossy=True),
    default_target="png", reader="vips", writer="vips",
    targets=raster_targets("jpg"),
    output_settings=IMAGE_COMMON + (
        color("background", "Background for transparent areas", "#ffffff", show_if="source.alpha"),
        rng("quality", "Quality", 85, 1, 100),
        TARGET_SIZE,
        flag("progressive", "Progressive JPEG", False, level="advanced"),
        sel("subsample", "Chroma subsampling", [("420", "4:2:0 (smaller)"), ("444", "4:4:4 (sharper colors)")], "420", level="advanced"),
        flag("optimize", "Optimize Huffman tables", True, level="advanced"),
    ),
    tips=("JPEG is best for photos and works everywhere. It has no transparency.",),
)

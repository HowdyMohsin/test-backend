"""AVIF."""
from ..base import Flags, FormatSpec
from ..fields import IMAGE_COMMON, TARGET_SIZE, flag, num, rng, sel
from ..groups import raster_targets
from ..sniff import ftyp

SPEC = FormatSpec(
    slug="avif", name="AVIF", category="image",
    extensions=("avif",), mime="image/avif",
    sniff=ftyp(b"avif", b"avis"),
    flags=Flags(lossy=True, alpha=True),
    default_target="jpg", reader="vips", writer="vips",
    targets=raster_targets("avif"),
    output_settings=IMAGE_COMMON + (
        rng("quality", "Quality", 60, 1, 100),
        TARGET_SIZE,
        flag("lossless", "Lossless", False),
        num("effort", "Effort (0-9)", 4, 0, 9, level="advanced"),
        sel("subsample", "Chroma subsampling", [("420", "4:2:0"), ("444", "4:4:4")], "420", level="advanced"),
        sel("bit_depth", "Bit depth", [("8", "8-bit"), ("10", "10-bit")], "8", level="advanced"),
    ),
    tips=("AVIF gives the smallest files, but encoding is slower and some old apps cannot open it.",),
)

"""WebP."""
from ..base import Flags, FormatSpec
from ..fields import IMAGE_COMMON, TARGET_SIZE, flag, num, rng
from ..groups import raster_targets
from ..sniff import riff

SPEC = FormatSpec(
    slug="webp", name="WebP", category="image",
    extensions=("webp",), mime="image/webp",
    sniff=riff(b"WEBP"),
    flags=Flags(lossy=True, alpha=True, animated=True),
    default_target="jpg", reader="vips", writer="vips",
    targets=raster_targets("webp"),
    output_settings=IMAGE_COMMON + (
        rng("quality", "Quality", 80, 1, 100),
        TARGET_SIZE,
        flag("lossless", "Lossless", False),
        num("effort", "Effort (0-6)", 4, 0, 6, level="advanced"),
        flag("near_lossless", "Near-lossless", False, level="advanced"),
        flag("keep_animation", "Keep animation", True, level="advanced", show_if="source.animated"),
    ),
    tips=("WebP is usually smaller than JPG or PNG and works in all modern browsers.",),
)

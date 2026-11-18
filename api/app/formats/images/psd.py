"""Photoshop PSD. Input only, layers are flattened."""
from ..base import Flags, FormatSpec
from ..fields import color
from ..groups import plain
from ..sniff import sig

SPEC = FormatSpec(
    slug="psd", name="PSD", category="image",
    extensions=("psd",), mime="image/vnd.adobe.photoshop",
    sniff=sig(b"8BPS"),
    flags=Flags(alpha=True),
    default_target="png", reader="psd", writer=None,
    targets=plain("jpg", "png", "webp", "avif", "tiff"),
    input_settings=(
        color("psd_background", "Background", "transparent", group="source", level="advanced", help="Use transparent or a color like #ffffff."),
    ),
    tips=("All layers are flattened into one image.",),
)

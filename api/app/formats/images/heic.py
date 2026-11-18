"""HEIC / HEIF (iPhone photos). Input only."""
from ..base import Flags, FormatSpec
from ..groups import plain
from ..sniff import ftyp

SPEC = FormatSpec(
    slug="heic", name="HEIC", category="image",
    extensions=("heic", "heif"), mime="image/heic",
    sniff=ftyp(b"heic", b"heix", b"hevc", b"hevx", b"heim", b"heis", b"mif1", b"msf1"),
    flags=Flags(lossy=True, alpha=True),
    default_target="jpg", reader="vips", writer=None,
    targets=plain("jpg", "png", "webp", "avif", "tiff"),
    tips=("HEIC is the default photo format on iPhones. Convert to JPG to open it anywhere.",),
)

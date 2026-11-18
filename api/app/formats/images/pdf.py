"""PDF. Input only. Every page becomes an image (several pages come as a ZIP)."""
from ..base import Flags, FormatSpec
from ..base import SettingField as F
from ..fields import sel
from ..groups import plain
from ..sniff import sig

SPEC = FormatSpec(
    slug="pdf", name="PDF", category="image",
    extensions=("pdf",), mime="application/pdf",
    sniff=sig(b"%PDF"),
    flags=Flags(multipage=True),
    default_target="jpg", reader="pdf", writer=None,
    targets=plain("jpg", "png", "webp", "tiff"),
    input_settings=(
        sel("pdf_dpi", "Resolution", [("72", "72 DPI"), ("150", "150 DPI"), ("300", "300 DPI")], "150", group="source"),
        F("pdf_pages", "Pages (all, or 1-3,5)", "text", "all", group="source"),
        sel("pdf_background", "Background", [("white", "White"), ("transparent", "Transparent")], "white", group="source", level="advanced"),
    ),
    tips=("Each page becomes one image. Several pages are delivered together in a ZIP file.",),
)

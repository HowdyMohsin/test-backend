"""TIFF."""
from ..base import Flags, FormatSpec
from ..fields import IMAGE_COMMON, sel
from ..groups import raster_targets
from ..sniff import tiff_header

SPEC = FormatSpec(
    slug="tiff", name="TIFF", category="image",
    extensions=("tiff", "tif"), mime="image/tiff",
    sniff=tiff_header,
    flags=Flags(alpha=True),
    default_target="jpg", reader="vips", writer="vips",
    targets=raster_targets("tiff"),
    output_settings=IMAGE_COMMON + (
        sel("tiff_compression", "Compression", [("lzw", "LZW (lossless)"), ("deflate", "Deflate (lossless)"),
            ("none", "None"), ("jpeg", "JPEG (smaller, lossy)")], "lzw"),
        sel("bit_depth", "Bit depth", [("8", "8-bit"), ("16", "16-bit")], "8", level="advanced"),
    ),
    tips=("TIFF is used for print and archives. Files are large.",),
)

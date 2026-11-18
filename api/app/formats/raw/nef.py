"""Nikon NEF camera RAW. Input only, developed with LibRaw (rawpy)."""
from ..base import Flags, FormatSpec
from ..groups import RAW_OUT, plain
from ..raw_settings import RAW_INPUT
from ..sniff import tiff_header

SPEC = FormatSpec(
    slug="nef", name="Nikon NEF", category="image", subgroup="raw",
    extensions=('nef',), mime="image/x-nikon-nef",
    sniff=tiff_header,
    flags=Flags(lossy=False),
    default_target="jpg", reader="raw", writer=None,
    targets=plain(*RAW_OUT),
    input_settings=RAW_INPUT,
    tiff_family=True,
    tips=("Camera RAW files are developed with the camera white balance by default.",),
)

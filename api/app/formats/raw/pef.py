"""Pentax PEF camera RAW. Input only, developed with LibRaw (rawpy)."""
from ..base import Flags, FormatSpec
from ..groups import RAW_OUT, plain
from ..raw_settings import RAW_INPUT
from ..sniff import tiff_header

SPEC = FormatSpec(
    slug="pef", name="Pentax PEF", category="image", subgroup="raw",
    extensions=('pef',), mime="image/x-pentax-pef",
    sniff=tiff_header,
    flags=Flags(lossy=False),
    default_target="jpg", reader="raw", writer=None,
    targets=plain(*RAW_OUT),
    input_settings=RAW_INPUT,
    tiff_family=True,
    tips=("Camera RAW files are developed with the camera white balance by default.",),
)

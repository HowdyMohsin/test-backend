"""Fujifilm RAF camera RAW. Input only, developed with LibRaw (rawpy)."""
from ..base import Flags, FormatSpec
from ..groups import RAW_OUT, plain
from ..raw_settings import RAW_INPUT
from ..sniff import sig

SPEC = FormatSpec(
    slug="raf", name="Fujifilm RAF", category="image", subgroup="raw",
    extensions=('raf',), mime="image/x-fuji-raf",
    sniff=sig(b"FUJIFILMCCD-RAW"),
    flags=Flags(lossy=False),
    default_target="jpg", reader="raw", writer=None,
    targets=plain(*RAW_OUT),
    input_settings=RAW_INPUT,
    tiff_family=False,
    tips=("Camera RAW files are developed with the camera white balance by default.",),
)

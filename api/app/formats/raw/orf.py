"""Olympus ORF camera RAW. Input only, developed with LibRaw (rawpy)."""
from ..base import Flags, FormatSpec
from ..groups import RAW_OUT, plain
from ..raw_settings import RAW_INPUT
from ..sniff import sig

SPEC = FormatSpec(
    slug="orf", name="Olympus ORF", category="image", subgroup="raw",
    extensions=('orf',), mime="image/x-olympus-orf",
    sniff=sig(b"IIRO", b"IIRS", b"MMOR"),
    flags=Flags(lossy=False),
    default_target="jpg", reader="raw", writer=None,
    targets=plain(*RAW_OUT),
    input_settings=RAW_INPUT,
    tiff_family=False,
    tips=("Camera RAW files are developed with the camera white balance by default.",),
)

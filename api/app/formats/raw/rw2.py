"""Panasonic RW2 camera RAW. Input only, developed with LibRaw (rawpy)."""
from ..base import Flags, FormatSpec
from ..groups import RAW_OUT, plain
from ..raw_settings import RAW_INPUT
from ..sniff import sig

SPEC = FormatSpec(
    slug="rw2", name="Panasonic RW2", category="image", subgroup="raw",
    extensions=('rw2',), mime="image/x-panasonic-rw2",
    sniff=sig(b"IIU\x00"),
    flags=Flags(lossy=False),
    default_target="jpg", reader="raw", writer=None,
    targets=plain(*RAW_OUT),
    input_settings=RAW_INPUT,
    tiff_family=False,
    tips=("Camera RAW files are developed with the camera white balance by default.",),
)

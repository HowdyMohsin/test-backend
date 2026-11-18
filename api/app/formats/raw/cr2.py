"""Canon CR2 camera RAW. Input only, developed with LibRaw (rawpy)."""
from ..base import Flags, FormatSpec
from ..groups import RAW_OUT, plain
from ..raw_settings import RAW_INPUT
from ..sniff import cr2

SPEC = FormatSpec(
    slug="cr2", name="Canon CR2", category="image", subgroup="raw",
    extensions=('cr2',), mime="image/x-canon-cr2",
    sniff=cr2,
    flags=Flags(lossy=False),
    default_target="jpg", reader="raw", writer=None,
    targets=plain(*RAW_OUT),
    input_settings=RAW_INPUT,
    tiff_family=False,
    tips=("Camera RAW files are developed with the camera white balance by default.",),
)

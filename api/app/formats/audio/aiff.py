"""AIFF audio."""
from ..base import Flags, FormatSpec
from ..fields import AUDIO_COMMON, BITRATES, num, rng, sel
from ..groups import audio_targets
from ..sniff import aiff

SPEC = FormatSpec(
    slug="aiff", name="AIFF", category="audio",
    extensions=('aiff', 'aif', 'aifc'), mime="audio/aiff",
    sniff=aiff,
    flags=Flags(lossy=False),
    default_target="mp3", reader="ffmpeg", writer="ffmpeg",
    targets=audio_targets("aiff"),
    output_settings=(
        sel("bit_depth", "Bit depth", [("16", "16-bit"), ("24", "24-bit"), ("32", "32-bit")], "16"),
    ) + AUDIO_COMMON,
    tips=("AIFF is uncompressed audio used on Apple systems.",),
)

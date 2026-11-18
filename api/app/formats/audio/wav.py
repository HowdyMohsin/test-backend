"""WAV audio."""
from ..base import Flags, FormatSpec
from ..fields import AUDIO_COMMON, BITRATES, num, rng, sel
from ..groups import audio_targets
from ..sniff import riff

SPEC = FormatSpec(
    slug="wav", name="WAV", category="audio",
    extensions=('wav',), mime="audio/wav",
    sniff=riff(b'WAVE'),
    flags=Flags(lossy=False),
    default_target="mp3", reader="ffmpeg", writer="ffmpeg",
    targets=audio_targets("wav"),
    output_settings=(
        sel("bit_depth", "Bit depth", [("16", "16-bit"), ("24", "24-bit"), ("32", "32-bit float")], "16"),
    ) + AUDIO_COMMON,
    tips=("WAV is uncompressed and gives large files.",),
)

"""M4A audio."""
from ..base import Flags, FormatSpec
from ..fields import AUDIO_COMMON, BITRATES, num, rng, sel
from ..groups import audio_targets
from ..sniff import ftyp

SPEC = FormatSpec(
    slug="m4a", name="M4A", category="audio",
    extensions=('m4a',), mime="audio/mp4",
    sniff=ftyp(b'M4A ', b'M4B '),
    flags=Flags(lossy=True),
    default_target="mp3", reader="ffmpeg", writer="ffmpeg",
    targets=audio_targets("m4a"),
    output_settings=(
        sel("bitrate", "Bitrate", BITRATES, "192"),
    ) + AUDIO_COMMON,
    tips=("M4A is AAC audio in an MP4 file, used by Apple devices.",),
)

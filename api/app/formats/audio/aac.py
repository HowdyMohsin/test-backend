"""AAC audio."""
from ..base import Flags, FormatSpec
from ..fields import AUDIO_COMMON, BITRATES, num, rng, sel
from ..groups import audio_targets
from ..sniff import aac_adts

SPEC = FormatSpec(
    slug="aac", name="AAC", category="audio",
    extensions=('aac',), mime="audio/aac",
    sniff=aac_adts,
    flags=Flags(lossy=True),
    default_target="mp3", reader="ffmpeg", writer="ffmpeg",
    targets=audio_targets("aac"),
    output_settings=(
        sel("bitrate", "Bitrate", BITRATES, "192"),
    ) + AUDIO_COMMON,
    tips=("AAC gives better quality than MP3 at the same size.",),
)

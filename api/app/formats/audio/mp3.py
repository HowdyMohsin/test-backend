"""MP3 audio."""
from ..base import Flags, FormatSpec
from ..fields import AUDIO_COMMON, BITRATES, num, rng, sel
from ..groups import audio_targets
from ..sniff import mp3

SPEC = FormatSpec(
    slug="mp3", name="MP3", category="audio",
    extensions=('mp3',), mime="audio/mpeg",
    sniff=mp3,
    flags=Flags(lossy=True),
    default_target="wav", reader="ffmpeg", writer="ffmpeg",
    targets=audio_targets("mp3"),
    output_settings=(
        sel("mp3_mode", "Mode", [("cbr", "Constant bitrate"), ("vbr", "Variable quality (VBR)")], "cbr"),
        sel("bitrate", "Bitrate", BITRATES, "192", show_if="mp3_mode=cbr"),
        sel("vbr_quality", "VBR quality (0 = best)", [(str(i), str(i)) for i in range(10)], "2", show_if="mp3_mode=vbr"),
    ) + AUDIO_COMMON,
    tips=("MP3 plays on almost every device. 192 kbps is a good balance.",),
)

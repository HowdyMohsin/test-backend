"""OPUS audio."""
from ..base import Flags, FormatSpec
from ..fields import AUDIO_COMMON, BITRATES, num, rng, sel
from ..groups import audio_targets
from ..sniff import ogg_opus

SPEC = FormatSpec(
    slug="opus", name="OPUS", category="audio",
    extensions=('opus',), mime="audio/opus",
    sniff=ogg_opus,
    flags=Flags(lossy=True),
    default_target="mp3", reader="ffmpeg", writer="ffmpeg",
    targets=audio_targets("opus"),
    output_settings=(
        num("bitrate", "Bitrate (kbps)", 128, 6, 510),
        sel("opus_application", "Optimized for", [("audio", "Music"), ("voip", "Voice")], "audio"),
    ) + AUDIO_COMMON,
    tips=("OPUS is the best choice for low bitrates and voice.",),
)

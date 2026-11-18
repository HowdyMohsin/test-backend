"""OGG audio."""
from ..base import Flags, FormatSpec
from ..fields import AUDIO_COMMON, BITRATES, num, rng, sel
from ..groups import audio_targets
from ..sniff import ogg_vorbis

SPEC = FormatSpec(
    slug="ogg", name="OGG", category="audio",
    extensions=('ogg', 'oga'), mime="audio/ogg",
    sniff=ogg_vorbis,
    flags=Flags(lossy=True),
    default_target="mp3", reader="ffmpeg", writer="ffmpeg",
    targets=audio_targets("ogg"),
    output_settings=(
        rng("ogg_quality", "Quality (-1 to 10)", 5, -1, 10),
    ) + AUDIO_COMMON,
    tips=("OGG Vorbis is an open format. Not every Apple app plays it.",),
)

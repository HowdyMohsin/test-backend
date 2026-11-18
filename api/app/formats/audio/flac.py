"""FLAC audio."""
from ..base import Flags, FormatSpec
from ..fields import AUDIO_COMMON, BITRATES, num, rng, sel
from ..groups import audio_targets
from ..sniff import sig

SPEC = FormatSpec(
    slug="flac", name="FLAC", category="audio",
    extensions=('flac',), mime="audio/flac",
    sniff=sig(b'fLaC'),
    flags=Flags(lossy=False),
    default_target="mp3", reader="ffmpeg", writer="ffmpeg",
    targets=audio_targets("flac"),
    output_settings=(
        rng("flac_compression", "Compression (0-8)", 5, 0, 8),
        sel("bit_depth", "Bit depth", [("16", "16-bit"), ("24", "24-bit")], "16", level="advanced"),
    ) + AUDIO_COMMON,
    tips=("FLAC is lossless and about half the size of WAV.",),
)

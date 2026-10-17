"""WAV format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, _sel

SPEC = FormatSpec(
    slug="wav",
    name="WAV",
    category="audio",
    extensions=('wav',),
    mime="audio/wav",
    magic=(
        ((0, b'RIFF'), (8, b'WAVE'),),
    ),
    reader="ffmpeg",
    writer="ffmpeg",
    targets=(
        "mp3",
        "flac",
        "aac",
        "ogg",
        "m4a",
        "opus",
        "aiff"
    ),
    output_settings=(
        _sel("bit_depth", "Bit depth", ("16", "24"), "16"),
    ),
    flags=(),
)

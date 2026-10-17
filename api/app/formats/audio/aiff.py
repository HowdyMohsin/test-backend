"""AIFF format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, _sel

SPEC = FormatSpec(
    slug="aiff",
    name="AIFF",
    category="audio",
    extensions=('aif', 'aiff'),
    mime="audio/aiff",
    magic=(
        ((0, b'FORM'), (8, b'AIFF'),),
        ((0, b'FORM'), (8, b'AIFC'),),
    ),
    reader="ffmpeg",
    writer="ffmpeg",
    targets=(
        "mp3",
        "wav",
        "flac",
        "aac",
        "ogg",
        "m4a",
        "opus"
    ),
    output_settings=(
        _sel("bit_depth", "Bit depth", ("16", "24"), "16"),
    ),
    flags=(),
)

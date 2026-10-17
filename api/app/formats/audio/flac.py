"""FLAC format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, _range

SPEC = FormatSpec(
    slug="flac",
    name="FLAC",
    category="audio",
    extensions=('flac',),
    mime="audio/flac",
    magic=(
        ((0, b'fLaC'),),
    ),
    reader="ffmpeg",
    writer="ffmpeg",
    targets=(
        "mp3",
        "wav",
        "aac",
        "ogg",
        "m4a",
        "opus",
        "aiff"
    ),
    output_settings=(
        _range("compression", "Compression level", 5, 0, 8),
    ),
    flags=(),
)

"""OGG format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, _range

SPEC = FormatSpec(
    slug="ogg",
    name="OGG",
    category="audio",
    extensions=('ogg',),
    mime="audio/ogg",
    magic=(
        ((0, b'OggS'),),
    ),
    reader="ffmpeg",
    writer="ffmpeg",
    targets=(
        "mp3",
        "wav",
        "flac",
        "aac",
        "m4a",
        "opus",
        "aiff"
    ),
    output_settings=(
        _range("quality", "Quality", 6, 0, 10, "Vorbis quality scale"),
    ),
    flags=("lossy",),
)

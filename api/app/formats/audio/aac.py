"""AAC format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, _sel

SPEC = FormatSpec(
    slug="aac",
    name="AAC",
    category="audio",
    extensions=('aac',),
    mime="audio/aac",
    magic=(
        ((0, b'\xff\xf1'),),
        ((0, b'\xff\xf9'),),
    ),
    reader="ffmpeg",
    writer="ffmpeg",
    targets=(
        "mp3",
        "wav",
        "flac",
        "ogg",
        "m4a",
        "opus",
        "aiff"
    ),
    output_settings=(
        _sel("bitrate", "Bitrate", ("128k", "192k", "256k"), "192k"),
    ),
    flags=("lossy",),
)

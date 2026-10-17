"""MP3 format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, _sel

SPEC = FormatSpec(
    slug="mp3",
    name="MP3",
    category="audio",
    extensions=('mp3',),
    mime="audio/mpeg",
    magic=(
        ((0, b'ID3'),),
        ((0, b'\xff\xfb'),),
        ((0, b'\xff\xf3'),),
        ((0, b'\xff\xf2'),),
    ),
    reader="ffmpeg",
    writer="ffmpeg",
    targets=(
        "wav",
        "flac",
        "aac",
        "ogg",
        "m4a",
        "opus",
        "aiff"
    ),
    output_settings=(
        _sel("bitrate", "Bitrate", ("128k", "192k", "256k", "320k"), "192k"),
    ),
    flags=("lossy",),
)

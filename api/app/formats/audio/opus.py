"""OPUS format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, _sel

SPEC = FormatSpec(
    slug="opus",
    name="OPUS",
    category="audio",
    extensions=('opus',),
    mime="audio/opus",
    magic=(
        ((0, b'OggS'),),
    ),
    magic_contains=(b'OpusHead',),
    reader="ffmpeg",
    writer="ffmpeg",
    targets=(
        "mp3",
        "wav",
        "flac",
        "aac",
        "ogg",
        "m4a",
        "aiff"
    ),
    output_settings=(
        _sel("bitrate", "Bitrate", ("64k", "96k", "128k", "192k"), "128k"),
    ),
    flags=("lossy",),
)

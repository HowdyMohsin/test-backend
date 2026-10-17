"""M4A format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, _sel

SPEC = FormatSpec(
    slug="m4a",
    name="M4A",
    category="audio",
    extensions=('m4a',),
    mime="audio/mp4",
    magic=(
        ((4, b'ftypM4A '),),
        ((4, b'ftypmp42'),),
        ((4, b'ftypisom'),),
    ),
    reader="ffmpeg",
    writer="ffmpeg",
    targets=(
        "mp3",
        "wav",
        "flac",
        "aac",
        "ogg",
        "opus",
        "aiff"
    ),
    output_settings=(
        _sel("bitrate", "Bitrate", ("128k", "192k", "256k"), "192k"),
    ),
    flags=("lossy",),
)

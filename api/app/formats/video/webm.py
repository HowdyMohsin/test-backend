"""WebM format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, _range, _sel

SPEC = FormatSpec(
    slug="webm",
    name="WebM",
    category="video",
    extensions=('webm',),
    mime="video/webm",
    magic=(
        ((0, b'\x1aE\xdf\xa3'),),
    ),
    magic_contains=(b'webm',),
    reader="ffmpeg",
    writer="ffmpeg",
    targets=(
        "mp4",
        "mov",
        "mkv",
        "avi",
        "wmv",
        "mp3",
        "wav",
        "aac",
        "m4a",
        "ogg",
        "gif"
    ),
    output_settings=(
        _range("crf", "Quality (CRF)", 23, 18, 30, "Lower = better quality, bigger file"),
        _sel("preset", "Speed preset", ("ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow"), "medium"),
        _range("width", "Width (px, 0 = keep)", 0, 0, 3840),
        _range("fps", "FPS (0 = keep)", 0, 0, 120),
    ),
    flags=(),
)

"""WMV format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, _range, _sel

SPEC = FormatSpec(
    slug="wmv",
    name="WMV",
    category="video",
    extensions=('wmv',),
    mime="video/x-ms-wmv",
    magic=(
        ((0, b'0&\xb2u\x8ef\xcf\x11\xa6\xd9\x00\xaa\x00b\xcel'),),
    ),
    reader="ffmpeg",
    writer="ffmpeg",
    targets=(
        "mp4",
        "mov",
        "mkv",
        "avi",
        "webm",
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

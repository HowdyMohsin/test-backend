"""MP4 format declaration — declares truth only, does no work."""
from __future__ import annotations

from app.formats.base import FormatSpec, _range, _sel

SPEC = FormatSpec(
    slug="mp4",
    name="MP4",
    category="video",
    extensions=('mp4',),
    mime="video/mp4",
    magic=(
        ((4, b'ftypisom'),),
        ((4, b'ftypmp41'),),
        ((4, b'ftypmp42'),),
        ((4, b'ftypavc1'),),
    ),
    reader="ffmpeg",
    writer="ffmpeg",
    targets=(
        "mov",
        "mkv",
        "avi",
        "webm",
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

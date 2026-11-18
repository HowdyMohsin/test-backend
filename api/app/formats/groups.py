"""Target lists shared by format files. The 210 pairs come from these plus each file's own targets."""
from __future__ import annotations

from .base import PairSpec

RASTER = ("jpg", "png", "webp", "avif", "gif", "tiff")
RAW_OUT = ("jpg", "png", "webp", "tiff")
AUDIO = ("mp3", "wav", "flac", "aac", "ogg", "m4a", "opus", "aiff")
VIDEO = ("mp4", "mov", "mkv", "avi", "webm", "wmv")
VIDEO_TO_AUDIO = ("mp3", "wav", "aac", "m4a", "ogg")
TRACED = PairSpec(label="Vectorized (traced)", route="trace",
                  note="This is a traced vector copy, not an exact conversion.")


def raster_targets(me: str) -> dict[str, PairSpec]:
    t = {s: PairSpec() for s in RASTER if s != me}
    t["svg"] = TRACED
    return t


def plain(*slugs: str) -> dict[str, PairSpec]:
    return {s: PairSpec() for s in slugs}


def audio_targets(me: str) -> dict[str, PairSpec]:
    return plain(*[s for s in AUDIO if s != me])

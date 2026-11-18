"""MKV video."""
from ..base import Flags, FormatSpec, PairSpec
from ..fields import VIDEO_COMMON, VIDEO_TO_GIF, num, rng, CRF_H264, SPEED
from ..groups import VIDEO, VIDEO_TO_AUDIO, plain
from ..sniff import ebml

SPEC = FormatSpec(
    slug="mkv", name="MKV", category="video",
    extensions=('mkv',), mime="video/x-matroska",
    sniff=ebml(b'matroska'),
    flags=Flags(lossy=True),
    default_target="mp4", reader="ffmpeg", writer="ffmpeg",
    targets={
        **plain(*[s for s in VIDEO if s != "mkv"]),
        **plain(*VIDEO_TO_AUDIO),
        "gif": PairSpec(label="Animated GIF", settings=VIDEO_TO_GIF),
    },
    output_settings=VIDEO_COMMON + (SPEED, CRF_H264,),
    tips=("MKV can hold many audio and subtitle tracks.",),
)

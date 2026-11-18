"""WMV video."""
from ..base import Flags, FormatSpec, PairSpec
from ..fields import VIDEO_COMMON, VIDEO_TO_GIF, num, rng
from ..groups import VIDEO, VIDEO_TO_AUDIO, plain
from ..sniff import asf

SPEC = FormatSpec(
    slug="wmv", name="WMV", category="video",
    extensions=('wmv', 'asf'), mime="video/x-ms-wmv",
    sniff=asf,
    flags=Flags(lossy=True),
    default_target="mp4", reader="ffmpeg", writer="ffmpeg",
    targets={
        **plain(*[s for s in VIDEO if s != "wmv"]),
        **plain(*VIDEO_TO_AUDIO),
        "gif": PairSpec(label="Animated GIF", settings=VIDEO_TO_GIF),
    },
    output_settings=VIDEO_COMMON + (num("video_bitrate", "Video bitrate (kbps)", 2500, 200, 20000, group="video"),),
    tips=("WMV is a Windows Media format.",),
)

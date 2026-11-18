"""AVI video."""
from ..base import Flags, FormatSpec, PairSpec
from ..fields import VIDEO_COMMON, VIDEO_TO_GIF, num, rng
from ..groups import VIDEO, VIDEO_TO_AUDIO, plain
from ..sniff import riff

SPEC = FormatSpec(
    slug="avi", name="AVI", category="video",
    extensions=('avi',), mime="video/x-msvideo",
    sniff=riff(b'AVI '),
    flags=Flags(lossy=True),
    default_target="mp4", reader="ffmpeg", writer="ffmpeg",
    targets={
        **plain(*[s for s in VIDEO if s != "avi"]),
        **plain(*VIDEO_TO_AUDIO),
        "gif": PairSpec(label="Animated GIF", settings=VIDEO_TO_GIF),
    },
    output_settings=VIDEO_COMMON + (num("video_bitrate", "Video bitrate (kbps)", 2500, 200, 20000, group="video"),),
    tips=("AVI is an old format with large files.",),
)

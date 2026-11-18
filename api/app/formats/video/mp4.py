"""MP4 video."""
from ..base import Flags, FormatSpec, PairSpec
from ..fields import VIDEO_COMMON, VIDEO_TO_GIF, num, rng, CRF_H264, FASTSTART, SPEED
from ..groups import VIDEO, VIDEO_TO_AUDIO, plain
from ..sniff import ftyp

SPEC = FormatSpec(
    slug="mp4", name="MP4", category="video",
    extensions=('mp4', 'm4v'), mime="video/mp4",
    sniff=ftyp(b'isom', b'iso2', b'iso4', b'iso5', b'iso6', b'mp41', b'mp42', b'avc1', b'dash', b'M4V ', b'mmp4', b'MSNV'),
    flags=Flags(lossy=True),
    default_target="mp3", reader="ffmpeg", writer="ffmpeg",
    targets={
        **plain(*[s for s in VIDEO if s != "mp4"]),
        **plain(*VIDEO_TO_AUDIO),
        "gif": PairSpec(label="Animated GIF", settings=VIDEO_TO_GIF),
    },
    output_settings=VIDEO_COMMON + (SPEED, CRF_H264, FASTSTART,),
    tips=("MP4 (H.264) plays almost everywhere.",),
)

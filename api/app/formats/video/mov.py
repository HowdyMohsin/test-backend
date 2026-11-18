"""MOV video."""
from ..base import Flags, FormatSpec, PairSpec
from ..fields import VIDEO_COMMON, VIDEO_TO_GIF, num, rng, CRF_H264, FASTSTART, SPEED
from ..groups import VIDEO, VIDEO_TO_AUDIO, plain
from ..sniff import ftyp

SPEC = FormatSpec(
    slug="mov", name="MOV", category="video",
    extensions=('mov', 'qt'), mime="video/quicktime",
    sniff=ftyp(b'qt  '),
    flags=Flags(lossy=True),
    default_target="mp4", reader="ffmpeg", writer="ffmpeg",
    targets={
        **plain(*[s for s in VIDEO if s != "mov"]),
        **plain(*VIDEO_TO_AUDIO),
        "gif": PairSpec(label="Animated GIF", settings=VIDEO_TO_GIF),
    },
    output_settings=VIDEO_COMMON + (SPEED, CRF_H264, FASTSTART,),
    tips=("MOV is Apple's QuickTime format. Convert to MP4 for wider support.",),
)

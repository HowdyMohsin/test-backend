"""WebM video."""
from ..base import Flags, FormatSpec, PairSpec
from ..fields import VIDEO_COMMON, VIDEO_TO_GIF, num, rng, SPEED
from ..groups import VIDEO, VIDEO_TO_AUDIO, plain
from ..sniff import ebml

SPEC = FormatSpec(
    slug="webm", name="WebM", category="video",
    extensions=('webm',), mime="video/webm",
    sniff=ebml(b'webm'),
    flags=Flags(lossy=True),
    default_target="mp4", reader="ffmpeg", writer="ffmpeg",
    targets={
        **plain(*[s for s in VIDEO if s != "webm"]),
        **plain(*VIDEO_TO_AUDIO),
        "gif": PairSpec(label="Animated GIF", settings=VIDEO_TO_GIF),
    },
    output_settings=VIDEO_COMMON + (SPEED, rng("crf", "Quality (lower = better)", 32, 15, 40, group="video"),),
    tips=("WebM (VP9) is made for the web.",),
)

"""Sample files for the selfcheck. Most are generated on the fly; RAW, PSD and HEIC need a real file
dropped in data/samples/<slug>/ (free RAW samples: raw.pixls.us)."""
from __future__ import annotations

import subprocess
from pathlib import Path

import pyvips
from PIL import Image, ImageDraw

from ..formats import registry
from ..settings import get_settings

_S = get_settings()
ROOT = (_S.samples_dir or _S.data_dir / "samples").resolve()
GEN = _S.data_dir.resolve() / "generated_samples"
_AUDIO = {"mp3": ["-c:a", "libmp3lame"], "wav": ["-c:a", "pcm_s16le"], "flac": ["-c:a", "flac"], "aac": ["-c:a", "aac", "-f", "adts"],
          "ogg": ["-c:a", "libvorbis"], "m4a": ["-c:a", "aac", "-f", "ipod"], "opus": ["-c:a", "libopus", "-f", "opus"],
          "aiff": ["-c:a", "pcm_s16be", "-f", "aiff"]}
_VIDEO = {"mp4": ["-c:v", "libx264", "-c:a", "aac"], "mov": ["-c:v", "libx264", "-c:a", "aac", "-f", "mov"],
          "mkv": ["-c:v", "libx264", "-c:a", "aac"], "avi": ["-c:v", "mpeg4", "-c:a", "libmp3lame"],
          "webm": ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "40", "-c:a", "libopus"], "wmv": ["-c:v", "wmv2", "-c:a", "wmav2"]}


def _base_png(path: Path) -> None:
    im = Image.new("RGBA", (640, 480), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for y in range(480):
        d.line([(0, y), (640, y)], fill=(y // 2, 90, 255 - y // 2, 255))
    d.ellipse((120, 100, 360, 340), fill=(255, 40, 40, 140))
    d.rectangle((380, 160, 560, 380), fill=(20, 200, 90, 255))
    im.save(path)
    flat = Image.new("RGB", im.size, (255, 255, 255))
    flat.paste(im, mask=im.getchannel("A"))
    flat.save(path.with_name("_base_flat.png"))


def _ffmpeg(args: list[str], out: Path) -> None:
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args, str(out)], check=True, timeout=120)


def _make_dng(out: Path) -> None:
    """A tiny synthetic DNG (not a real camera file) so the RAW code path can be exercised."""
    import numpy as np
    from pidng.core import RAW2DNG, DNGTags, Tag
    from pidng.defs import (CalibrationIlluminant, CFAPattern, DNGVersion, Orientation, PhotometricInterpretation, PreviewColorSpace)

    w, h = 256, 192
    yy, xx = np.mgrid[0:h, 0:w]
    raw = (400 + 3000 * (xx / w) * (0.5 + 0.5 * np.sin(yy / 20))).astype(np.uint16)
    t = DNGTags()
    for tag, val in [(Tag.ImageWidth, w), (Tag.ImageLength, h), (Tag.TileWidth, w), (Tag.TileLength, h),
                     (Tag.Orientation, Orientation.Horizontal), (Tag.PhotometricInterpretation, PhotometricInterpretation.Color_Filter_Array),
                     (Tag.SamplesPerPixel, 1), (Tag.BitsPerSample, [16]), (Tag.CFARepeatPatternDim, [2, 2]), (Tag.CFAPattern, CFAPattern.RGGB),
                     (Tag.BlackLevel, [0]), (Tag.WhiteLevel, [4095]), (Tag.CalibrationIlluminant1, CalibrationIlluminant.D65),
                     (Tag.AsShotNeutral, [[1, 1], [1, 1], [1, 1]]),
                     (Tag.ColorMatrix1, [[1, 1], [0, 1], [0, 1], [0, 1], [1, 1], [0, 1], [0, 1], [0, 1], [1, 1]]),
                     (Tag.DNGVersion, DNGVersion.V1_4), (Tag.DNGBackwardVersion, DNGVersion.V1_2), (Tag.Make, "QIC"),
                     (Tag.Model, "Synthetic"), (Tag.PreviewColorSpace, PreviewColorSpace.sRGB)]:
        t.set(tag, val)
    r = RAW2DNG()
    r.options(t, path=str(out.parent), compress=False)
    r.convert(raw, filename=out.stem)


def _make(slug: str, out: Path) -> bool:
    GEN.mkdir(parents=True, exist_ok=True)
    base = GEN / "_base.png"
    if not base.exists() or not (GEN / "_base_flat.png").exists():
        _base_png(base)
    spec = registry.formats()[slug]
    if slug == "png":
        out.write_bytes(base.read_bytes())
    elif slug in ("jpg", "webp", "avif", "tiff"):
        img = pyvips.Image.new_from_file(str(base))
        if slug == "jpg":
            img.flatten(background=[255, 255, 255]).jpegsave(str(out), Q=90)
        elif slug == "webp":
            img.webpsave(str(out), Q=85)
        elif slug == "avif":
            img.heifsave(str(out), compression="av1", Q=60)
        else:
            img.tiffsave(str(out))
    elif slug == "gif":
        frames = []
        for i in range(3):
            f = Image.new("RGB", (320, 240), (40 * i, 80, 200 - 40 * i))
            ImageDraw.Draw(f).ellipse((40 + 50 * i, 60, 140 + 50 * i, 160), fill=(255, 220, 0))
            frames.append(f)
        frames[0].save(out, save_all=True, append_images=frames[1:], duration=150, loop=0)
    elif slug == "svg":
        out.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">'
                       '<rect width="320" height="240" fill="#1e40af"/><circle cx="160" cy="120" r="70" fill="#3b82f6"/>'
                       '<rect x="120" y="90" width="80" height="60" fill="#fff"/></svg>')
    elif slug == "pdf":
        pages = [Image.open(GEN / "_base_flat.png"), Image.new("RGB", (640, 480), (230, 230, 250))]
        pages[0].save(out, save_all=True, append_images=pages[1:])
    elif slug == "heic":
        pyvips.Image.new_from_file(str(base)).flatten(background=[255, 255, 255]).heifsave(str(out), compression="hevc", Q=70)
    elif slug == "dng":
        _make_dng(out)
    elif slug == "psd":
        from psd_tools import PSDImage
        PSDImage.frompil(Image.open(base)).save(str(out))
    elif slug in _AUDIO:
        _ffmpeg(["-f", "lavfi", "-i", "sine=frequency=440:duration=3", *_AUDIO[slug]], out)
    elif slug in _VIDEO:
        _ffmpeg(["-f", "lavfi", "-i", "testsrc2=size=320x240:rate=15", "-f", "lavfi", "-i", "sine=frequency=440",
                 "-t", "3", "-pix_fmt", "yuv420p", *_VIDEO[slug]], out)
    else:
        return False
    return out.exists() and out.stat().st_size > 0


def sample_for(slug: str) -> Path | None:
    real = ROOT / slug
    if real.is_dir():
        exts = set(registry.formats()[slug].extensions)
        files = sorted(p for p in real.iterdir() if p.is_file() and p.suffix.lstrip(".").lower() in exts)
        if files:
            return files[0]
    spec = registry.formats()[slug]
    out = GEN / f"{slug}.{spec.ext}"
    if out.exists() and out.stat().st_size > 0:
        return out
    try:
        return out if _make(slug, out) else None
    except Exception:  # noqa: BLE001 - a sample we cannot make simply means the pair stays in testing
        out.unlink(missing_ok=True)
        return None

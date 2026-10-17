"""vips engine: libvips (+libheif) for raster images and HEIC input."""

from __future__ import annotations

from pathlib import Path
from typing import Callable

from app.engines.base import EngineNotAvailableError, JobContext

try:
    import pyvips

    _HAS_VIPS = True
except ImportError:
    _HAS_VIPS = False


def _load(path: Path, from_format: str):
    # n=-1 loads all frames/pages (animated GIF, multipage TIFF)
    opts: dict = {"access": "sequential", "n": -1} if from_format in ("gif", "tiff") else {"access": "sequential"}
    img = pyvips.Image.new_from_file(str(path), **opts)
    try:
        img = img.autorot()  # apply EXIF orientation on every output (spec 3)
    except Exception:
        pass
    return img


def _save(img, out: Path, to_format: str, settings: dict) -> None:
    s = settings or {}
    kw: dict = {}
    if s.get("strip_metadata"):
        kw["strip"] = True
    if to_format == "jpg":
        if img.hasalpha():
            img = img.flatten(background=s.get("background", "#ffffff"))
        kw["Q"] = int(s.get("quality", 85))
        if s.get("progressive"):
            kw["interlace"] = True
        img.write_to_file(str(out), **kw)
    elif to_format == "png":
        kw["compression"] = int(s.get("compression", 6))
        img.write_to_file(str(out), **kw)
    elif to_format == "webp":
        kw["Q"] = int(s.get("quality", 85))
        if s.get("lossless"):
            kw["lossless"] = True
        img.write_to_file(str(out), **kw)
    elif to_format == "avif":
        kw["Q"] = int(s.get("quality", 80))
        img.write_to_file(str(out), **kw)
    elif to_format == "gif":
        # single frame for image sources (spec 3: animation kept only gif->webp)
        if img.get("page-height") if "page-height" in img.get_fields() else 0:
            img = img.crop(0, 0, img.width, img.get("page-height"))
        img.write_to_file(str(out), **kw)
    elif to_format == "tiff":
        comp = s.get("compression", "lzw")
        kw["compression"] = comp if comp != "none" else "none"
        img.write_to_file(str(out), **kw)
    else:
        raise ValueError(f"vips engine cannot write {to_format}")


def run(ctx: JobContext, progress: Callable[[float], None]) -> Path:
    if not _HAS_VIPS:
        raise EngineNotAvailableError("pyvips/libvips is not installed")
    progress(0.1)
    img = _load(ctx.input_path, ctx.from_format)
    # pixel-limit guard (spec 4.7)
    if img.width * img.height > 100_000_000:
        raise ValueError("pixel_limit: image exceeds 100 megapixels")
    progress(0.4)
    ctx.output_path.parent.mkdir(parents=True, exist_ok=True)
    _save(img, ctx.output_path, ctx.to_format, ctx.settings)
    progress(0.9)
    return ctx.output_path

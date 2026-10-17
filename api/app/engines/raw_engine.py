"""raw engine: rawpy (LibRaw) -> 8-bit sRGB -> vips encodes the target."""

from __future__ import annotations

from pathlib import Path
from typing import Callable

from app.engines.base import EngineNotAvailableError, EngineError, JobContext
from app.engines import vips_engine


def run(ctx: JobContext, progress: Callable[[float], None]) -> Path:
    try:
        import rawpy
    except ImportError as exc:
        raise EngineNotAvailableError("rawpy (LibRaw) is not installed") from exc
    if not vips_engine._HAS_VIPS:
        raise EngineNotAvailableError("pyvips/libvips is not installed")
    try:
        import pyvips
    except ImportError as exc:
        raise EngineNotAvailableError("pyvips/libvips is not installed") from exc
    progress(0.1)
    try:
        with rawpy.imread(str(ctx.input_path)) as raw:
            # camera white balance, 8-bit sRGB output (spec 3)
            rgb = raw.postprocess(
                use_camera_wb=True,
                output_bps=8,
                output_color=rawpy.ColorSpace.sRGB,
                no_auto_bright=False,
            )
    except Exception as exc:
        raise EngineError(f"cannot decode RAW file: {exc}") from exc
    progress(0.5)
    h, w, _ = rgb.shape
    if w * h > 100_000_000:
        raise EngineError("pixel_limit: image exceeds 100 megapixels")
    tmp_png = ctx.output_path.with_suffix(".raw.png")
    ctx.output_path.parent.mkdir(parents=True, exist_ok=True)
    img = pyvips.Image.new_from_memory(rgb.tobytes(), w, h, 3, "uchar")
    img.write_to_file(str(tmp_png))
    progress(0.7)
    out_img = vips_engine._load(tmp_png, "png")
    vips_engine._save(out_img, ctx.output_path, ctx.to_format, ctx.settings)
    tmp_png.unlink(missing_ok=True)
    progress(0.9)
    return ctx.output_path

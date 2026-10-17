"""psd engine: psd-tools flattens PSD -> vips encodes the target."""

from __future__ import annotations

from pathlib import Path
from typing import Callable

from app.engines.base import EngineNotAvailableError, EngineError, JobContext
from app.engines import vips_engine
from app.settings import settings


def run(ctx: JobContext, progress: Callable[[float], None]) -> Path:
    try:
        from psd_tools import PSDImage
    except ImportError as exc:
        raise EngineNotAvailableError("psd-tools is not installed") from exc
    if not vips_engine._HAS_VIPS:
        raise EngineNotAvailableError("pyvips/libvips is not installed")
    progress(0.1)
    try:
        psd = PSDImage.open(str(ctx.input_path))
    except Exception as exc:
        raise EngineError(f"cannot parse PSD: {exc}") from exc
    if psd.width > settings.psd_max_dim or psd.height > settings.psd_max_dim:
        raise EngineError("PSD dimensions exceed the allowed cap")
    progress(0.3)
    # Prefer the embedded Photoshop composite; fall back to layer flatten.
    pil_img = psd.composite() or psd.topil()
    if pil_img is None:
        raise EngineError("PSD has no renderable composite")
    tmp_png = ctx.output_path.with_suffix(".psd-flat.png")
    ctx.output_path.parent.mkdir(parents=True, exist_ok=True)
    pil_img.save(str(tmp_png))
    progress(0.6)
    img = vips_engine._load(tmp_png, "png")
    vips_engine._save(img, ctx.output_path, ctx.to_format, ctx.settings)
    tmp_png.unlink(missing_ok=True)
    progress(0.9)
    return ctx.output_path

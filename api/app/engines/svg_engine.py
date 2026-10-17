"""svg engine: resvg renders SVG -> PNG, then vips encodes the target."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Callable

from app.engines.base import EngineNotAvailableError, EngineError, JobContext
from app.engines import vips_engine


def run(ctx: JobContext, progress: Callable[[float], None]) -> Path:
    resvg = shutil.which("resvg")
    if not resvg:
        raise EngineNotAvailableError("resvg binary is not installed")
    if not vips_engine._HAS_VIPS:
        raise EngineNotAvailableError("pyvips/libvips is not installed")
    tmp_png = ctx.output_path.with_suffix(".svg-render.png")
    ctx.output_path.parent.mkdir(parents=True, exist_ok=True)
    # render at a sane width; resvg keeps aspect ratio
    width = int(ctx.settings.get("render_width", 2048) or 2048)
    progress(0.1)
    try:
        subprocess.run(
            [resvg, str(ctx.input_path), str(tmp_png), "-w", str(width)],
            check=True,
            capture_output=True,
            timeout=max(30, ctx.timeout_sec / 2),
        )
    except subprocess.TimeoutExpired as exc:
        raise EngineError(f"resvg timed out: {exc}") from exc
    except subprocess.CalledProcessError as exc:
        raise EngineError(f"resvg failed: {exc.stderr.decode(errors='replace')[:500]}") from exc
    progress(0.5)
    img = vips_engine._load(tmp_png, "png")
    vips_engine._save(img, ctx.output_path, ctx.to_format, ctx.settings)
    tmp_png.unlink(missing_ok=True)
    progress(0.9)
    return ctx.output_path

"""trace engine: vtracer vectorizes raster -> SVG (spec 3: input capped at 2048px)."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Callable

from app.engines.base import EngineNotAvailableError, EngineError, JobContext
from app.engines import vips_engine


def run(ctx: JobContext, progress: Callable[[float], None]) -> Path:
    vtracer = shutil.which("vtracer")
    if not vtracer:
        raise EngineNotAvailableError("vtracer binary is not installed")
    if not vips_engine._HAS_VIPS:
        raise EngineNotAvailableError("pyvips/libvips is not installed")
    max_size = int(ctx.settings.get("max_size", 2048) or 2048)
    color_mode = str(ctx.settings.get("color_mode", "color"))
    progress(0.1)
    img = vips_engine._load(ctx.input_path, ctx.from_format)
    scale = min(1.0, max_size / max(img.width, img.height))
    if scale < 1.0:
        img = img.resize(scale)
    tmp_png = ctx.output_path.with_suffix(".trace-in.png")
    ctx.output_path.parent.mkdir(parents=True, exist_ok=True)
    img.write_to_file(str(tmp_png))
    progress(0.4)
    args = [
        vtracer,
        "--input", str(tmp_png),
        "--output", str(ctx.output_path),
        "--color-mode", color_mode,
        "--hierarchical", "stacked",
    ]
    try:
        subprocess.run(args, check=True, capture_output=True, timeout=ctx.timeout_sec)
    except subprocess.TimeoutExpired as exc:
        raise EngineError(f"vtracer timed out: {exc}") from exc
    except subprocess.CalledProcessError as exc:
        raise EngineError(f"vtracer failed: {exc.stderr.decode(errors='replace')[:500]}") from exc
    finally:
        tmp_png.unlink(missing_ok=True)
    progress(0.9)
    return ctx.output_path

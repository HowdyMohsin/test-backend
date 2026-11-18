"""Raster -> SVG tracing with vtracer. The result is a traced copy, never an exact one."""
from __future__ import annotations

from pathlib import Path

import pyvips
import vtracer

from .common import EngineError
from .vips_engine import load

PRESETS = {
    "photo": dict(mode="spline", filter_speckle=4, color_precision=8, layer_difference=16, corner_threshold=60),
    "logo": dict(mode="spline", filter_speckle=8, color_precision=6, layer_difference=32, corner_threshold=60),
    "lineart": dict(mode="spline", filter_speckle=4, color_precision=6, layer_difference=16, corner_threshold=60, colormode="binary"),
    "pixel": dict(mode="none", filter_speckle=0, color_precision=8, layer_difference=8, corner_threshold=60),
}


def trace(src: Path, out_svg: Path, tmp: Path, s: dict) -> None:
    img = load(src, False).autorot()
    biggest = int(s.get("max_size", 2048))
    if max(img.width, img.height) > biggest:
        img = img.resize(biggest / max(img.width, img.height), kernel="lanczos3")
    if img.interpretation not in ("srgb", "b-w"):
        img = img.colourspace("srgb")
    if img.format != "uchar":
        img = img.cast("uchar")
    png = tmp / "trace-in.png"
    img.pngsave(str(png))
    opts = dict(PRESETS[s.get("trace_preset", "logo")])
    if s.get("trace_mode") == "binary":
        opts["colormode"] = "binary"
    opts.setdefault("colormode", "color")
    for k in ("filter_speckle", "color_precision", "layer_difference", "corner_threshold"):
        if s.get(k) is not None:
            opts[k] = int(s[k])
    try:
        vtracer.convert_image_to_svg_py(str(png), str(out_svg), hierarchical="stacked", length_threshold=4.0,
                                        max_iterations=10, splice_threshold=45, path_precision=6, **opts)
    except Exception as e:
        raise EngineError("convert_failed", "The image could not be traced.") from e
    if not out_svg.exists() or out_svg.stat().st_size == 0:
        raise EngineError("convert_failed", "Tracing produced an empty file.")

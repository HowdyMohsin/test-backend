"""SVG -> PNG with resvg. External resources are never loaded."""
from __future__ import annotations

import tempfile
from pathlib import Path

import resvg_py

from .common import EngineError


def render(src: Path, out_png: Path, s: dict) -> Path:
    kw: dict = {"svg_path": str(src), "dpi": float(s.get("svg_dpi", 96)), "skip_system_fonts": False}
    width = int(s.get("svg_width") or 0)
    if width:
        kw["width"] = width
    bg = s.get("svg_background", "transparent")
    if bg and bg != "transparent":
        kw["background"] = bg
    try:
        with tempfile.TemporaryDirectory() as empty:
            kw["resources_dir"] = empty
            data = resvg_py.svg_to_bytes(**kw)
    except Exception as e:  # resvg raises ValueError for bad input
        raise EngineError("corrupt_file", "This SVG could not be read.") from e
    out_png.write_bytes(data)
    return out_png

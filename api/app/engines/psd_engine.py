"""PSD -> flattened PNG with psd-tools."""
from __future__ import annotations

import struct
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage

from .common import EngineError


def flatten(src: Path, out_png: Path, s: dict, max_pixels: int) -> Path:
    with open(src, "rb") as f:
        head = f.read(26)
    if len(head) >= 22:
        h, w = struct.unpack(">II", head[14:22])
        if w * h > max_pixels:
            raise EngineError("pixel_limit", f"This image is too large ({w}x{h}).")
    try:
        img = PSDImage.open(str(src)).composite().convert("RGBA")
    except Exception as e:
        raise EngineError("corrupt_file", "This PSD file could not be read.") from e
    bg = s.get("psd_background", "transparent")
    if bg and bg != "transparent":
        base = Image.new("RGBA", img.size, bg)
        base.alpha_composite(img)
        img = base
    img.save(out_png)
    return out_png

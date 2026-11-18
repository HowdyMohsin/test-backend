"""Camera RAW -> developed PNG with LibRaw (rawpy)."""
from __future__ import annotations

from pathlib import Path

import pyvips
import rawpy

from .common import EngineError

_NOISE = {"off": rawpy.FBDDNoiseReductionMode.Off, "light": rawpy.FBDDNoiseReductionMode.Light, "full": rawpy.FBDDNoiseReductionMode.Full}
_HL = {"clip": rawpy.HighlightMode.Clip, "blend": rawpy.HighlightMode.Blend, "recover": rawpy.HighlightMode.ReconstructDefault}


def develop(src: Path, out_png: Path, s: dict, dst: str) -> Path:
    bits = 16 if str(s.get("raw_bit_depth", "8")) == "16" and dst in ("png", "tiff") else 8
    wb = s.get("raw_wb", "camera")
    try:
        with rawpy.imread(str(src)) as raw:
            rgb = raw.postprocess(
                use_camera_wb=wb == "camera", use_auto_wb=wb == "auto",
                bright=2 ** float(s.get("raw_brightness", 0)),
                highlight_mode=_HL[s.get("raw_highlight", "clip")],
                fbdd_noise_reduction=_NOISE[s.get("raw_noise", "off")],
                output_bps=bits, no_auto_bright=False,
            )
    except Exception as e:
        raise EngineError("corrupt_file", "This RAW file could not be developed. It may be damaged or from an unsupported camera.") from e
    h, w, bands = rgb.shape
    img = pyvips.Image.new_from_memory(rgb.tobytes(), w, h, bands, "ushort" if bits == 16 else "uchar")
    img = img.copy(interpretation="rgb16" if bits == 16 else "srgb")
    img.pngsave(str(out_png), bitdepth=16 if bits == 16 else 8)
    return out_png

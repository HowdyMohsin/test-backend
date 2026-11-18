"""Turns one job spec into output files. Every route ends in vips (images) or FFmpeg (media)."""
from __future__ import annotations

import shutil
import zipfile
from pathlib import Path

from . import ffmpeg_engine, pdf_engine, psd_engine, raw_engine, svg_engine, trace_engine, vips_engine
from .common import EngineError, progress
from .probe import media_info


def run(spec: dict) -> dict:
    src, out_dir = Path(spec["src"]), Path(spec["out_dir"])
    stem, dst, ext, route, s = spec["stem"], spec["dst"], spec["dst_ext"], spec["route"], spec["settings"]
    lim = spec.get("limits", {})
    tmp = out_dir / "_tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    notes: list[str] = []
    outs: list[Path] = []
    meta: dict = {}
    try:
        progress(2)
        if route in ("raster", "svg", "psd", "pdf", "raw"):
            if route == "raster":
                inputs, src_slug = [src], spec["src_slug"]
            else:
                src_slug = "png"
                if route == "svg":
                    inputs = [svg_engine.render(src, tmp / "in.png", s)]
                elif route == "psd":
                    inputs = [psd_engine.flatten(src, tmp / "in.png", s, lim.get("max_pixels", 100_000_000))]
                elif route == "pdf":
                    inputs = pdf_engine.render(src, tmp, s, lim.get("max_pdf_pages", 50), lim.get("max_pixels", 100_000_000))
                else:
                    inputs = [raw_engine.develop(src, tmp / "in.png", s, dst)]
            progress(50)
            for i, p in enumerate(inputs):
                name = f"{stem}.{ext}" if len(inputs) == 1 else f"{stem}-{i + 1:03d}.{ext}"
                meta = vips_engine.convert(p, dst, s, out_dir / name, src_slug, notes)
                outs.append(out_dir / name)
                progress(50 + 45 * (i + 1) / len(inputs))
            if len(outs) > 1:
                z = out_dir / f"{stem}.zip"
                with zipfile.ZipFile(z, "w", zipfile.ZIP_STORED) as zf:
                    for p in outs:
                        zf.write(p, p.name)
                for p in outs:
                    p.unlink()
                notes.append(f"{len(outs)} pages were saved together in one ZIP file.")
                outs, meta = [z], {"pages": len(inputs)}
        elif route == "trace":
            out = out_dir / f"{stem}.svg"
            progress(10)
            trace_engine.trace(src, out, tmp, s)
            outs = [out]
            notes.append("Vectorized (traced): a vector approximation of the image, not an exact copy.")
        elif route in ("ffmpeg_audio", "ffmpeg_video", "ffmpeg_gif"):
            out = out_dir / f"{stem}.{ext}"
            ffmpeg_engine.run(src, dst, route, s, out, notes)
            outs = [out]
            info = media_info(out)
            meta = {"duration": info.get("duration"), "width": info.get("width"), "height": info.get("height")}
        else:
            raise EngineError("internal", f"Unknown route {route}")
        progress(100)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return {"outputs": [{"path": str(p), "name": p.name, "size": p.stat().st_size} for p in outs], "meta": meta, "notes": notes}

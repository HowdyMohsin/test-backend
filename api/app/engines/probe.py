"""Reads file facts (size in pixels, duration, codecs). Used at upload time and by FFmpeg jobs."""
from __future__ import annotations

import json
import struct
import subprocess
from pathlib import Path

import pyvips


def media_info(path: Path) -> dict:
    cmd = ["ffprobe", "-v", "error", "-protocol_whitelist", "file", "-show_entries",
           "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate", "-of", "json", str(path)]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=True).stdout
        data = json.loads(out)
    except (subprocess.SubprocessError, ValueError):
        return {"duration": 0.0, "has_video": False, "has_audio": False, "valid": False}
    streams = data.get("streams", [])
    v = next((s for s in streams if s.get("codec_type") == "video" and s.get("codec_name") not in ("mjpeg", "png", "bmp")), None)
    a = next((s for s in streams if s.get("codec_type") == "audio"), None)
    try:
        dur = float(data.get("format", {}).get("duration") or 0)
    except ValueError:
        dur = 0.0
    return {"valid": True, "duration": round(dur, 2), "has_video": v is not None, "has_audio": a is not None,
            "vcodec": v.get("codec_name") if v else None, "acodec": a.get("codec_name") if a else None,
            "width": v.get("width") if v else None, "height": v.get("height") if v else None}


def image_info(path: Path) -> dict:
    img = pyvips.Image.new_from_file(str(path))
    pages = img.get("n-pages") if img.get_typeof("n-pages") else 1
    ph = img.get("page-height") if img.get_typeof("page-height") else img.height
    fields = img.get_fields()
    return {"width": img.width, "height": ph, "has_alpha": bool(img.hasalpha()), "animated": pages > 1, "frames": pages,
            "has_gps": any(f.startswith("exif-ifd3-") for f in fields), "has_exif": "exif-data" in fields}


def psd_info(path: Path) -> dict:
    with open(path, "rb") as f:
        head = f.read(26)
    h, w = struct.unpack(">II", head[14:22])
    return {"width": w, "height": h, "has_alpha": True, "animated": False}


def pdf_info(path: Path) -> dict:
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(str(path))
    w, h = pdf[0].get_size()
    return {"pages": len(pdf), "width": round(w), "height": round(h), "has_alpha": False, "animated": False}


def raw_info(path: Path) -> dict:
    import rawpy
    with rawpy.imread(str(path)) as raw:
        return {"width": raw.sizes.width, "height": raw.sizes.height, "has_alpha": False, "animated": False}


def file_info(path: Path, slug: str, category: str) -> dict:
    """Never raises: a failure means the file is unreadable, reported as {'valid': False}."""
    try:
        if category in ("audio", "video"):
            return media_info(path)
        if slug == "svg":
            return {"valid": True, "has_alpha": True, "animated": False}
        if slug == "psd":
            return {"valid": True, **psd_info(path)}
        if slug == "pdf":
            return {"valid": True, **pdf_info(path)}
        if slug in ("cr2", "nef", "arw", "dng", "rw2", "orf", "pef", "raf"):
            return {"valid": True, **raw_info(path)}
        return {"valid": True, **image_info(path)}
    except Exception:
        return {"valid": False}

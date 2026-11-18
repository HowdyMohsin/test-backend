"""python -m app.cli verify-engines: proves every engine works in THIS environment (run it inside Docker)."""
from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path


def run() -> list[tuple[str, bool, str]]:
    out: list[tuple[str, bool, str]] = []

    def check(name, fn):
        try:
            out.append((name, True, str(fn() or "")))
        except Exception as e:  # noqa: BLE001
            out.append((name, False, f"{type(e).__name__}: {str(e)[:90]}"))

    tmp = Path(tempfile.mkdtemp())
    import pyvips
    img = pyvips.Image.black(64, 64, bands=3).copy(interpretation="srgb")
    check("libvips version", lambda: f"{pyvips.version(0)}.{pyvips.version(1)}.{pyvips.version(2)}")
    for fmt, call in {"JPEG save": lambda: img.jpegsave(str(tmp / "a.jpg")), "PNG save": lambda: img.pngsave(str(tmp / "a.png")),
                      "WebP save": lambda: img.webpsave(str(tmp / "a.webp")), "TIFF save": lambda: img.tiffsave(str(tmp / "a.tif")),
                      "GIF save": lambda: img.gifsave(str(tmp / "a.gif")),
                      "AVIF encode (av1)": lambda: img.heifsave(str(tmp / "a.avif"), compression="av1"),
                      "HEIC encode (hevc, only to make test samples)": lambda: img.heifsave(str(tmp / "a.heic"), compression="hevc")}.items():
        check(fmt, call)
    check("AVIF decode", lambda: pyvips.Image.new_from_file(str(tmp / "a.avif")).width)
    check("HEIC decode", lambda: pyvips.Image.new_from_file(str(tmp / "a.heic")).width)
    check("PNG palette (reduce colors)", lambda: img.pngsave(str(tmp / "p.png"), palette=True, colours=16))

    def enc(names):
        txt = subprocess.run(["ffmpeg", "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
        missing = [n for n in names if f" {n} " not in txt]
        if missing:
            raise RuntimeError("missing encoders: " + ", ".join(missing))
        return "all present"
    check("FFmpeg encoders", lambda: enc(["libx264", "libvpx-vp9", "libopus", "libmp3lame", "libvorbis", "aac", "flac", "wmv2", "wmav2", "mpeg4", "gif"]))
    check("FFmpeg runs", lambda: subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=d=1", "-y", str(tmp / "t.mp4")], check=True, timeout=60) and "ok")
    import resvg_py
    check("resvg (SVG)", lambda: len(resvg_py.svg_to_bytes(svg_string='<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')))
    import vtracer, rawpy, pypdfium2, psd_tools  # noqa: F401
    check("vtracer", lambda: vtracer.__name__)
    check("rawpy / LibRaw", lambda: rawpy.libraw_version)
    check("pypdfium2", lambda: pypdfium2.PDFIUM_INFO.version if hasattr(pypdfium2, "PDFIUM_INFO") else "ok")
    check("psd-tools", lambda: psd_tools.__version__)
    return out

"""libvips: load, transform and save JPG/PNG/WebP/AVIF/GIF/TIFF (HEIC is read through libheif)."""
from __future__ import annotations

import math
from pathlib import Path

import pyvips

from .common import EngineError

_KEEP = pyvips.enums.ForeignKeep
_ANIM = {"gif", "webp"}


def _hex(c: str) -> list[int]:
    c = (c or "#ffffff").lstrip("#")
    return [int(c[i : i + 2], 16) for i in (0, 2, 4)]


def load(path: Path, animated: bool) -> pyvips.Image:
    try:
        return pyvips.Image.new_from_file(str(path), n=-1) if animated else pyvips.Image.new_from_file(str(path))
    except pyvips.Error as e:
        raise EngineError("corrupt_file", "This file could not be opened. It may be damaged.") from e


def _frames(img):
    ph = img.get("page-height") if img.get_typeof("page-height") else img.height
    n = max(1, img.height // ph)
    return [img.crop(0, i * ph, img.width, ph) for i in range(n)], n


def _join(frames, template):
    out = pyvips.Image.arrayjoin(frames, across=1).copy()
    out.set_type(pyvips.GValue.gint_type, "page-height", frames[0].height)
    for key in ("delay", "loop"):
        if template.get_typeof(key):
            out.set_type(template.get_typeof(key), key, template.get(key))
    return out


def _resize(img, s):
    mode = s.get("resize_mode", "none")
    if mode == "none":
        return img
    w, h = img.width, img.height
    if mode == "percent":
        sc = (s.get("percent") or 100) / 100
        return img if abs(sc - 1) < 1e-3 else img.resize(sc, kernel="lanczos3")
    tw, th = s.get("width"), s.get("height")
    if not tw and not th:
        return img
    if mode == "exact" and not s.get("keep_aspect", True):
        hs, vs = (tw or w) / w, (th or h) / h
        if s.get("no_upscale", True):
            hs, vs = min(hs, 1), min(vs, 1)
        return img.resize(hs, vscale=vs, kernel="lanczos3")
    ratios = [r for r in ((tw / w) if tw else None, (th / h) if th else None) if r]
    if mode == "fill" and tw and th:
        sc = max(ratios)
    else:
        sc = min(ratios)
    if s.get("no_upscale", True) and sc > 1:
        sc = 1
    out = img if abs(sc - 1) < 1e-3 else img.resize(sc, kernel="lanczos3")
    if mode == "fill" and tw and th:
        cw, ch = min(tw, out.width), min(th, out.height)
        out = out.crop((out.width - cw) // 2, (out.height - ch) // 2, cw, ch)
    return out


def _ops(img, s):
    if s.get("auto_orient", True):
        img = img.autorot()
    img = _resize(img, s)
    rot = int(s.get("rotate", 0) or 0)
    if rot:
        img = img.rot({90: "d90", 180: "d180", 270: "d270"}[rot])
    flip = s.get("flip", "none")
    if flip == "h":
        img = img.fliphor()
    elif flip == "v":
        img = img.flipver()
    if s.get("grayscale"):
        img = img.colourspace("b-w")
    return img


def _profile(img, s):
    if s.get("color_profile", "srgb") != "srgb":
        return img
    try:
        if img.interpretation == "cmyk" or img.get_typeof("icc-profile-data"):
            img = img.icc_transform("srgb", embedded=True)
        elif img.interpretation not in ("srgb", "b-w", "rgb16", "grey16"):
            img = img.colourspace("srgb")
    except pyvips.Error:
        try:
            img = img.colourspace("srgb")
        except pyvips.Error:
            pass
    if img.get_typeof("icc-profile-data"):
        img = img.copy()
        img.remove("icc-profile-data")  # pixels are sRGB now; no need to carry a profile
    return img


def _metadata(img, s):
    if s.get("metadata") == "strip_gps":
        img = img.copy()
        for name in img.get_fields():
            if name.startswith("exif-ifd3-") or name == "gps-data":
                img.remove(name)
    return img


def _depth(img, want16: bool):
    if want16 and img.format == "uchar":
        return img.colourspace("rgb16" if img.bands >= 3 else "grey16")
    if not want16 and img.format in ("ushort", "uint", "float", "double"):
        if img.format == "ushort":
            return img.cast("uchar", shift=True)
        return img.cast("uchar")
    return img


def _kwargs(dst: str, s: dict, q: int | None = None) -> tuple[str, dict]:
    keep = _KEEP.NONE if s.get("metadata") == "strip_all" else _KEEP.ALL
    quality = q if q is not None else int(s.get("quality", 80))
    if dst == "jpg":
        return "jpegsave", dict(Q=quality, interlace=bool(s.get("progressive")), optimize_coding=bool(s.get("optimize", True)),
                                subsample_mode="off" if s.get("subsample") == "444" else "on", keep=keep)
    if dst == "webp":
        return "webpsave", dict(Q=quality, lossless=bool(s.get("lossless")), effort=int(s.get("effort", 4)),
                                near_lossless=bool(s.get("near_lossless")), keep=keep)
    if dst == "avif":
        return "heifsave", dict(compression="av1", Q=quality, lossless=bool(s.get("lossless")), effort=int(s.get("effort", 4)),
                                subsample_mode="off" if s.get("subsample") == "444" else "on",
                                bitdepth=int(s.get("bit_depth", 8)), keep=keep)
    raise KeyError(dst)


def _fit_size(img, dst: str, s: dict, kb: int, notes: list[str]) -> int:
    """Highest quality whose output stays under kb. Eight bisection steps."""
    lo, hi, best = 1, 100, 1
    for _ in range(8):
        mid = (lo + hi) // 2
        meth, kw = _kwargs(dst, s, mid)
        size = len(getattr(img, meth + "_buffer")(**kw))
        if size <= kb * 1024:
            best, lo = mid, mid + 1
        else:
            hi = mid - 1
        if lo > hi:
            break
    meth, kw = _kwargs(dst, s, best)
    if len(getattr(img, meth + "_buffer")(**kw)) > kb * 1024:
        notes.append(f"Could not get under {kb} KB even at the lowest quality. Try a smaller size.")
    else:
        notes.append(f"Quality set to {best} to fit under {kb} KB.")
    return best


def convert(src: Path, dst: str, s: dict, out: Path, src_slug: str, notes: list[str]) -> dict:
    animated = src_slug in _ANIM and dst in _ANIM and bool(s.get("keep_animation", True) or dst == "gif")
    img = load(src, animated)
    n_frames = 1
    if animated:
        try:
            frames, n_frames = _frames(img)
        except pyvips.Error:
            frames, n_frames = [img], 1
        if n_frames > 1:
            img = _join([_ops(f, s) for f in frames], img)
        else:
            img, animated = _ops(img, s), False
    else:
        img = _ops(img, s)
    img = _profile(img, s)
    img = _metadata(img, s)
    if s.get("dpi"):
        img = img.copy(xres=s["dpi"] / 25.4, yres=s["dpi"] / 25.4)
    want16 = str(s.get("bit_depth", "8")) == "16" and dst in ("png", "tiff")
    img = _depth(img, want16)
    keep = _KEEP.NONE if s.get("metadata") == "strip_all" else _KEEP.ALL
    try:
        if dst == "jpg":
            if img.hasalpha():
                img = img.flatten(background=_hex(s.get("background", "#ffffff")))
            if img.bands == 2:
                img = img.extract_band(0)
            kb = int(s.get("target_size_kb") or 0)
            q = _fit_size(img, "jpg", s, kb, notes) if kb else None
            meth, kw = _kwargs("jpg", s, q)
            img.jpegsave(str(out), **kw)
        elif dst in ("webp", "avif"):
            kb = int(s.get("target_size_kb") or 0)
            q = _fit_size(img, dst, s, kb, notes) if kb and not (dst == "webp" and s.get("lossless")) and n_frames == 1 else None
            meth, kw = _kwargs(dst, s, q)
            getattr(img, meth)(str(out), **kw)
        elif dst == "png":
            kw = dict(compression=int(s.get("png_compression", 6)), interlace=bool(s.get("interlace")), keep=keep)
            if want16:
                kw["bitdepth"] = 16
            if s.get("reduce_colors"):
                kw.update(palette=True, colours=int(s.get("png_colors", 256)), dither=1.0 if s.get("png_dither", True) else 0.0)
            try:
                img.pngsave(str(out), **kw)
            except pyvips.Error:
                if not kw.pop("palette", None):
                    raise
                kw.pop("colours", None)
                kw.pop("dither", None)
                notes.append("Color reduction is not available here; saved full color.")
                img.pngsave(str(out), **kw)
        elif dst == "gif":
            colors = int(s.get("gif_colors", 256))
            if img.format != "uchar":
                img = img.cast("uchar")
            if img.hasalpha():
                # GIF has only on/off transparency. Blend half-transparent pixels into white so edges look right.
                a = img.extract_band(img.bands - 1)
                rgb = img.extract_band(0, n=img.bands - 1)
                blended = (rgb * a / 255 + 255 * (255 - a) / 255).cast("uchar")
                img = blended.bandjoin(((a >= 128) * 255).cast("uchar"))
            if animated and n_frames > 1:
                img = img.copy()
                if s.get("gif_delay_ms"):
                    img.set_type(pyvips.GValue.array_int_type, "delay", [int(s["gif_delay_ms"])] * n_frames)
                img.set_type(pyvips.GValue.gint_type, "loop", 0 if s.get("gif_loop", "inf") == "inf" else 1)
            img.gifsave(str(out), bitdepth=max(1, min(8, math.ceil(math.log2(max(2, colors))))),
                        dither=1.0 if s.get("gif_dither", True) else 0.0)
        elif dst == "tiff":
            comp = s.get("tiff_compression", "lzw")
            if comp == "jpeg" and img.hasalpha():
                img = img.flatten(background=[255, 255, 255])
            kw = dict(compression=comp, keep=keep)
            if comp in ("lzw", "deflate"):
                kw["predictor"] = "horizontal"
            if want16:
                kw["bitdepth"] = 16
            img.tiffsave(str(out), **kw)
        else:
            raise EngineError("unsupported_format", f"Cannot write {dst}.")
    except pyvips.Error as e:
        raise EngineError("convert_failed", f"The image could not be saved as {dst.upper()}.") from e
    chk = pyvips.Image.new_from_file(str(out))
    return {"width": chk.width, "height": chk.get("page-height") if chk.get_typeof("page-height") else chk.height}

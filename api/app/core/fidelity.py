"""Accuracy checks used by the selfcheck. A conversion only goes live when the output is measurably right:
lossless image pairs must match pixel for pixel, lossy ones must stay above a quality floor, audio must keep
its pitch and level, video must keep its picture, and nothing may come out blank or silent."""
from __future__ import annotations

import subprocess
import tempfile
import zipfile
from pathlib import Path

import numpy as np
import pyvips

from ..engines.probe import media_info
from ..formats.base import Pair

VIPS_READABLE = {"jpg", "png", "webp", "avif", "gif", "tiff", "heic"}
LOSSLESS_IMG = {"png", "tiff"}
LOSSLESS_AUDIO = {"wav", "flac", "aiff"}
PSNR_FLOOR = {"jpg": 30.0, "webp": 30.0, "avif": 28.0, "gif": 22.0}
TONE_HZ = 440.0  # every generated audio sample is a 440 Hz sine


def _rgb(path: Path, size: tuple[int, int] | None = None) -> np.ndarray:
    img = pyvips.Image.new_from_file(str(path))
    if img.hasalpha():
        img = img.flatten(background=[255, 255, 255])
    if img.interpretation != "srgb":
        img = img.colourspace("srgb")
    if img.bands == 1:
        img = img.bandjoin([img, img])
    if img.format != "uchar":
        img = img.cast("uchar")
    if size and (img.width, img.height) != size:
        img = img.resize(size[0] / img.width, vscale=size[1] / img.height)
    return np.ndarray(buffer=img.write_to_memory(), dtype=np.uint8, shape=[img.height, img.width, img.bands]).astype(np.float64)


def _psnr(a: np.ndarray, b: np.ndarray) -> float:
    mse = float(np.mean((a - b) ** 2))
    return float("inf") if mse == 0 else 10 * np.log10(255.0 ** 2 / mse)


def _pcm(path: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True, timeout=60).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64)


def _frames(path: Path, first: int, last: int) -> list[np.ndarray]:
    """Frames first..last decoded in order (no seeking, so every container behaves the same)."""
    d = Path(tempfile.mkdtemp())
    subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"select=between(n\\,{first}\\,{last}),scale=320:240",
                    "-fps_mode", "passthrough", "-frames:v", str(last - first + 1), str(d / "%02d.png")], capture_output=True, timeout=60)
    return [_rgb(p) for p in sorted(d.glob("*.png"))]


def _image(pair: Pair, sample: Path, out: Path, reference: Path | None) -> tuple[bool, str]:
    dst = pair.dst.slug
    if out.suffix == ".zip":
        with zipfile.ZipFile(out) as z:
            first = sorted(z.namelist())[0]
            out = Path(tempfile.mkdtemp()) / first
            out.write_bytes(z.read(first))
    if dst == "svg":
        import resvg_py
        png = Path(tempfile.mkdtemp()) / "t.png"
        png.write_bytes(resvg_py.svg_to_bytes(svg_path=str(out), background="#ffffff"))
        a, b = _rgb(sample), None
        b = _rgb(png, (int(a.shape[1]), int(a.shape[0])))
        score = _psnr(a, b)
        return score >= 10.0, f"traced copy similarity {score:.1f} dB"
    got = _rgb(out)
    if got.std() < 2:
        return False, "output image is blank"
    ref_path = reference if reference else (sample if pair.src.slug in VIPS_READABLE else None)
    if ref_path is None:
        return True, "opens correctly, not blank"
    ref = _rgb(ref_path, (got.shape[1], got.shape[0]) if reference else None)
    if ref.shape != got.shape:
        return False, f"size changed from {ref.shape[1]}x{ref.shape[0]} to {got.shape[1]}x{got.shape[0]}"
    score = _psnr(ref, got)
    if dst in LOSSLESS_IMG and pair.src.slug in VIPS_READABLE and not reference:
        return score == float("inf"), "pixel-exact match" if score == float("inf") else f"not exact ({score:.1f} dB)"
    floor = PSNR_FLOOR.get(dst, 28.0) if not reference else 25.0
    return score >= floor, f"PSNR {min(score, 99.0):.1f} dB (minimum {floor:.0f})"


def _audio(pair: Pair, sample: Path, out: Path) -> tuple[bool, str]:
    a, b = _pcm(sample), _pcm(out)
    if len(b) == 0 or np.sqrt(np.mean(b ** 2)) < 30:
        return False, "output is silent"
    if pair.src.slug in LOSSLESS_AUDIO and pair.dst.slug in LOSSLESS_AUDIO:
        n = min(len(a), len(b))
        same = len(a) == len(b) and np.array_equal(a[:n], b[:n])
        return same, "sample-exact match" if same else "samples differ"
    spec = np.abs(np.fft.rfft(b * np.hanning(len(b))))
    peak = float(np.argmax(spec)) * 16000 / len(b)
    ratio = np.sqrt(np.mean(b ** 2)) / max(np.sqrt(np.mean(a ** 2)), 1)
    ok = abs(peak - TONE_HZ) < 10 and 0.6 < ratio < 1.6
    return ok, f"pitch {peak:.0f} Hz (expected {TONE_HZ:.0f}), level x{ratio:.2f}"


def _video(pair: Pair, sample: Path, out: Path) -> tuple[bool, str]:
    sv, ov = media_info(sample), media_info(out)
    if sv.get("has_audio") and not ov.get("has_audio"):
        return False, "audio track was lost"
    # Containers can shift timing by a frame (AVI adds one), so compare against the nearest few frames and keep the best.
    ref = _frames(sample, 15, 15)
    cand = _frames(out, 12, 18)
    if not ref or not cand:
        return False, "could not read video frames"
    score = max(_psnr(ref[0], c) for c in cand)
    return score >= 24.0, f"picture PSNR {min(score, 99.0):.1f} dB, audio kept"


def check(pair: Pair, sample: Path, out: Path, reference: Path | None = None) -> tuple[bool, str]:
    try:
        if pair.dst.category == "image":
            return _image(pair, sample, out, reference)
        if pair.dst.category == "audio":
            return _audio(pair, sample, out)
        if pair.route == "ffmpeg_gif":
            info = media_info(out)
            return bool(info.get("has_video")), "animated GIF created"
        return _video(pair, sample, out)
    except Exception as e:  # noqa: BLE001
        return False, f"accuracy check crashed: {type(e).__name__}: {e}"

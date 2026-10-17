"""ffmpeg engine: audio<->audio, video<->video, video->audio, video->GIF.

Fixed argument lists only (never shell=True). Network protocols disabled.
Progress via `-progress pipe:1`. Video->GIF uses the 2-pass palette method.
"""

from __future__ import annotations

import asyncio
import json
import re
import shutil
from pathlib import Path
from typing import Callable

from app.engines.base import EngineNotAvailableError, EngineError, JobContext
from app.formats.base import AUDIO_SLUGS, VIDEO_SLUGS

# target slug -> (audio codec, extra audio args builder key)
_AUDIO_CODECS: dict[str, list[str]] = {
    "mp3": ["-c:a", "libmp3lame"],
    "wav": ["-c:a", "pcm_s16le"],
    "flac": ["-c:a", "flac"],
    "aac": ["-c:a", "aac"],
    "ogg": ["-c:a", "libvorbis"],
    "m4a": ["-c:a", "aac"],
    "opus": ["-c:a", "libopus"],
    "aiff": ["-c:a", "pcm_s16le"],
}

# target slug -> (video codec args, audio codec args)
_VIDEO_CODECS: dict[str, tuple[list[str], list[str]]] = {
    "mp4": (["-c:v", "libx264", "-pix_fmt", "yuv420p"], ["-c:a", "aac"]),
    "mov": (["-c:v", "libx264", "-pix_fmt", "yuv420p"], ["-c:a", "aac"]),
    "mkv": (["-c:v", "libx264", "-pix_fmt", "yuv420p"], ["-c:a", "aac"]),
    "avi": (["-c:v", "mpeg4", "-pix_fmt", "yuv420p"], ["-c:a", "libmp3lame"]),
    "webm": (["-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p"], ["-c:a", "libopus"]),
    "wmv": (["-c:v", "wmv2"], ["-c:a", "wmav2"]),
}


def _bin(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise EngineNotAvailableError(f"{name} binary is not installed")
    return path


async def _probe(path: Path) -> dict:
    ffprobe = _bin("ffprobe")
    proc = await asyncio.create_subprocess_exec(
        ffprobe, "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", str(path),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    out, _ = await proc.communicate()
    if proc.returncode != 0:
        raise EngineError("ffprobe could not read the media file (corrupt?)")
    try:
        return json.loads(out.decode())
    except json.JSONDecodeError as exc:
        raise EngineError("ffprobe returned invalid data") from exc


def _duration(probe: dict) -> float:
    try:
        return float(probe["format"].get("duration") or 0)
    except (KeyError, ValueError, TypeError):
        return 0.0


def _audio_args(to_format: str, settings: dict) -> list[str]:
    args = list(_AUDIO_CODECS[to_format])
    s = settings or {}
    if to_format == "mp3" or to_format == "aac" or to_format == "m4a" or to_format == "opus":
        args += ["-b:a", str(s.get("bitrate", "192k"))]
    elif to_format == "wav" or to_format == "aiff":
        bits = str(s.get("bit_depth", "16"))
        codec = "pcm_s24le" if bits == "24" else "pcm_s16le"
        args[1] = codec
    elif to_format == "flac":
        args += ["-compression_level", str(int(s.get("compression", 5)))]
    elif to_format == "ogg":
        args += ["-q:a", str(int(s.get("quality", 6)))]
    return args


def _video_filter(settings: dict) -> str | None:
    s = settings or {}
    parts: list[str] = []
    width = int(s.get("width", 0) or 0)
    if width > 0:
        parts.append(f"scale={width}:-2")
    fps = float(s.get("fps", 0) or 0)
    if fps > 0:
        parts.append(f"fps={fps}")
    return ",".join(parts) or None


async def _run_ffmpeg(
    args: list[str],
    progress: Callable[[float], None],
    duration: float,
    timeout: float,
) -> None:
    ffmpeg = _bin("ffmpeg")
    full = [ffmpeg, "-hide_banner", "-nostdin", "-y",
            "-protocol_whitelist", "file,pipe", *args]
    proc = await asyncio.create_subprocess_exec(
        *full, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    progress(0.15)

    async def watch() -> None:
        assert proc.stdout is not None
        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            m = re.match(rb"out_time_ms=(\d+)", line.strip())
            if m and duration > 0:
                ms = int(m.group(1)) / 1_000_000
                progress(0.15 + 0.75 * min(1.0, ms / duration))

    try:
        await asyncio.wait_for(watch(), timeout=timeout)
        _, err = await asyncio.wait_for(proc.communicate(), timeout=30)
    except asyncio.TimeoutError as exc:
        proc.kill()
        raise EngineError(f"ffmpeg timed out after {timeout:.0f}s") from exc
    if proc.returncode != 0:
        msg = (err or b"").decode(errors="replace")[-800:]
        raise EngineError(f"ffmpeg failed: {msg}")


async def _convert_async(ctx: JobContext, progress: Callable[[float], None]) -> Path:
    src = ctx.input_path
    dst = ctx.output_path
    dst.parent.mkdir(parents=True, exist_ok=True)
    probe = await _probe(src)
    duration = _duration(probe)
    s = ctx.settings or {}
    from_cat = "video" if ctx.from_format in VIDEO_SLUGS else "audio"
    to_format = ctx.to_format

    if from_cat == "audio" and to_format in AUDIO_SLUGS:
        args = ["-i", str(src), "-vn", *_audio_args(to_format, s),
                "-progress", "pipe:1", str(dst)]
        await _run_ffmpeg(args, progress, duration, ctx.timeout_sec)
        return dst

    if from_cat == "video" and to_format in VIDEO_SLUGS:
        vcodec, acodec = _VIDEO_CODECS[to_format]
        vf = _video_filter(s)
        args = ["-i", str(src), *vcodec,
                "-crf", str(int(s.get("crf", 23))),
                "-preset", str(s.get("preset", "medium")),
                *acodec, "-b:a", "160k"]
        if vf:
            args += ["-vf", vf]
        args += ["-progress", "pipe:1", str(dst)]
        await _run_ffmpeg(args, progress, duration, ctx.timeout_sec)
        return dst

    if from_cat == "video" and to_format in AUDIO_SLUGS:
        args = ["-i", str(src), "-vn", *_audio_args(to_format, s),
                "-progress", "pipe:1", str(dst)]
        await _run_ffmpeg(args, progress, duration, ctx.timeout_sec)
        return dst

    if from_cat == "video" and to_format == "gif":
        # 2-pass palette (spec 3)
        fps = int(s.get("fps", 15) or 15)
        width = int(s.get("width", 480) or 480)
        vf = f"fps={fps},scale={width}:-1:flags=lanczos"
        palette = dst.parent / f"{dst.stem}.palette.png"
        try:
            args1 = ["-i", str(src), "-vf", f"{vf},palettegen", "-y", "-progress", "pipe:1", str(palette)]
            await _run_ffmpeg(args1, lambda f: progress(f * 0.45), duration, ctx.timeout_sec / 2)
            args2 = ["-i", str(src), "-i", str(palette),
                     "-lavfi", f"{vf} [x]; [x][1:v] paletteuse",
                     "-y", "-progress", "pipe:1", str(dst)]
            await _run_ffmpeg(args2, lambda f: progress(0.45 + f * 0.45), duration, ctx.timeout_sec / 2)
        finally:
            palette.unlink(missing_ok=True)
        return dst

    raise EngineError(f"ffmpeg cannot handle {ctx.from_format} -> {to_format}")


def run(ctx: JobContext, progress: Callable[[float], None]) -> Path:
    # run_isolated executes this in a child process; the coroutine runs there.
    return asyncio.run(_convert_async(ctx, progress))

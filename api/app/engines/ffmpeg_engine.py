"""FFmpeg: audio<->audio, video<->video, video->audio, video->GIF, with a fast remux path."""
from __future__ import annotations

import subprocess
from pathlib import Path

from .common import EngineError, progress
from .probe import media_info

_COPY_OK = {
    "mp4": ({"h264", "hevc", "mpeg4", "av1"}, {"aac", "mp3", "ac3"}),
    "mov": ({"h264", "hevc", "mpeg4", "prores", "mjpeg"}, {"aac", "pcm_s16le", "pcm_s24le", "alac"}),
    "mkv": ({"h264", "hevc", "vp8", "vp9", "av1", "mpeg4", "mpeg2video", "theora"},
            {"aac", "mp3", "ac3", "opus", "vorbis", "flac", "pcm_s16le", "eac3"}),
    "avi": ({"mpeg4", "mjpeg", "msmpeg4v3"}, {"mp3", "ac3", "pcm_s16le"}),
    "webm": ({"vp8", "vp9", "av1"}, {"vorbis", "opus"}),
    "wmv": ({"wmv1", "wmv2", "wmv3", "vc1"}, {"wmav1", "wmav2", "wmapro"}),
}
_PCM = {"wav": {"16": "pcm_s16le", "24": "pcm_s24le", "32": "pcm_f32le"}, "aiff": {"16": "pcm_s16be", "24": "pcm_s24be", "32": "pcm_s32be"}}


def _f(s: dict, key: str, default: float = 0.0) -> float:
    try:
        return float(s.get(key) or default)
    except (TypeError, ValueError):
        return default


def _audio_codec(dst: str, s: dict) -> list[str]:
    br = f"{s.get('bitrate', 192)}k"
    if dst == "mp3":
        q = ["-b:a", br] if s.get("mp3_mode", "cbr") == "cbr" else ["-q:a", str(s.get("vbr_quality", 2))]
        return ["-c:a", "libmp3lame", *q, "-id3v2_version", "3"]
    if dst in _PCM:
        return ["-c:a", _PCM[dst][str(s.get("bit_depth", 16))], "-f", dst if dst == "aiff" else "wav"]
    if dst == "flac":
        extra = ["-sample_fmt", "s32", "-bits_per_raw_sample", "24"] if str(s.get("bit_depth", 16)) == "24" else ["-sample_fmt", "s16"]
        return ["-c:a", "flac", "-compression_level", str(int(s.get("flac_compression", 5))), *extra]
    if dst == "aac":
        return ["-c:a", "aac", "-b:a", br, "-f", "adts"]
    if dst == "m4a":
        return ["-c:a", "aac", "-b:a", br, "-f", "ipod"]
    if dst == "ogg":
        return ["-c:a", "libvorbis", "-q:a", str(int(s.get("ogg_quality", 5))), "-f", "ogg"]
    if dst == "opus":
        return ["-c:a", "libopus", "-b:a", br, "-application", s.get("opus_application", "audio"), "-f", "opus"]
    raise EngineError("unsupported_format", f"Cannot write {dst}.")


def _afilters(s: dict, eff: float) -> list[str]:
    f = []
    if _f(s, "volume_db"):
        f.append(f"volume={_f(s, 'volume_db')}dB")
    if s.get("normalize"):
        f.append("loudnorm=I=-16:TP=-1.5:LRA=11")
    if _f(s, "fade_in"):
        f.append(f"afade=t=in:st=0:d={_f(s, 'fade_in')}")
    if _f(s, "fade_out") and eff:
        f.append(f"afade=t=out:st={max(0.0, eff - _f(s, 'fade_out')):.2f}:d={_f(s, 'fade_out')}")
    return f


def build(src: Path, dst: str, route: str, s: dict, out: Path, info: dict, notes: list[str]) -> tuple[list[str], float]:
    total = float(info.get("duration") or 0)
    start, end = _f(s, "trim_start"), _f(s, "trim_end")
    length: float | None = None
    if route == "ffmpeg_gif":
        length = min(_f(s, "gif_duration", 10), 30.0)
        if total:
            length = min(length, max(0.1, total - start))
    elif end > start:
        length = end - start
    elif start and total:
        length = max(0.1, total - start)
    eff = length or total

    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error", "-protocol_whitelist", "file,pipe"]
    if start > 0:
        cmd += ["-ss", f"{start}"]
    cmd += ["-i", str(src)]
    if length:
        cmd += ["-t", f"{length:.3f}"]

    if route == "ffmpeg_audio":
        if not info.get("has_audio"):
            raise EngineError("no_audio_stream", "This file has no audio track.")
        cmd += ["-vn", "-map", "0:a:0", "-map_metadata", "0" if s.get("tags", "keep") == "keep" else "-1"]
        fl = _afilters(s, eff)
        if fl:
            cmd += ["-af", ",".join(fl)]
        if str(s.get("sample_rate", "0")) != "0":
            cmd += ["-ar", str(s["sample_rate"])]
        if str(s.get("channels", "0")) != "0":
            cmd += ["-ac", str(s["channels"])]
        cmd += _audio_codec(dst, s)
    elif route == "ffmpeg_gif":
        if not info.get("has_video"):
            raise EngineError("no_video_stream", "This file has no video track.")
        colors, width = int(s.get("gif_colors", 256)), int(s.get("gif_width", 480))
        dither = "bayer:bayer_scale=5" if s.get("gif_dither", True) else "none"
        fc = (f"fps={int(s.get('gif_fps', 12))},scale=w='min({width},iw)':h=-2:flags=lanczos,split[a][b];"
              f"[a]palettegen=max_colors={colors}:stats_mode=diff[p];[b][p]paletteuse=dither={dither}")
        cmd += ["-an", "-filter_complex", fc, "-loop", "0" if s.get("gif_loop", "inf") == "inf" else "-1"]
    else:  # ffmpeg_video
        if not info.get("has_video"):
            raise EngineError("no_video_stream", "This file has no video track.")
        vf: list[str] = []
        res, fps, rot = s.get("resolution", "original"), s.get("fps", "original"), str(s.get("rotate", "0"))
        if res != "original":
            vf.append(f"scale=-2:'min(ih,{res})'")
        if fps != "original":
            vf.append(f"fps={fps}")
        vf += {"90": ["transpose=1"], "180": ["hflip", "vflip"], "270": ["transpose=2"]}.get(rot, [])
        want_audio = bool(s.get("audio", True))
        vok, aok = _COPY_OK[dst]
        remux = (s.get("smart_mode", "auto") == "auto" and not vf and start == 0 and not length
                 and info.get("vcodec") in vok and (not want_audio or not info.get("has_audio") or info.get("acodec") in aok))
        cmd += ["-map", "0:v:0", "-map", "0:a:0?", "-map_metadata", "0"]
        if not want_audio:
            cmd += ["-an"]
        ab = f"{s.get('audio_bitrate', 128)}k"
        if remux:
            cmd += ["-c", "copy"]
            notes.append("Converted without re-encoding, so quality is unchanged and it was fast.")
        else:
            if dst in ("mp4", "mov", "mkv"):
                vf.append("scale=trunc(iw/2)*2:trunc(ih/2)*2")
                cmd += ["-c:v", "libx264", "-preset", s.get("preset", "medium"), "-crf", str(int(s.get("crf", 23))), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", ab]
            elif dst == "webm":
                cpu = {"fast": "5", "medium": "3", "slow": "1"}[s.get("preset", "medium")]
                cmd += ["-c:v", "libvpx-vp9", "-crf", str(int(s.get("crf", 32))), "-b:v", "0", "-row-mt", "1", "-cpu-used", cpu, "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", ab]
            elif dst == "avi":
                cmd += ["-c:v", "mpeg4", "-b:v", f"{int(s.get('video_bitrate', 2500))}k", "-vtag", "XVID", "-c:a", "libmp3lame", "-b:a", ab]
            elif dst == "wmv":
                cmd += ["-c:v", "wmv2", "-b:v", f"{int(s.get('video_bitrate', 2500))}k", "-c:a", "wmav2", "-b:a", ab]
            if vf:
                cmd += ["-vf", ",".join(vf)]
        if dst in ("mp4", "mov") and s.get("faststart", True):
            cmd += ["-movflags", "+faststart"]
    cmd += ["-progress", "pipe:1", "-nostats", str(out)]
    return cmd, eff


def run(src: Path, dst: str, route: str, s: dict, out: Path, notes: list[str]) -> None:
    info = media_info(src)
    if not info.get("valid"):
        raise EngineError("corrupt_file", "This file could not be read. It may be damaged.")
    cmd, eff = build(src, dst, route, s, out, info, notes)
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    assert proc.stdout is not None
    for line in proc.stdout:
        if line.startswith("out_time_us=") and eff:
            try:
                progress(5 + 90 * min(1.0, int(line.split("=")[1]) / 1e6 / eff))
            except ValueError:
                pass
    err = proc.stderr.read() if proc.stderr else ""
    if proc.wait() != 0 or not out.exists() or out.stat().st_size == 0:
        code = "corrupt_file" if "Invalid data" in err or "moov atom" in err else "convert_failed"
        raise EngineError(code, "The file could not be converted." + (" It may be damaged." if code == "corrupt_file" else ""))

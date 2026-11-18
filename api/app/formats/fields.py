"""Reusable setting fields. Format files compose these; the UI is generated from them."""
from __future__ import annotations

from .base import Option, SettingField as F


def opts(*pairs: tuple[str, str]) -> tuple[Option, ...]:
    return tuple(Option(v, l) for v, l in pairs)


def sel(key, label, options, default, **kw):
    return F(key, label, "select", default, options=opts(*options), **kw)


def num(key, label, default, mn, mx, step=1, **kw):
    return F(key, label, "number", default, min=mn, max=mx, step=step, **kw)


def rng(key, label, default, mn, mx, step=1, **kw):
    return F(key, label, "range", default, min=mn, max=mx, step=step, **kw)


def flag(key, label, default, **kw):
    return F(key, label, "boolean", default, **kw)


def color(key, label, default, **kw):
    return F(key, label, "color", default, **kw)


# ---- Images: shared by every image output ------------------------------------------------
IMAGE_COMMON = (
    sel("resize_mode", "Resize", [("none", "Original size"), ("percent", "Percent"), ("exact", "Exact size"),
        ("fit", "Fit inside"), ("fill", "Fill (crop)")], "none", group="resize"),
    num("percent", "Percent", 100, 1, 400, show_if="resize_mode=percent", group="resize"),
    num("width", "Width (px)", None, 1, 16384, show_if="resize_mode in exact,fit,fill", group="resize"),
    num("height", "Height (px)", None, 1, 16384, show_if="resize_mode in exact,fit,fill", group="resize"),
    flag("keep_aspect", "Keep aspect ratio", True, show_if="resize_mode=exact", group="resize"),
    flag("no_upscale", "Do not enlarge", True, level="advanced", show_if="resize_mode in exact,fit,fill", group="resize"),
    sel("rotate", "Rotate", [("0", "0"), ("90", "90"), ("180", "180"), ("270", "270")], "0", level="advanced", group="transform"),
    sel("flip", "Flip", [("none", "None"), ("h", "Horizontal"), ("v", "Vertical")], "none", level="advanced", group="transform"),
    flag("auto_orient", "Auto-rotate from EXIF", True, level="advanced", group="transform"),
    flag("grayscale", "Grayscale", False, level="advanced", group="color"),
    sel("color_profile", "Color profile", [("srgb", "Convert to sRGB"), ("keep", "Keep original")], "srgb", level="advanced", group="color"),
    sel("metadata", "Metadata", [("keep", "Keep all"), ("strip_gps", "Remove location only"), ("strip_all", "Remove all")],
        "keep", level="advanced", group="metadata"),
    num("dpi", "DPI (0 = keep)", 0, 0, 1200, level="advanced", group="metadata"),
)

TARGET_SIZE = num("target_size_kb", "Target file size (KB, 0 = off)", 0, 0, 51200,
                  help="Finds the best quality that fits under this size.", group="format")

# ---- Tracing (raster -> SVG) -------------------------------------------------------------
TRACE_FIELDS = (
    sel("trace_preset", "Preset", [("photo", "Photo"), ("logo", "Logo / illustration"), ("lineart", "Line art"), ("pixel", "Pixel art")], "logo"),
    sel("trace_mode", "Colors", [("color", "Color"), ("binary", "Black and white")], "color", level="advanced"),
    num("filter_speckle", "Filter speckle (px)", None, 0, 128, level="advanced"),
    num("color_precision", "Color precision", None, 1, 8, level="advanced"),
    num("layer_difference", "Layer difference", None, 0, 128, level="advanced"),
    num("corner_threshold", "Corner threshold", None, 0, 180, level="advanced"),
    num("max_size", "Max input size (px)", 2048, 256, 4096, level="advanced"),
)

# ---- Audio -------------------------------------------------------------------------------
AUDIO_COMMON = (
    sel("sample_rate", "Sample rate", [("0", "Original"), ("22050", "22050 Hz"), ("32000", "32000 Hz"),
        ("44100", "44100 Hz"), ("48000", "48000 Hz")], "0", group="audio", level="advanced"),
    sel("channels", "Channels", [("0", "Original"), ("1", "Mono"), ("2", "Stereo")], "0", group="audio", level="advanced"),
    num("trim_start", "Trim: start (seconds)", 0, 0, 86400, step=0.1, group="trim", level="advanced"),
    num("trim_end", "Trim: end (seconds, 0 = end)", 0, 0, 86400, step=0.1, group="trim", level="advanced"),
    num("fade_in", "Fade in (seconds)", 0, 0, 30, step=0.1, group="audio", level="advanced"),
    num("fade_out", "Fade out (seconds)", 0, 0, 30, step=0.1, group="audio", level="advanced"),
    num("volume_db", "Volume (dB)", 0, -20, 20, step=0.5, group="audio", level="advanced"),
    flag("normalize", "Normalize loudness", False, group="audio", level="advanced"),
    sel("tags", "Tags", [("keep", "Keep"), ("remove", "Remove")], "keep", group="metadata", level="advanced"),
)
BITRATES = [(str(b), f"{b} kbps") for b in (64, 96, 128, 160, 192, 224, 256, 320)]

# ---- Video -------------------------------------------------------------------------------
VIDEO_COMMON = (
    sel("resolution", "Resolution", [("original", "Original"), ("2160", "2160p"), ("1440", "1440p"), ("1080", "1080p"),
        ("720", "720p"), ("480", "480p"), ("360", "360p")], "original", group="video"),
    sel("fps", "Frame rate", [("original", "Original"), ("60", "60"), ("30", "30"), ("24", "24")], "original", group="video", level="advanced"),
    flag("audio", "Keep audio", True, group="audio"),
    sel("audio_bitrate", "Audio bitrate", BITRATES, "128", group="audio", level="advanced", show_if="audio=true"),
    sel("rotate", "Rotate", [("0", "0"), ("90", "90"), ("180", "180"), ("270", "270")], "0", group="transform", level="advanced"),
    num("trim_start", "Trim: start (seconds)", 0, 0, 86400, step=0.1, group="trim", level="advanced"),
    num("trim_end", "Trim: end (seconds, 0 = end)", 0, 0, 86400, step=0.1, group="trim", level="advanced"),
    sel("smart_mode", "Mode", [("auto", "Auto (skip re-encoding when possible)"), ("reencode", "Always re-encode")], "auto", group="video", level="advanced"),
)
SPEED = sel("preset", "Speed", [("fast", "Fast"), ("medium", "Medium"), ("slow", "Slow (smaller file)")], "medium", group="video", level="advanced")
CRF_H264 = rng("crf", "Quality (lower = better)", 23, 18, 32, group="video")
FASTSTART = flag("faststart", "Fast start (web playback)", True, group="video", level="advanced")

VIDEO_TO_GIF = (
    num("gif_fps", "Frames per second", 12, 5, 30, group="video"),
    num("gif_width", "Width (px)", 480, 120, 1280, group="video"),
    num("trim_start", "Start (seconds)", 0, 0, 86400, step=0.1, group="trim"),
    num("gif_duration", "Duration (seconds, max 30)", 10, 1, 30, step=0.5, group="trim"),
    sel("gif_loop", "Loop", [("inf", "Forever"), ("once", "Once")], "inf", group="video", level="advanced"),
    num("gif_colors", "Max colors", 256, 64, 256, group="video", level="advanced"),
    flag("gif_dither", "Dither", True, group="video", level="advanced"),
)

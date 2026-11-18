"""Options shared by every camera RAW format."""
from .fields import num, sel

RAW_INPUT = (
    sel("raw_wb", "White balance", [("camera", "Camera"), ("auto", "Auto"), ("daylight", "Daylight")], "camera", group="source"),
    num("raw_brightness", "Brightness (EV)", 0, -2, 2, step=0.25, group="source"),
    sel("raw_highlight", "Highlights", [("clip", "Clip"), ("blend", "Blend"), ("recover", "Recover")], "clip", group="source", level="advanced"),
    sel("raw_noise", "Noise reduction", [("off", "Off"), ("light", "Light"), ("full", "Full")], "off", group="source", level="advanced"),
    sel("raw_bit_depth", "Develop depth", [("8", "8-bit"), ("16", "16-bit (PNG/TIFF only)")], "8", group="source", level="advanced"),
)

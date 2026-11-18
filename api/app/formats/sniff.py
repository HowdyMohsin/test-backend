"""Magic-byte detectors. We never trust the file extension alone."""
from __future__ import annotations

from typing import Callable

Sniffer = Callable[[bytes], bool]


def sig(*patterns: bytes, offset: int = 0) -> Sniffer:
    return lambda h: any(h[offset : offset + len(p)] == p for p in patterns)


def riff(kind: bytes) -> Sniffer:
    return lambda h: h[:4] == b"RIFF" and h[8:12] == kind


def ftyp(*brands: bytes) -> Sniffer:
    return lambda h: h[4:8] == b"ftyp" and h[8:12] in brands


def tiff_header(h: bytes) -> bool:
    return h[:4] in (b"II*\x00", b"MM\x00*", b"II+\x00", b"MM\x00+")


def svg(h: bytes) -> bool:
    t = h[:2048].lstrip(b"\xef\xbb\xbf \t\r\n")
    return t.startswith(b"<svg") or (t.startswith((b"<?xml", b"<!--", b"<!DOCTYPE")) and b"<svg" in h[:2048])


def ebml(doctype: bytes) -> Sniffer:
    return lambda h: h[:4] == b"\x1a\x45\xdf\xa3" and doctype in h[:80]


def mp3(h: bytes) -> bool:
    if h[:3] == b"ID3":
        return True
    return len(h) > 2 and h[0] == 0xFF and (h[1] & 0xE0) == 0xE0 and (h[1] & 0x06) == 0x02


def aac_adts(h: bytes) -> bool:
    return len(h) > 2 and h[0] == 0xFF and (h[1] & 0xF6) == 0xF0


def ogg_vorbis(h: bytes) -> bool:
    return h[:4] == b"OggS" and b"OpusHead" not in h[:160]


def ogg_opus(h: bytes) -> bool:
    return h[:4] == b"OggS" and b"OpusHead" in h[:160]


def cr2(h: bytes) -> bool:
    return h[:4] in (b"II*\x00",) and h[8:10] == b"CR"


def aiff(h: bytes) -> bool:
    return h[:4] == b"FORM" and h[8:12] in (b"AIFF", b"AIFC")


def asf(h: bytes) -> bool:
    return h[:16] == bytes.fromhex("3026b2758e66cf11a6d900aa0062ce6c")

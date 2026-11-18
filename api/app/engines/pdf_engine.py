"""PDF -> one PNG per page with pypdfium2."""
from __future__ import annotations

from pathlib import Path

import pypdfium2 as pdfium

from .common import EngineError, progress


def parse_pages(spec: str, total: int) -> list[int]:
    spec = (spec or "all").strip().lower()
    if spec in ("", "all"):
        return list(range(total))
    pages: list[int] = []
    for part in spec.split(","):
        part = part.strip()
        try:
            if "-" in part:
                a, b = part.split("-", 1)
                pages += list(range(int(a) - 1, int(b)))
            else:
                pages.append(int(part) - 1)
        except ValueError as e:
            raise EngineError("invalid_settings", "Pages must look like 1-3,5 or all.") from e
    pages = [p for p in dict.fromkeys(pages) if 0 <= p < total]
    if not pages:
        raise EngineError("invalid_settings", f"No such pages. This PDF has {total} pages.")
    return pages


def render(src: Path, tmp: Path, s: dict, max_pages: int, max_pixels: int) -> list[Path]:
    try:
        pdf = pdfium.PdfDocument(str(src))
    except Exception as e:
        raise EngineError("corrupt_file", "This PDF could not be opened. It may be damaged or password protected.") from e
    total = len(pdf)
    pages = parse_pages(s.get("pdf_pages", "all"), total)
    if len(pages) > max_pages:
        raise EngineError("page_limit", f"This PDF has {len(pages)} pages. The limit is {max_pages} per conversion.")
    dpi = int(s.get("pdf_dpi", 150))
    fill = (255, 255, 255, 255) if s.get("pdf_background", "white") == "white" else (0, 0, 0, 0)
    outs: list[Path] = []
    for n, idx in enumerate(pages):
        page = pdf[idx]
        w, h = page.get_size()
        scale = dpi / 72
        if w * h * scale * scale > max_pixels:
            scale = (max_pixels / (w * h)) ** 0.5
        img = page.render(scale=scale, fill_color=fill).to_pil()
        p = tmp / f"page-{idx + 1:03d}.png"
        img.save(p)
        outs.append(p)
        progress(5 + 40 * (n + 1) / len(pages))
    return outs

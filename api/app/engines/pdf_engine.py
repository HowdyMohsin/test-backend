"""pdf engine: pypdfium2 renders pages -> vips encodes each -> zip when multipage."""

from __future__ import annotations

import zipfile
from pathlib import Path
from typing import Callable

from app.engines.base import EngineNotAvailableError, EngineError, JobContext
from app.engines import vips_engine
from app.settings import settings


def run(ctx: JobContext, progress: Callable[[float], None]) -> Path:
    try:
        import pypdfium2 as pdfium
    except ImportError as exc:
        raise EngineNotAvailableError("pypdfium2 is not installed") from exc
    if not vips_engine._HAS_VIPS:
        raise EngineNotAvailableError("pyvips/libvips is not installed")
    try:
        doc = pdfium.PdfDocument(str(ctx.input_path))
    except Exception as exc:
        raise EngineError(f"cannot parse PDF: {exc}") from exc
    n_pages = len(doc)
    if n_pages == 0:
        raise EngineError("PDF has no pages")
    if n_pages > settings.pdf_page_cap:
        raise EngineError(f"PDF page cap exceeded ({settings.pdf_page_cap})")
    ctx.output_path.parent.mkdir(parents=True, exist_ok=True)
    rendered: list[Path] = []
    try:
        for i, page in enumerate(doc):
            progress(0.1 + 0.7 * i / n_pages)
            bitmap = page.render(scale=2.0)
            pil_img = bitmap.to_pil()
            tmp_png = ctx.output_path.parent / f"{ctx.output_path.stem}.p{i + 1}.png"
            pil_img.save(str(tmp_png))
            out_one = ctx.output_path.parent / f"{ctx.output_path.stem}.p{i + 1}{ctx.output_path.suffix}"
            img = vips_engine._load(tmp_png, "png")
            vips_engine._save(img, out_one, ctx.to_format, ctx.settings)
            tmp_png.unlink(missing_ok=True)
            rendered.append(out_one)
        if len(rendered) == 1:
            rendered[0].rename(ctx.output_path)
            progress(0.95)
            return ctx.output_path
        # multipage -> single zip (spec 3)
        zip_path = ctx.output_path.with_suffix(".zip")
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for p in rendered:
                zf.write(p, p.name)
        progress(0.95)
        return zip_path
    finally:
        for p in rendered:
            p.unlink(missing_ok=True)

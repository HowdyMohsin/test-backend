"""Engine dispatcher: pair.engine -> isolated engine run."""

from __future__ import annotations

from pathlib import Path
from typing import Callable

from app.engines.base import JobContext, run_isolated

_ENGINE_FNS: dict[str, str] = {
    "vips": "app.engines.vips_engine:run",
    "svg": "app.engines.svg_engine:run",
    "psd": "app.engines.psd_engine:run",
    "pdf": "app.engines.pdf_engine:run",
    "trace": "app.engines.trace_engine:run",
    "raw": "app.engines.raw_engine:run",
    "ffmpeg": "app.engines.ffmpeg_engine:run",
}


def run_pair(
    engine: str,
    job_id: str,
    input_path: Path,
    output_path: Path,
    from_format: str,
    to_format: str,
    settings: dict,
    timeout_sec: float,
    on_progress: Callable[[float], None] | None = None,
) -> Path:
    fn_ref = _ENGINE_FNS.get(engine)
    if fn_ref is None:
        raise ValueError(f"unknown engine: {engine}")
    ctx = JobContext(
        job_id=job_id,
        input_path=Path(input_path),
        output_path=Path(output_path),
        from_format=from_format,
        to_format=to_format,
        settings=settings or {},
        timeout_sec=timeout_sec,
    )
    return run_isolated(fn_ref, ctx, on_progress, timeout_sec=timeout_sec)

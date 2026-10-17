"""Engine base: one interface for all engines, real subprocess isolation.

Every engine exposes a top-level `run(ctx, progress) -> Path`.
`run_isolated` executes it in a forked child with an address-space memory
limit and a hard timeout. Progress flows back through a queue.
"""

from __future__ import annotations

import importlib
import multiprocessing
import queue
import time
import traceback
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable


class EngineError(Exception):
    """Conversion failed (bad input, missing tool, corrupt output)."""


class EngineTimeoutError(EngineError):
    pass


class EngineNotAvailableError(EngineError):
    """The engine's native library/tool is not installed in this container."""


@dataclass
class JobContext:
    job_id: str
    input_path: Path
    output_path: Path
    from_format: str
    to_format: str
    settings: dict = field(default_factory=dict)
    timeout_sec: float = 600.0
    memory_mb: int = 2048
    # pdf multipage: worker passes page count; pdf engine may return a zip
    multipage_zip: bool = False


def _child_main(
    fn_ref: str,
    ctx_dict: dict,
    result_queue: multiprocessing.Queue,  # type: ignore[type-arg]
    progress_queue: multiprocessing.Queue,  # type: ignore[type-arg]
    memory_mb: int,
) -> None:
    try:
        import resource

        limit = memory_mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (limit, limit))
    except Exception:
        pass  # platform without resource (never in our Linux container)
    try:
        mod_name, fn_name = fn_ref.split(":")
        fn = getattr(importlib.import_module(mod_name), fn_name)
        ctx = JobContext(
            job_id=ctx_dict["job_id"],
            input_path=Path(ctx_dict["input_path"]),
            output_path=Path(ctx_dict["output_path"]),
            from_format=ctx_dict["from_format"],
            to_format=ctx_dict["to_format"],
            settings=ctx_dict.get("settings") or {},
            timeout_sec=ctx_dict.get("timeout_sec", 600.0),
            memory_mb=ctx_dict.get("memory_mb", 2048),
            multipage_zip=ctx_dict.get("multipage_zip", False),
        )

        def progress(frac: float) -> None:
            try:
                progress_queue.put_nowait(("progress", max(0.0, min(1.0, frac))))
            except Exception:
                pass

        out = fn(ctx, progress)
        result_queue.put(("ok", str(out)))
    except Exception as exc:  # noqa: BLE001 — child must never die silently
        result_queue.put(("error", f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"))


def run_isolated(
    fn_ref: str,
    ctx: JobContext,
    on_progress: Callable[[float], None] | None = None,
    timeout_sec: float | None = None,
    memory_mb: int = 2048,
) -> Path:
    """Run an engine function in a memory-limited child with a hard timeout."""
    mp_ctx = multiprocessing.get_context("fork")
    result_q: multiprocessing.Queue = mp_ctx.Queue()  # type: ignore[type-arg]
    progress_q: multiprocessing.Queue = mp_ctx.Queue()  # type: ignore[type-arg]
    proc = mp_ctx.Process(
        target=_child_main,
        args=(fn_ref, asdict(ctx), result_q, progress_q, memory_mb),
        daemon=True,
    )
    proc.start()
    deadline = time.monotonic() + (timeout_sec or ctx.timeout_sec)
    try:
        while proc.is_alive():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise EngineTimeoutError(f"engine timed out after {timeout_sec or ctx.timeout_sec:.0f}s")
            try:
                kind, value = progress_q.get(timeout=min(0.5, max(0.01, remaining)))
                if kind == "progress" and on_progress:
                    on_progress(value)
            except queue.Empty:
                pass
        # Child exited: drain result
        try:
            kind, value = result_q.get(timeout=5)
        except queue.Empty:
            raise EngineError("engine child exited without a result")
        if kind != "ok":
            if "EngineTimeoutError" in value:
                raise EngineTimeoutError(value)
            raise EngineError(value)
        return Path(value)
    finally:
        if proc.is_alive():
            proc.terminate()
        proc.join(5)
        if proc.is_alive():
            proc.kill()


def verify_output(path: Path, to_format: str) -> None:
    """A corrupt file is never a success: output must open and match target magic."""
    from app.core import security
    from app.formats import registry

    if not path.exists() or path.stat().st_size == 0:
        raise EngineError("engine produced an empty output file")
    spec = registry.get_format(to_format)
    data = path.read_bytes()[: security.MAGIC_HEAD]
    if to_format == "svg":
        head = data.lstrip()[:5]
        if not (head.startswith(b"<?xml") or head.startswith(b"<svg")):
            raise EngineError("output is not valid SVG")
        return
    ok = False
    for pattern in spec.magic:
        if security.match_magic(data, pattern):
            if spec.magic_contains and not all(c in data for c in spec.magic_contains):
                continue
            ok = True
            break
    # multipage PDF jobs legitimately return a zip
    if not ok and path.suffix.lower() == ".zip":
        if data[:2] == b"PK":
            return
    if not ok:
        raise EngineError(f"output magic does not match target format {to_format}")

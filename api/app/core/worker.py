"""Job queue consumer. Jobs live in Postgres, so a restart never loses them.
Each conversion runs in its own child process; the worker supervises progress, timeout and cancel."""
from __future__ import annotations

import asyncio
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import text

from ..db.models import Job, Upload
from ..db.session import SessionLocal
from ..formats import registry
from ..settings import get_settings
from . import quota, site
from .events import record, rollup
from .security import resolve_name, safe_stem
from .storage import storage
from .verify import verify_output

log = logging.getLogger("qic.worker")
API_DIR = Path(__file__).resolve().parents[2]


def build_spec(job: Job, upload: Upload, out_dir: Path) -> dict:
    s = get_settings()
    pair = registry.pair_for(job.from_slug, job.to_slug)
    assert pair is not None
    return {"src": upload.path, "out_dir": str(out_dir), "stem": safe_stem(upload.filename), "src_slug": job.from_slug,
            "dst": job.to_slug, "dst_ext": pair.dst.ext, "route": job.route, "settings": job.settings,
            "limits": {"max_pixels": s.max_pixels, "max_pdf_pages": s.max_pdf_pages}}


async def claim() -> str | None:
    async with SessionLocal() as db, db.begin():
        await db.execute(text("select pg_advisory_xact_lock(7001)"))  # claims are serialized: video runs one at a time
        row = (await db.execute(text(
            "update jobs set status='processing', started_at=now(), progress=1 where id = ("
            " select id from jobs j where status='queued' and (category <> 'video' or not exists "
            "  (select 1 from jobs p where p.status='processing' and p.category='video')) "
            " order by created_at limit 1 for update skip locked) returning id"))).first()
    return str(row[0]) if row else None


async def _set(job_id, **cols) -> None:
    sets = ", ".join(f"{k}=:{k}" for k in cols)
    async with SessionLocal() as db:
        await db.execute(text(f"update jobs set {sets} where id=:id"), {**cols, "id": job_id})
        await db.commit()


async def _fail(job: Job, code: str, message: str, status: str = "failed") -> None:
    async with SessionLocal() as db:
        r = await db.execute(text(
            "update jobs set status=:st, error_code=:c, error_message=:m, finished_at=now(), progress=0 "
            "where id=:id and status='processing' returning id"), {"st": status, "c": code, "m": message, "id": job.id})
        if r.first():
            await quota.refund(db, job.owner_key, job.created_at.astimezone(timezone.utc).date())
            job.error_code = code
            await record(db, job, status, 0, 0, 0, 0)
        await db.commit()


async def process(job_id: str) -> None:
    async with SessionLocal() as db:
        job = await db.get(Job, job_id)
        upload = await db.get(Upload, job.upload_id) if job else None
    if job is None:
        return
    if upload is None or not Path(upload.path).exists():
        return await _fail(job, "upload_expired", "The uploaded file has expired. Please upload it again.")
    out_dir = storage.job_dir(job.id) / "out"
    out_dir.mkdir(parents=True, exist_ok=True)
    spec = build_spec(job, upload, out_dir)
    t0 = time.time()
    proc = await asyncio.create_subprocess_exec(
        sys.executable, "-m", "app.engines.runner", json.dumps(spec), cwd=str(API_DIR),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, start_new_session=True)
    result: dict | None = None

    async def reader() -> None:
        nonlocal result
        last, last_t = 0, 0.0
        assert proc.stdout
        async for line in proc.stdout:
            try:
                obj = json.loads(line)
            except ValueError:
                continue
            if obj["t"] == "progress" and obj["v"] != last and time.time() - last_t > 0.7:
                last, last_t = obj["v"], time.time()
                await _set(job_id, progress=obj["v"])
            elif obj["t"] in ("result", "error"):
                result = obj

    err_task = asyncio.create_task(proc.stderr.read()) if proc.stderr else None
    rd = asyncio.create_task(reader())
    killed: str | None = None
    while not rd.done():
        await asyncio.wait({rd}, timeout=1.0)
        if rd.done():
            break
        async with SessionLocal() as db:
            status = (await db.execute(text("select status from jobs where id=:i"), {"i": job_id})).scalar_one()
        if status == "cancelled":
            killed = "cancelled"
        elif time.time() - t0 > job.timeout_s:
            killed = "timeout"
        if killed:
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            break
    await proc.wait()
    rd.cancel()
    stderr = (await err_task).decode(errors="replace")[-400:] if err_task else ""
    storage_clean = lambda: storage.remove(storage.job_dir(job.id))  # noqa: E731
    if killed == "cancelled":
        storage_clean()
        return
    if killed == "timeout":
        storage_clean()
        return await _fail(job, "job_timeout", "This conversion took too long and was stopped. Try a smaller file or lower settings.")
    if not result or result["t"] == "error":
        code, message = (result["code"], result["message"]) if result else ("internal", "The converter stopped unexpectedly.")
        if not result:
            log.error("runner crashed for %s: %s", job_id, stderr)
        storage_clean()
        return await _fail(job, code, message)
    out = result["outputs"][0]
    path = Path(out["path"])
    problem = verify_output(path, job.to_slug, job.category)
    if problem:
        storage_clean()
        return await _fail(job, "corrupt_output", problem)
    meta = result.get("meta", {})
    pair = registry.pair_for(job.from_slug, job.to_slug)
    ext = path.suffix.lstrip(".")
    name = resolve_name(job.name_pattern, safe_stem(upload.filename), ext, meta.get("width"), meta.get("height"))
    retention = (await _retention())
    async with SessionLocal() as db:
        r = await db.execute(text(
            "update jobs set status='done', progress=100, out_name=:n, out_path=:p, out_size=:s, out_info=cast(:i as jsonb), "
            "notes=cast(:no as jsonb), finished_at=now(), expires_at=now() + make_interval(mins => :ret) "
            "where id=:id and status='processing' returning id"),
            {"n": name, "p": str(path), "s": out["size"], "i": json.dumps(meta), "no": json.dumps(result.get("notes", [])),
             "ret": retention, "id": job_id})
        if r.first():
            await record(db, job, "done", upload.size, out["size"], int((time.time() - t0) * 1000),
                         int((job.started_at or job.created_at).timestamp() * 1000 - job.created_at.timestamp() * 1000) if job.started_at else 0)
        await db.commit()


async def _retention() -> int:
    async with SessionLocal() as db:
        v = (await site.site_settings(db)).get("retention_minutes")
    return int(v or get_settings().retention_minutes)


async def worker_loop(n: int) -> None:
    while True:
        try:
            job_id = await claim()
            if job_id is None:
                await asyncio.sleep(0.8)
                continue
            await process(job_id)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            log.exception("worker %s crashed on a job", n)
            await asyncio.sleep(2)


async def requeue_stuck() -> None:
    async with SessionLocal() as db:
        await db.execute(text("update jobs set status='queued', progress=0, started_at=null where status='processing'"))
        await db.commit()


async def janitor_once() -> None:
    async with SessionLocal() as db:
        ups = (await db.execute(text("delete from uploads where expires_at < now() returning id"))).all()
        jobs = (await db.execute(text(
            "update jobs set status='expired', out_path=null where status in ('done','failed','cancelled') and expires_at < now() "
            "returning id"))).all()
        await rollup(db)
        await db.commit()
    for (i,) in ups:
        storage.remove(storage.upload_dir(i))
    for (i,) in jobs:
        storage.remove(storage.job_dir(i))


async def janitor_loop() -> None:
    while True:
        try:
            await janitor_once()
        except Exception:  # noqa: BLE001
            log.exception("janitor failed")
        await asyncio.sleep(300)


async def start(n: int) -> list[asyncio.Task]:
    await requeue_stuck()
    tasks = [asyncio.create_task(worker_loop(i)) for i in range(n)]
    tasks.append(asyncio.create_task(janitor_loop()))
    return tasks

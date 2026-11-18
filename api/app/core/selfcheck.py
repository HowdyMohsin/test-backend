"""Converts a sample through every pair and checks the result. Replaces a tests/ folder:
only pairs that pass become live on the site."""
from __future__ import annotations

import asyncio
import json
import shutil
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import FormatState, SelfcheckRun
from ..engines.probe import file_info, media_info
from ..formats import registry
from ..formats.validate import defaults
from ..settings import get_settings
from . import site
from . import fidelity
from .samples import GEN, sample_for
from .verify import verify_output

API_DIR = Path(__file__).resolve().parents[2]


def _check_one(pair, sample: Path) -> dict:
    tmp = Path(tempfile.mkdtemp(prefix="qic-sc-"))
    try:
        spec = {"src": str(sample), "out_dir": str(tmp), "stem": "check", "src_slug": pair.src.slug, "dst": pair.dst.slug,
                "dst_ext": pair.dst.ext, "route": pair.route, "settings": defaults(pair.fields),
                "limits": {"max_pixels": get_settings().max_pixels, "max_pdf_pages": get_settings().max_pdf_pages}}
        import subprocess
        t0 = time.time()
        p = subprocess.run([sys.executable, "-m", "app.engines.runner", json.dumps(spec)], cwd=API_DIR, capture_output=True, text=True, timeout=300)
        lines = [json.loads(l) for l in p.stdout.splitlines() if l.startswith("{")]
        res = lines[-1] if lines else {"t": "error", "code": "internal", "message": p.stderr[-200:]}
        if res["t"] != "result":
            return {"ok": False, "reason": f"{res.get('code')}: {res.get('message')}"}
        out = Path(res["outputs"][0]["path"])
        bad = verify_output(out, pair.dst.slug, pair.dst.category)
        if bad:
            return {"ok": False, "reason": bad}
        if pair.dst.category in ("audio", "video") and pair.dst.slug != "gif" and pair.route != "ffmpeg_gif":
            a, b = media_info(sample).get("duration", 0), media_info(out).get("duration", 0)
            if a and abs(a - b) > 1.5:
                return {"ok": False, "reason": f"duration changed from {a}s to {b}s"}
        if pair.dst.category == "image" and out.suffix != ".zip":
            info = file_info(out, pair.dst.slug, "image")
            if pair.dst.slug != "svg" and not (info.get("width") and info.get("height")):
                return {"ok": False, "reason": "output has no dimensions"}
        reference = None
        if pair.route == "psd" and (GEN / "_base.png").exists():
            reference = GEN / "_base.png"
        elif pair.route == "pdf" and (GEN / "_base_flat.png").exists():
            reference = GEN / "_base_flat.png"
        good, label = fidelity.check(pair, sample, out, reference)
        if not good:
            return {"ok": False, "reason": f"accuracy: {label}"}
        return {"ok": True, "seconds": round(time.time() - t0, 1), "size": out.stat().st_size, "accuracy": label}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "reason": f"{type(e).__name__}: {e}"}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


async def run(db: AsyncSession, only: list[str] | None = None, concurrency: int = 2, log=print) -> dict:
    pairs = [p for p in registry.pairs().values() if not only or p.slug in only]
    run_row = SelfcheckRun(total=len(pairs))
    db.add(run_row)
    await db.flush()
    sem = asyncio.Semaphore(concurrency)
    results: dict[str, dict] = {}

    async def one(pair):
        sample = await asyncio.to_thread(sample_for, pair.src.slug)
        if sample is None:
            results[pair.slug] = {"status": "skipped", "reason": f"no sample file for {pair.src.slug.upper()} (add one to data/samples/{pair.src.slug}/)"}
            log(f"SKIP {pair.slug}")
            return
        async with sem:
            r = await asyncio.to_thread(_check_one, pair, sample)
        results[pair.slug] = {"status": "passed" if r["ok"] else "failed", **r}
        log(f"{'PASS' if r['ok'] else 'FAIL'} {pair.slug} {r.get('accuracy') or r.get('reason', '')}")

    await asyncio.gather(*[one(p) for p in pairs])
    states = {s.key: s for s in (await db.execute(select(FormatState))).scalars()}
    now = datetime.now(timezone.utc)
    for slug, r in results.items():
        st = states.get(slug) or FormatState(key=slug, kind="pair")
        st.status = {"passed": "live", "failed": "broken"}.get(r["status"], "testing")
        st.note = (f"Accuracy: {r['accuracy']}" if r["status"] == "passed" else r.get("reason"))
        st.last_check_at = now
        db.add(st)
    run_row.finished_at = now
    run_row.passed = sum(r["status"] == "passed" for r in results.values())
    run_row.failed = sum(r["status"] == "failed" for r in results.values())
    run_row.skipped = sum(r["status"] == "skipped" for r in results.values())
    run_row.report = results
    await db.commit()
    site.invalidate()
    return {"total": len(pairs), "passed": run_row.passed, "failed": run_row.failed, "skipped": run_row.skipped, "results": results}

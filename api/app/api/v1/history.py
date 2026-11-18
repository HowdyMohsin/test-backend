from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.auth import Identity, get_identity
from ...core.security import make_token
from ...db.models import Job
from ...db.session import get_db

router = APIRouter()


@router.get("/history")
async def history(limit: int = Query(50, ge=1, le=100), ident: Identity = Depends(get_identity), db: AsyncSession = Depends(get_db)):
    """The caller's recent conversions. The files are deleted after an hour, the record stays."""
    rows = (await db.execute(select(Job).where(Job.owner_key == ident.owner_key).order_by(Job.created_at.desc()).limit(limit))).scalars().all()
    items = []
    for j in rows:
        available = j.status == "done" and bool(j.out_path) and Path(j.out_path).exists()
        items.append({
            "id": str(j.id), "pair": j.pair_slug, "from": j.from_slug, "to": j.to_slug,
            "status": "expired" if j.status == "done" and not available else j.status,
            "source_name": j.source_name, "name": j.out_name, "in_size": j.in_size, "out_size": j.out_size,
            "created_at": j.created_at.isoformat(), "finished_at": j.finished_at.isoformat() if j.finished_at else None,
            "download_url": f"/v1/jobs/{j.id}/download?token={make_token(str(j.id))}" if available else None,
            "error": j.error_message if j.status == "failed" else None,
        })
    return {"signed_in": not ident.anonymous, "items": items}

"""Admin: reports tab — daily/weekly/monthly conversion stats (spec 4.9)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_tab
from app.core.errors import APIError, ErrorCode
from app.db.models import AdminUser
from app.schemas import v1 as s

router = APIRouter()
_guard = require_tab("reports")


def _range_to_days(range_: str) -> int:
    return {"day": 1, "week": 7, "month": 30}.get(range_, 7)


@router.get("/reports/summary", response_model=list[s.ReportSummary])
async def summary(
    range: str = Query(default="week", max_length=8),
    _admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
) -> list[s.ReportSummary]:
    days = _range_to_days(range)
    if range not in ("day", "week", "month"):
        raise APIError(ErrorCode.BAD_REQUEST, "range must be day, week or month")
    rows = (
        await db.execute(
            text(
                """
                SELECT day,
                       SUM(conversions) AS conv,
                       SUM(failed) AS fail,
                       SUM(input_bytes) AS bytes
                FROM event_daily
                WHERE day > CURRENT_DATE - (:days || ' days')::interval
                GROUP BY day ORDER BY day
                """
            ),
            {"days": str(days)},
        )
    ).all()
    return [
        s.ReportSummary(
            day=str(r[0]), conversions=int(r[1] or 0), failed=int(r[2] or 0),
            input_mb=round((r[3] or 0) / (1024 * 1024), 2),
        )
        for r in rows
    ]


@router.get("/reports/pairs")
async def by_pair(
    range: str = Query(default="week", max_length=8),
    limit: int = Query(default=20, le=100),
    _admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    days = _range_to_days(range)
    rows = (
        await db.execute(
            text(
                """
                SELECT pair_slug, SUM(conversions) AS conv, SUM(failed) AS fail
                FROM event_daily
                WHERE day > CURRENT_DATE - (:days || ' days')::interval
                GROUP BY pair_slug ORDER BY conv DESC LIMIT :limit
                """
            ),
            {"days": str(days), "limit": limit},
        )
    ).all()
    return [{"pair": r[0], "conversions": int(r[1] or 0), "failed": int(r[2] or 0)} for r in rows]


@router.get("/reports/plans")
async def by_plan(
    range: str = Query(default="week", max_length=8),
    _admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    days = _range_to_days(range)
    rows = (
        await db.execute(
            text(
                """
                SELECT plan_id, SUM(conversions) AS conv, SUM(failed) AS fail
                FROM event_daily
                WHERE day > CURRENT_DATE - (:days || ' days')::interval
                GROUP BY plan_id ORDER BY conv DESC
                """
            ),
            {"days": str(days)},
        )
    ).all()
    return [{"plan": r[0], "conversions": int(r[1] or 0), "failed": int(r[2] or 0)} for r in rows]


@router.get("/reports/audit")
async def audit_log(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    _admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    from app.db.models import AuditLog

    rows = (
        await db.execute(
            select(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).offset(offset)
        )
    ).scalars().all()
    return [
        {
            "id": r.id, "admin_id": str(r.admin_id) if r.admin_id else None,
            "action": r.action, "target": r.target, "details": r.details,
            "ip": r.ip, "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]

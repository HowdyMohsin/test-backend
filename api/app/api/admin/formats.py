"""Admin: formats tab — list/toggle format & pair state, trigger selfcheck."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import audit, get_db, require_tab
from app.core.errors import APIError, ErrorCode
from app.core.selfcheck import run_selfcheck
from app.db.models import AdminUser, FormatState
from app.formats import registry
from app.schemas import v1 as s

router = APIRouter()
_guard = require_tab("formats")


@router.get("/formats", response_model=list[s.FormatStateSchema])
async def list_states(
    _admin: AdminUser = Depends(_guard), db: AsyncSession = Depends(get_db)
) -> list[s.FormatStateSchema]:
    rows = (await db.execute(select(FormatState))).scalars().all()
    by_key = {r.key: r for r in rows}
    out: list[s.FormatStateSchema] = []
    for slug in registry.all_formats():
        st = by_key.get(slug)
        out.append(_schema(slug, st))
    for pair in registry.all_pairs():
        st = by_key.get(f"pair:{pair.slug}")
        out.append(_schema(f"pair:{pair.slug}", st))
    return out


def _schema(key: str, st: FormatState | None) -> s.FormatStateSchema:
    if st is None:
        return s.FormatStateSchema(key=key)
    return s.FormatStateSchema(
        key=key, visible=st.visible, plans=list(st.plans or []), status=st.status, note=st.note or ""
    )


@router.patch("/formats/{key}", response_model=s.FormatStateSchema)
async def update_state(
    key: str,
    body: s.FormatStateUpdate,
    request: Request,
    admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
) -> s.FormatStateSchema:
    valid = set(registry.all_formats()) | {f"pair:{p.slug}" for p in registry.all_pairs()}
    if key not in valid:
        raise APIError(ErrorCode.NOT_FOUND, "unknown format or pair key")
    st = (await db.execute(select(FormatState).where(FormatState.key == key))).scalar_one_or_none()
    if st is None:
        st = FormatState(key=key)
        db.add(st)
    if body.visible is not None:
        st.visible = body.visible
    if body.plans is not None:
        allowed = {"anonymous", "free", "pro"}
        if not set(body.plans) <= allowed:
            raise APIError(ErrorCode.BAD_REQUEST, "plans must be a subset of anonymous/free/pro")
        st.plans = body.plans
    if body.status is not None:
        if body.status not in ("live", "testing", "broken"):
            raise APIError(ErrorCode.BAD_REQUEST, "status must be live, testing or broken")
        st.status = body.status
        st.last_check_at = datetime.now(timezone.utc)
    if body.note is not None:
        st.note = body.note[:2000]
    await db.commit()
    await audit(db, admin, "format_state.update", request, target=key, details=body.model_dump(exclude_none=True))
    return _schema(key, st)


@router.post("/formats/selfcheck")
async def trigger_selfcheck(
    body: s.SelfcheckTrigger,
    request: Request,
    admin: AdminUser = Depends(_guard),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if body.pair:
        try:
            registry.get_pair(body.pair)
        except KeyError as exc:
            raise APIError(ErrorCode.NOT_FOUND, "unknown pair") from exc
    result = await run_selfcheck(body.pair)
    await audit(db, admin, "selfcheck.run", request, target=body.pair or "all")
    return {"ok": True, **{k: v for k, v in result.items() if k != "results"}}

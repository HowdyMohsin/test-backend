"""Verifies Firebase ID tokens on the server. Optional: without config everyone is anonymous."""
from __future__ import annotations

import logging

from ..settings import get_settings

log = logging.getLogger("qic.firebase")
_ready: bool | None = None


def _init() -> bool:
    global _ready
    if _ready is not None:
        return _ready
    s = get_settings()
    try:
        import firebase_admin
        from firebase_admin import credentials

        if s.firebase_credentials_path:
            firebase_admin.initialize_app(credentials.Certificate(s.firebase_credentials_path))
        elif s.firebase_project_id:
            firebase_admin.initialize_app(options={"projectId": s.firebase_project_id})
        else:
            _ready = False
            return False
        _ready = True
    except Exception as e:  # noqa: BLE001
        log.warning("Firebase not available: %s", e)
        _ready = False
    return _ready


def configured() -> bool:
    return _init()


def verify(token: str) -> dict | None:
    """Returns {uid, email} for a valid token, else None."""
    if not _init():
        return None
    from firebase_admin import auth

    try:
        d = auth.verify_id_token(token)
        return {"uid": d["uid"], "email": d.get("email")}
    except Exception:  # noqa: BLE001 - expired, forged or malformed
        return None

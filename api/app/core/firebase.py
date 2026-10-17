"""Firebase ID token verification (server-side, via firebase-admin)."""

from __future__ import annotations

from functools import lru_cache

from app.core.errors import APIError, ErrorCode
from app.settings import settings


@lru_cache(maxsize=1)
def _app():
    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError as exc:
        raise APIError(ErrorCode.INTERNAL, "firebase-admin is not installed") from exc
    try:
        return firebase_admin.get_app()
    except ValueError:
        return firebase_admin.initialize_app(
            credentials.ApplicationDefault(),
            {"projectId": settings.firebase_project_id},
        )


def verify_id_token(id_token: str) -> dict:
    """Return the decoded claims (uid, email) or raise UNAUTHORIZED."""
    try:
        from firebase_admin import auth as fb_auth

        return fb_auth.verify_id_token(_app(), id_token, check_revoked=False)
    except APIError:
        raise
    except Exception as exc:
        raise APIError(ErrorCode.UNAUTHORIZED, "invalid login token") from exc


def try_verify_id_token(id_token: str | None) -> dict | None:
    if not id_token:
        return None
    try:
        return verify_id_token(id_token)
    except APIError:
        return None

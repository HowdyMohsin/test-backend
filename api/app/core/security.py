"""Security primitives: magic-byte detection, filename sanitizing, HMAC tokens.

Magic-byte detection never trusts the extension. Some magics are ambiguous
(all TIFF-based RAW formats share TIFF's magic), so detection returns a
candidate list and the extension must be *consistent* with at least one
candidate — it is never trusted on its own.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re
import secrets
import time
import uuid
from pathlib import Path

from app.settings import settings

_FILENAME_SAFE = re.compile(r"[^a-zA-Z0-9._-]+")


def sanitize_filename(name: str, max_len: int = 120) -> str:
    """Clean a user-supplied filename for the Content-Disposition header only.

    The name is never used on disk (disk names are always UUIDs).
    """
    base = os.path.basename(name or "file")
    base = _FILENAME_SAFE.sub("-", base).strip(".-")
    if not base:
        base = "file"
    if len(base) > max_len:
        stem, dot, ext = base.rpartition(".")
        base = (stem[: max_len - len(ext) - 1] + dot + ext) if dot else base[:max_len]
    return base


def new_uuid_name(ext: str) -> str:
    """Disk filename: UUID only, never the user's name."""
    ext = re.sub(r"[^a-z0-9]", "", (ext or "").lower())[:8]
    return f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex


# ---------------------------------------------------------------------------
# HMAC-signed tokens (download links, anonymous identity cookie)
# ---------------------------------------------------------------------------


def _hmac(data: str) -> str:
    return hmac.new(settings.hmac_secret.encode(), data.encode(), hashlib.sha256).hexdigest()


def sign_download_token(job_id: str, owner_key: str, ttl_seconds: int = 3600) -> str:
    exp = int(time.time()) + ttl_seconds
    payload = f"{job_id}.{owner_key}.{exp}"
    sig = _hmac(payload)
    raw = f"{payload}.{sig}".encode()
    return base64.urlsafe_b64encode(raw).decode()


def verify_download_token(token: str) -> tuple[str, str] | None:
    """Return (job_id, owner_key) if the token is valid and not expired."""
    try:
        raw_bytes = base64.urlsafe_b64decode(token.encode())
        # canonical form check: any appended/truncated garbage is rejected
        if base64.urlsafe_b64encode(raw_bytes).decode() != token:
            return None
        raw = raw_bytes.decode()
        job_id, owner_key, exp, sig = raw.rsplit(".", 3)
        if not hmac.compare_digest(_hmac(f"{job_id}.{owner_key}.{exp}"), sig):
            return None
        if int(exp) < int(time.time()):
            return None
        return job_id, owner_key
    except Exception:
        return None


def hash_ip(ip: str) -> str:
    """Anonymous identity: only a salted hash is stored, never the raw IP."""
    return hashlib.sha256(f"{settings.hmac_secret}:{ip}".encode()).hexdigest()[:32]


def sign_anon_cookie(anon_id: str) -> str:
    return f"{anon_id}.{_hmac(anon_id)}"


def verify_anon_cookie(value: str) -> str | None:
    try:
        anon_id, sig = value.rsplit(".", 1)
        if hmac.compare_digest(_hmac(anon_id), sig):
            return anon_id
    except Exception:
        return None
    return None


def new_anon_id() -> str:
    return f"a_{secrets.token_hex(8)}"


# ---------------------------------------------------------------------------
# Magic-byte detection
# ---------------------------------------------------------------------------
# A magic pattern is a tuple of (offset, bytes) that must ALL match, plus
# optional "contains" byte-strings that must appear within the first 4 KiB.
# `magic` holds ALTERNATIVE patterns (any one may match).

MAGIC_HEAD = 4096


def match_magic(data: bytes, pattern: tuple[tuple[int, bytes], ...]) -> bool:
    return all(data[off : off + len(needle)] == needle for off, needle in pattern)


def detect_candidates(data: bytes) -> list:
    """Return candidate FormatSpecs ordered by detection priority.

    The registry exposes `detection_order`: a list of slugs, most specific
    first (e.g. webm before mkv, opus before ogg, cr2 before tiff).
    """
    from app.formats import registry as reg  # local import: formats must not import security

    head = data[:MAGIC_HEAD]
    found: list = []
    for slug in reg.detection_order():
        spec = reg.get_format(slug)
        for pattern in spec.magic:
            if not match_magic(head, pattern):
                continue
            if spec.magic_contains and not all(c in head for c in spec.magic_contains):
                continue
            found.append(spec)
            break
    # A distinctive (non-group) match always wins over a shared-magic group.
    # E.g. CR2 has its own header marker; plain TIFF magic is ambiguous.
    distinctive = [s for s in found if not s.magic_group]
    if distinctive:
        return distinctive
    # TIFF-magic group: every TIFF-based RAW shares TIFF's magic. Return the
    # whole group so the extension can disambiguate honestly.
    group_members: list = []
    for spec in found:
        if spec.magic_group:
            group_members.extend(reg.get_magic_group(spec.magic_group))
    if group_members:
        ordered = [s for s in reg.detection_order() if reg.get_format(s) in group_members]
        return [reg.get_format(s) for s in ordered]
    if not found and head.lstrip()[:1] == b"<":
        # SVG with leading whitespace/comments: only SVG starts with "<".
        return [reg.get_format("svg")]
    return found


def extension_consistent(candidates: list, filename: str) -> object | None:
    """Pick the candidate whose extensions contain the file's extension.

    Returns None when the extension matches none of the candidates
    (extension/magic mismatch -> reject the upload).
    """
    ext = Path(filename).suffix.lower().lstrip(".")
    for spec in candidates:
        if ext in spec.extensions:
            return spec
    return None


def disk_free_mb(path: str | Path) -> float:
    stat = os.statvfs(path)
    return stat.f_bavail * stat.f_frsize / (1024 * 1024)

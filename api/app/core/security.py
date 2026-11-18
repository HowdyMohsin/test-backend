"""Small safety helpers: file names, owner keys, rate limits, download tokens."""
from __future__ import annotations

import hashlib
import re
import time
from collections import defaultdict, deque

from fastapi import Request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from ..settings import get_settings

_s = get_settings()
_tokens = URLSafeTimedSerializer(_s.secret_key, salt="download")
_hits: dict[str, deque] = defaultdict(deque)


def client_ip(request: Request) -> str:
    if _s.trust_proxy:
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"


def anon_key(ip: str) -> str:
    """Anonymous visitors are identified by a salted hash of the IP. The raw IP is never stored."""
    return "a:" + hashlib.sha256(f"{ip}|{_s.secret_key}".encode()).hexdigest()[:24]


def safe_stem(filename: str) -> str:
    base = filename.replace("\\", "/").rsplit("/", 1)[-1]
    stem = base.rsplit(".", 1)[0] if "." in base else base
    stem = re.sub(r"[^A-Za-z0-9._ ()\-]", "_", stem).strip(" .") or "file"
    return stem[:80]


def resolve_name(pattern: str, stem: str, ext: str, width: int | None, height: int | None) -> str:
    pattern = (pattern or "{name}")[:120]
    name = pattern.replace("{name}", stem).replace("{width}", str(width or "")).replace("{height}", str(height or ""))
    name = re.sub(r"[^A-Za-z0-9._ ()\-]", "_", name).strip(" .") or stem
    name = re.sub(r"[_\-x]{2,}$", "", name) or stem
    return f"{name[:100]}.{ext}"


def rate_limited(key: str, limit: int, window: int = 60) -> bool:
    now, q = time.time(), _hits[key]
    while q and q[0] < now - window:
        q.popleft()
    if len(q) >= limit:
        return True
    q.append(now)
    return False


def make_token(job_id: str) -> str:
    return _tokens.dumps({"j": job_id})


def read_token(token: str, max_age: int = 3600) -> str | None:
    try:
        return _tokens.loads(token, max_age=max_age).get("j")
    except (BadSignature, SignatureExpired):
        return None

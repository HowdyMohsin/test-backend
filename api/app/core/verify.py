"""Never report success for a broken file: open the output and check it is what we promised."""
from __future__ import annotations

import zipfile
from pathlib import Path

from ..engines.probe import media_info
from ..formats import registry


def verify_output(path: Path, dst_slug: str, category: str) -> str | None:
    """Returns None when fine, else a human-readable reason."""
    if not path.exists() or path.stat().st_size == 0:
        return "The converted file is empty."
    if path.suffix == ".zip":
        return None if zipfile.is_zipfile(path) else "The converted archive is damaged."
    head = path.read_bytes()[:4096]
    found = registry.detect(head, path.name)
    if found != dst_slug:
        return f"The converted file is not a valid {dst_slug.upper()} file."
    if category in ("audio", "video") and dst_slug != "gif":
        info = media_info(path)
        if not info.get("valid") or info.get("duration", 0) <= 0:
            return "The converted file has no playable content."
    return None

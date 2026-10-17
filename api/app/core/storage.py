"""Local storage behind a small interface (swap for S3 later without touching callers)."""

from __future__ import annotations

from pathlib import Path

from app.settings import settings


class LocalStorage:
    def __init__(self, base: str | Path | None = None) -> None:
        self.base = Path(base or settings.data_dir)

    def uploads_dir(self) -> Path:
        p = self.base / "uploads"
        p.mkdir(parents=True, exist_ok=True)
        return p

    def jobs_dir(self) -> Path:
        p = self.base / "jobs"
        p.mkdir(parents=True, exist_ok=True)
        return p

    def samples_dir(self) -> Path:
        p = self.base / "samples"
        p.mkdir(parents=True, exist_ok=True)
        return p

    def abs(self, rel_path: str) -> Path:
        # rel paths never escape the base dir (no ".." tricks from DB rows)
        p = (self.base / rel_path).resolve()
        if self.base.resolve() not in p.parents and p != self.base.resolve():
            raise ValueError("path escapes storage base")
        return p

    def rel(self, abs_path: Path) -> str:
        return str(abs_path.resolve().relative_to(self.base.resolve()))


storage = LocalStorage()

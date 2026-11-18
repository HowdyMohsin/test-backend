"""File storage behind a small interface. Local disk today, something else later."""
from __future__ import annotations

import shutil
from pathlib import Path
from uuid import UUID

from ..settings import get_settings


class LocalStorage:
    def __init__(self, root: Path):
        self.root = root.resolve()

    def upload_dir(self, upload_id: UUID | str) -> Path:
        return self.root / "uploads" / str(upload_id)

    def job_dir(self, job_id: UUID | str) -> Path:
        return self.root / "jobs" / str(job_id)

    def remove(self, path: Path) -> None:
        shutil.rmtree(path, ignore_errors=True)

    def free_bytes(self) -> int:
        self.root.mkdir(parents=True, exist_ok=True)
        return shutil.disk_usage(self.root).free


storage = LocalStorage(get_settings().data_dir)

"""Shared helpers for engines. Engines run inside a child process (see runner.py)."""
from __future__ import annotations

import json
import sys


class EngineError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def emit(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def progress(pct: float) -> None:
    emit({"t": "progress", "v": max(0, min(100, int(pct)))})

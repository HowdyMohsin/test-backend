from __future__ import annotations

from typing import Any


class ApiError(Exception):
    """Every expected failure. The handler turns it into {error: {code, message, details}}."""

    def __init__(self, code: str, message: str, status: int = 422, details: Any = None):
        super().__init__(message)
        self.code, self.message, self.status, self.details = code, message, status, details

"""Error codes (frozen by the v1 API contract) and the API error type."""

from __future__ import annotations

from enum import Enum


class ErrorCode(str, Enum):
    UNSUPPORTED_FORMAT = "unsupported_format"
    MAGIC_MISMATCH = "magic_mismatch"
    FILE_TOO_LARGE = "file_too_large"
    PIXEL_LIMIT = "pixel_limit"
    BATCH_TOO_LARGE = "batch_too_large"
    QUOTA_EXCEEDED = "quota_exceeded"
    PAIR_NOT_AVAILABLE = "pair_not_available"
    PLAN_REQUIRED = "plan_required"
    CORRUPT_FILE = "corrupt_file"
    JOB_TIMEOUT = "job_timeout"
    BANNED = "banned"
    INTERNAL = "internal"
    NOT_FOUND = "not_found"
    UNAUTHORIZED = "unauthorized"
    FORBIDDEN = "forbidden"
    BAD_REQUEST = "bad_request"
    UPLOAD_EXPIRED = "upload_expired"
    RATE_LIMITED = "rate_limited"


# HTTP status per error code (spec 4.4: 413 size, 429 quota, 403 plan/ban, 422 rest)
HTTP_STATUS: dict[ErrorCode, int] = {
    ErrorCode.FILE_TOO_LARGE: 413,
    ErrorCode.QUOTA_EXCEEDED: 429,
    ErrorCode.RATE_LIMITED: 429,
    ErrorCode.PLAN_REQUIRED: 403,
    ErrorCode.BANNED: 403,
    ErrorCode.FORBIDDEN: 403,
    ErrorCode.UNAUTHORIZED: 401,
    ErrorCode.NOT_FOUND: 404,
}


class APIError(Exception):
    """Raised by services; converted to the frozen error shape by the exception handler."""

    def __init__(self, code: ErrorCode, message: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}

    @property
    def http_status(self) -> int:
        return HTTP_STATUS.get(self.code, 422)

    def to_dict(self) -> dict:
        return {"error": {"code": self.code.value, "message": self.message, "details": self.details}}

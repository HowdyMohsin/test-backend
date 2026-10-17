"""Application settings loaded from environment (.env)."""

from __future__ import annotations

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "dev"
    app_version: str = "2.1.0"
    role: str = "both"  # api | worker | both

    database_url: str = "postgresql+asyncpg://qic:qic_secret@db:5432/qic"

    data_dir: str = "/data"
    max_upload_mb: int = 4096

    firebase_project_id: str = "quick-img-convert"
    admin_cookie_name: str = "qic_admin_session"
    admin_session_ttl_hours: int = 12
    anon_cookie_name: str = "qic_anon"
    hmac_secret: str = "change-me-to-a-long-random-string"

    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    worker_count: int = 4
    job_timeout_base_sec: int = 60
    job_timeout_per_mb_sec: float = 2.0
    job_timeout_per_video_sec: float = 1.5
    job_timeout_max_sec: int = 7200

    max_pixels: int = 100_000_000
    pdf_page_cap: int = 50
    svg_max_bytes: int = 10 * 1024 * 1024
    psd_max_dim: int = 30000
    upload_ttl_hours: int = 2
    download_ttl_hours: int = 1
    cleanup_interval_min: int = 5
    disk_min_free_mb: int = 2048

    @field_validator("role")
    @classmethod
    def _check_role(cls, v: str) -> str:
        if v not in ("api", "worker", "both"):
            raise ValueError("ROLE must be api, worker or both")
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()

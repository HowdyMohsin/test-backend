"""All configuration comes from environment variables (see .env.example)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "dev"  # dev | prod. Dev enables the X-Dev-User login shortcut.
    role: str = "both"  # api | worker | both
    database_url: str = "postgresql+asyncpg://qic:qic@localhost:5432/qic"
    secret_key: str = "change-me-in-real-use"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    data_dir: Path = Path("./data")
    samples_dir: Path | None = None  # folder with real sample files for the selfcheck (default: <data_dir>/samples)
    retention_minutes: int = 60
    workers: int = 4
    trust_proxy: bool = False  # honour X-Forwarded-For (only behind a proxy you control)
    firebase_project_id: str = ""
    firebase_credentials_path: str = ""
    max_pixels: int = 100_000_000
    max_pdf_pages: int = 50
    upload_rate_per_minute: int = 60
    default_admin_email: str = ""  # dev only: created on first start when no admin exists
    default_admin_password: str = ""
    version: str = "2.0.0"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sync_database_url(self) -> str:
        return self.database_url.replace("+asyncpg", "+psycopg2")


@lru_cache
def get_settings() -> Settings:
    return Settings()

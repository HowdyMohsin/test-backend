"""Every table. Alembic reads Base.metadata from here."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..base import Base

now = func.now()
_id = lambda: mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)  # noqa: E731


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = _id()
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(320))
    plan: Mapped[str] = mapped_column(String(32), default="free")
    banned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now)


class Quota(Base):
    __tablename__ = "quotas"
    owner_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    used: Mapped[int] = mapped_column(Integer, default=0)


class Upload(Base):
    __tablename__ = "uploads"
    id: Mapped[uuid.UUID] = _id()
    owner_key: Mapped[str] = mapped_column(String(64), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    size: Mapped[int] = mapped_column(BigInteger)
    detected_format: Mapped[str] = mapped_column(String(16))
    category: Mapped[str] = mapped_column(String(16))
    info: Mapped[dict] = mapped_column(JSONB, default=dict)
    path: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[uuid.UUID] = _id()
    batch_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)
    owner_key: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    upload_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    pair_slug: Mapped[str] = mapped_column(String(40), index=True)
    from_slug: Mapped[str] = mapped_column(String(16))
    to_slug: Mapped[str] = mapped_column(String(16))
    category: Mapped[str] = mapped_column(String(16))
    route: Mapped[str] = mapped_column(String(24))
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)
    name_pattern: Mapped[str] = mapped_column(String(120), default="{name}")
    plan: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(16), default="queued", index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    timeout_s: Mapped[int] = mapped_column(Integer, default=600)
    error_code: Mapped[str | None] = mapped_column(String(40))
    error_message: Mapped[str | None] = mapped_column(Text)
    out_name: Mapped[str | None] = mapped_column(String(255))
    out_path: Mapped[str | None] = mapped_column(Text)
    out_size: Mapped[int | None] = mapped_column(BigInteger)
    source_name: Mapped[str | None] = mapped_column(String(255))
    in_size: Mapped[int | None] = mapped_column(BigInteger)
    out_info: Mapped[dict] = mapped_column(JSONB, default=dict)
    notes: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Event(Base):
    """One row per finished job. Raw rows are kept 90 days, then rolled into EventDaily."""
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now, index=True)
    owner_type: Mapped[str] = mapped_column(String(8))
    plan: Mapped[str] = mapped_column(String(32))
    pair_slug: Mapped[str] = mapped_column(String(40), index=True)
    category: Mapped[str] = mapped_column(String(16))
    route: Mapped[str] = mapped_column(String(24))
    status: Mapped[str] = mapped_column(String(16))
    error_code: Mapped[str | None] = mapped_column(String(40))
    bytes_in: Mapped[int] = mapped_column(BigInteger, default=0)
    bytes_out: Mapped[int] = mapped_column(BigInteger, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    queue_ms: Mapped[int] = mapped_column(Integer, default=0)


class EventDaily(Base):
    __tablename__ = "event_daily"
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    pair_slug: Mapped[str] = mapped_column(String(40), primary_key=True)
    status: Mapped[str] = mapped_column(String(16), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
    bytes_in: Mapped[int] = mapped_column(BigInteger, default=0)
    bytes_out: Mapped[int] = mapped_column(BigInteger, default=0)
    sum_duration_ms: Mapped[int] = mapped_column(BigInteger, default=0)


class Plan(Base):
    __tablename__ = "plans"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(64))
    price_cents: Mapped[int] = mapped_column(Integer, default=0)
    limits: Mapped[dict] = mapped_column(JSONB, default=dict)
    sort: Mapped[int] = mapped_column(Integer, default=0)


class Message(Base):
    __tablename__ = "messages"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    locale: Mapped[str] = mapped_column(String(8), primary_key=True, default="en")
    text: Mapped[str] = mapped_column(Text)


class Preset(Base):
    __tablename__ = "presets"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(16))
    key: Mapped[str] = mapped_column(String(32))
    label: Mapped[str] = mapped_column(String(64))
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)
    sort: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    __table_args__ = (Index("ux_presets_cat_key", "category", "key", unique=True),)


class FormatState(Base):
    """Admin-controlled state for a format (key = slug) or a pair (key = jpg-to-png)."""
    __tablename__ = "format_state"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    kind: Mapped[str] = mapped_column(String(8))  # format | pair
    visible: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(12), default="testing")  # live | testing | broken
    plans: Mapped[list] = mapped_column(JSONB, default=lambda: ["free", "basic", "pro"])
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[str | None] = mapped_column(Text)
    last_check_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SelfcheckRun(Base):
    __tablename__ = "selfcheck_runs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    total: Mapped[int] = mapped_column(Integer, default=0)
    passed: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    skipped: Mapped[int] = mapped_column(Integer, default=0)
    report: Mapped[dict] = mapped_column(JSONB, default=dict)


class AdSlot(Base):
    __tablename__ = "ad_slots"
    key: Mapped[str] = mapped_column(String(32), primary_key=True)
    label: Mapped[str] = mapped_column(String(120))
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    code: Mapped[str] = mapped_column(Text, default="")


class SiteSetting(Base):
    __tablename__ = "site_settings"
    key: Mapped[str] = mapped_column(String(48), primary_key=True)
    value: Mapped[dict | list | str | int | bool | None] = mapped_column(JSONB)


class AdminUser(Base):
    __tablename__ = "admin_users"
    id: Mapped[uuid.UUID] = _id()
    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(16), default="staff")  # super_admin | staff
    tabs: Mapped[list] = mapped_column(JSONB, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    totp_secret: Mapped[str | None] = mapped_column(String(64))  # reserved for 2FA
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AdminApiKey(Base):
    __tablename__ = "admin_api_keys"
    id: Mapped[uuid.UUID] = _id()
    name: Mapped[str] = mapped_column(String(64))
    key_hash: Mapped[str] = mapped_column(String(128), unique=True)
    created_by: Mapped[str] = mapped_column(String(320))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Waitlist(Base):
    """People who clicked Upgrade while payments are not connected yet."""
    __tablename__ = "waitlist"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    plan: Mapped[str] = mapped_column(String(32), default="pro")
    source: Mapped[str | None] = mapped_column(String(32))  # which popup they came from
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=now, index=True)
    admin_email: Mapped[str] = mapped_column(String(320))
    action: Mapped[str] = mapped_column(String(64))
    target: Mapped[str] = mapped_column(String(120))
    before: Mapped[dict | list | None] = mapped_column(JSONB)
    after: Mapped[dict | list | None] = mapped_column(JSONB)


__all__ = [n for n, v in list(globals().items()) if isinstance(v, type) and issubclass(v, Base) and v is not Base] + ["Base"]

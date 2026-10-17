"""Database models. Every schema change goes through an Alembic migration."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid: Mapped[str | None] = mapped_column(String(128), unique=True)
    email: Mapped[str | None] = mapped_column(String(320))
    plan_id: Mapped[str] = mapped_column(String(32), default="free")
    banned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # free | pro
    name: Mapped[str] = mapped_column(String(64))
    price_cents: Mapped[int] = mapped_column(Integer, default=0)
    limits: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Message(Base):
    __tablename__ = "messages"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    text: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Quota(Base):
    __tablename__ = "quotas"
    __table_args__ = (UniqueConstraint("owner_key", "day", name="uq_quotas_owner_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_key: Mapped[str] = mapped_column(String(128), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    used: Mapped[int] = mapped_column(Integer, default=0)


class Upload(Base):
    __tablename__ = "uploads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_key: Mapped[str] = mapped_column(String(128), index=True)
    format_slug: Mapped[str] = mapped_column(String(32), index=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    rel_path: Mapped[str] = mapped_column(String(512))
    ext: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_key: Mapped[str] = mapped_column(String(128), index=True)
    upload_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("uploads.id", ondelete="SET NULL")
    )
    from_format: Mapped[str] = mapped_column(String(32))
    to_format: Mapped[str] = mapped_column(String(32))
    pair_slug: Mapped[str] = mapped_column(String(64), index=True)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(16), default="queued", index=True)
    progress: Mapped[float] = mapped_column(default=0.0)
    queue_position: Mapped[int | None] = mapped_column(Integer)
    error_code: Mapped[str | None] = mapped_column(String(64))
    error_message: Mapped[str | None] = mapped_column(Text)
    output_rel_path: Mapped[str | None] = mapped_column(String(512))
    output_size: Mapped[int | None] = mapped_column(BigInteger)
    output_name: Mapped[str | None] = mapped_column(String(256))
    plan_id: Mapped[str] = mapped_column(String(32), default="free")
    video_seconds: Mapped[float | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    owner_key: Mapped[str] = mapped_column(String(128))
    plan_id: Mapped[str] = mapped_column(String(32))
    pair_slug: Mapped[str] = mapped_column(String(64), index=True)
    from_format: Mapped[str] = mapped_column(String(32))
    to_format: Mapped[str] = mapped_column(String(32))
    input_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    output_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16))  # done | failed
    error_code: Mapped[str | None] = mapped_column(String(64))
    is_video: Mapped[bool] = mapped_column(Boolean, default=False)


class EventDaily(Base):
    __tablename__ = "event_daily"
    __table_args__ = (UniqueConstraint("day", "pair_slug", "plan_id", name="uq_event_daily"),)

    day: Mapped[date] = mapped_column(Date, primary_key=True)
    pair_slug: Mapped[str] = mapped_column(String(64), primary_key=True)
    plan_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    conversions: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    input_bytes: Mapped[int] = mapped_column(BigInteger, default=0)


class FormatState(Base):
    __tablename__ = "format_state"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)  # slug or "pair:<slug>"
    visible: Mapped[bool] = mapped_column(Boolean, default=True)
    plans: Mapped[list] = mapped_column(JSONB, default=lambda: ["anonymous", "free", "pro"])
    status: Mapped[str] = mapped_column(String(16), default="testing")  # live | testing | broken
    note: Mapped[str] = mapped_column(Text, default="")
    last_check_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SelfcheckRun(Base):
    __tablename__ = "selfcheck_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    total: Mapped[int] = mapped_column(Integer, default=0)
    passed: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    testing: Mapped[int] = mapped_column(Integer, default=0)
    details: Mapped[dict] = mapped_column(JSONB, default=dict)


class AdSlot(Base):
    __tablename__ = "ad_slots"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # slot name
    code: Mapped[str] = mapped_column(Text, default="")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(String(16), default="admin")  # owner | admin | viewer
    allowed_tabs: Mapped[list] = mapped_column(JSONB, default=list)
    totp_secret: Mapped[str | None] = mapped_column(String(64))
    disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AdminSession(Base):
    __tablename__ = "admin_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    admin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admin_users.id", ondelete="CASCADE")
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ip: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admin_users.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(String(128))
    target: Mapped[str | None] = mapped_column(String(256))
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    ip: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

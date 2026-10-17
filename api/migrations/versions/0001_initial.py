"""Initial schema: all v2 tables (spec 4.9)."""

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


from alembic import op  # noqa: E402
import sqlalchemy as sa  # noqa: E402
from sqlalchemy.dialects import postgresql  # noqa: E402


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("firebase_uid", sa.String(128), unique=True),
        sa.Column("email", sa.String(320)),
        sa.Column("plan_id", sa.String(32), server_default="free", nullable=False),
        sa.Column("banned", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "plans",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("price_cents", sa.Integer(), server_default="0", nullable=False),
        sa.Column("limits", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "messages",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "quotas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("owner_key", sa.String(128), nullable=False, index=True),
        sa.Column("day", sa.Date(), nullable=False, index=True),
        sa.Column("used", sa.Integer(), server_default="0", nullable=False),
        sa.UniqueConstraint("owner_key", "day", name="uq_quotas_owner_day"),
    )
    op.create_table(
        "uploads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_key", sa.String(128), nullable=False, index=True),
        sa.Column("format_slug", sa.String(32), nullable=False, index=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("rel_path", sa.String(512), nullable=False),
        sa.Column("ext", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False, index=True),
    )
    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_key", sa.String(128), nullable=False, index=True),
        sa.Column("upload_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("uploads.id", ondelete="SET NULL")),
        sa.Column("from_format", sa.String(32), nullable=False),
        sa.Column("to_format", sa.String(32), nullable=False),
        sa.Column("pair_slug", sa.String(64), nullable=False, index=True),
        sa.Column("settings", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("status", sa.String(16), server_default="queued", nullable=False, index=True),
        sa.Column("progress", sa.Float(), server_default="0", nullable=False),
        sa.Column("queue_position", sa.Integer()),
        sa.Column("error_code", sa.String(64)),
        sa.Column("error_message", sa.Text()),
        sa.Column("output_rel_path", sa.String(512)),
        sa.Column("output_size", sa.BigInteger()),
        sa.Column("output_name", sa.String(256)),
        sa.Column("plan_id", sa.String(32), server_default="free", nullable=False),
        sa.Column("video_seconds", sa.Float()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        sa.Column("owner_key", sa.String(128), nullable=False),
        sa.Column("plan_id", sa.String(32), nullable=False),
        sa.Column("pair_slug", sa.String(64), nullable=False, index=True),
        sa.Column("from_format", sa.String(32), nullable=False),
        sa.Column("to_format", sa.String(32), nullable=False),
        sa.Column("input_bytes", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("output_bytes", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("duration_ms", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("error_code", sa.String(64)),
        sa.Column("is_video", sa.Boolean(), server_default="false", nullable=False),
    )
    op.create_table(
        "event_daily",
        sa.Column("day", sa.Date(), primary_key=True),
        sa.Column("pair_slug", sa.String(64), primary_key=True),
        sa.Column("plan_id", sa.String(32), primary_key=True),
        sa.Column("conversions", sa.Integer(), server_default="0", nullable=False),
        sa.Column("failed", sa.Integer(), server_default="0", nullable=False),
        sa.Column("input_bytes", sa.BigInteger(), server_default="0", nullable=False),
    )
    op.create_table(
        "format_state",
        sa.Column("key", sa.String(80), primary_key=True),
        sa.Column("visible", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("plans", postgresql.JSONB(), server_default='["anonymous","free","pro"]', nullable=False),
        sa.Column("status", sa.String(16), server_default="testing", nullable=False),
        sa.Column("note", sa.Text(), server_default="", nullable=False),
        sa.Column("last_check_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "selfcheck_runs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("total", sa.Integer(), server_default="0", nullable=False),
        sa.Column("passed", sa.Integer(), server_default="0", nullable=False),
        sa.Column("failed", sa.Integer(), server_default="0", nullable=False),
        sa.Column("testing", sa.Integer(), server_default="0", nullable=False),
        sa.Column("details", postgresql.JSONB(), server_default="{}", nullable=False),
    )
    op.create_table(
        "ad_slots",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("code", sa.Text(), server_default="", nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "admin_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(256), nullable=False),
        sa.Column("role", sa.String(16), server_default="admin", nullable=False),
        sa.Column("allowed_tabs", postgresql.JSONB(), server_default="[]", nullable=False),
        sa.Column("totp_secret", sa.String(64)),
        sa.Column("disabled", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "admin_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("token_hash", sa.String(128), unique=True, nullable=False, index=True),
        sa.Column("admin_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("admin_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("ip", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("admin_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("admin_users.id", ondelete="SET NULL")),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("target", sa.String(256)),
        sa.Column("details", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("ip", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("value", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    for table in (
        "app_settings", "audit_log", "admin_sessions", "admin_users", "ad_slots",
        "selfcheck_runs", "format_state", "event_daily", "events", "jobs",
        "uploads", "quotas", "messages", "plans", "users",
    ):
        op.drop_table(table)

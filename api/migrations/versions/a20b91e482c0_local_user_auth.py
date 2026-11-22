"""local user authentication

Revision ID: a20b91e482c0
Revises: f2418418856f
"""
from alembic import op
import sqlalchemy as sa


revision = "a20b91e482c0"
down_revision = "f2418418856f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_users_firebase_uid", table_name="users")
    op.alter_column("users", "firebase_uid", new_column_name="auth_subject")
    op.create_index("ix_users_auth_subject", "users", ["auth_subject"], unique=True)
    op.add_column("users", sa.Column("email_normalized", sa.String(length=320), nullable=True))
    op.add_column("users", sa.Column("password_hash", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute("update users set email_normalized = lower(trim(email)) where email is not null")
    op.create_index("ix_users_email_normalized", "users", ["email_normalized"], unique=True)
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"], unique=False)
    op.create_index("ix_user_sessions_expires_at", "user_sessions", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_sessions_expires_at", table_name="user_sessions")
    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_index("ix_users_email_normalized", table_name="users")
    op.drop_column("users", "must_change_password")
    op.drop_column("users", "password_hash")
    op.drop_column("users", "email_normalized")
    op.drop_index("ix_users_auth_subject", table_name="users")
    op.alter_column("users", "auth_subject", new_column_name="firebase_uid")
    op.create_index("ix_users_firebase_uid", "users", ["firebase_uid"], unique=True)

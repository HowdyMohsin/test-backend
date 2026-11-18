from alembic import context
from sqlalchemy import create_engine

from app.db.models import Base
from app.settings import get_settings

target_metadata = Base.metadata


def run() -> None:
    engine = create_engine(get_settings().sync_database_url)
    with engine.connect() as conn:
        context.configure(connection=conn, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


run()

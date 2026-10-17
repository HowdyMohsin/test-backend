#!/bin/sh
# Migrate, seed, then hand off to the CMD (uvicorn).
set -e
alembic upgrade head
python -m app.cli seed
exec "$@"

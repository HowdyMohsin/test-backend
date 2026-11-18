#!/bin/sh
set -e
echo "Applying database migrations..."
alembic upgrade head
echo "Seeding plans, messages, presets and format list (safe to repeat)..."
python -m app.cli seed
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

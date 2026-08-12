#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
uv run alembic upgrade head

echo "[entrypoint] Starting API server..."
exec uv run uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"

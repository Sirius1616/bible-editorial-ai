#!/bin/sh
set -e

PORT="${PORT:-80}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "[entrypoint] PORT=${PORT} BACKEND_URL=${BACKEND_URL}" >&2
echo "[entrypoint] files in html:" >&2
ls -la /usr/share/nginx/html | head -20 >&2

exec nginx -g "daemon off;"
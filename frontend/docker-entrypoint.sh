#!/bin/sh
set -e

PORT="${PORT:-80}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
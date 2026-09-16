#!/bin/sh
set -e

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
envsubst '${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
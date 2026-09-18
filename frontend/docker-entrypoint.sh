#!/bin/sh
set -e

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
RESOLVER="$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf)"
: "${RESOLVER:=1.1.1.1}"
export RESOLVER
envsubst '${BACKEND_URL} ${RESOLVER}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
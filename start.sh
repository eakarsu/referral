#!/usr/bin/env bash
set -euo pipefail
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_dir=${RUNTIME_PROJECT_SOURCE:-$script_dir}
server_port=${SERVER_PORT:-}
[[ "$server_port" =~ ^[0-9]+$ ]] && (( server_port >= 1024 && server_port <= 65535 )) || { echo 'SERVER_PORT must be an explicitly assigned numeric port' >&2; exit 1; }
[ -d "$project_dir/server/node_modules" ] || { echo 'Server dependencies are missing; install them before startup' >&2; exit 1; }
[ -f "$project_dir/client/dist/index.html" ] || { echo 'Client build missing' >&2; exit 1; }
: "${DATABASE_URL:?DATABASE_URL required}"; : "${JWT_SECRET:?JWT_SECRET required}"; : "${CORS_ORIGINS:?CORS_ORIGINS required}"
[ "${#JWT_SECRET}" -ge 32 ] || { echo 'JWT_SECRET must contain at least 32 characters' >&2; exit 1; }
lsof -nP -iTCP:"$server_port" -sTCP:LISTEN >/dev/null 2>&1 && { echo "Port $server_port occupied; refusing to stop another process" >&2; exit 1; }
cd "$project_dir/server"
SERVER_PORT="$server_port" exec node index.js

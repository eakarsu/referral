#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
env_file="$project_dir/.env"
[ -f "$env_file" ] || { echo "Missing required file: $env_file" >&2; exit 1; }
load_env_file() {
  local line key value
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^[[:space:]]*# || "$line" =~ ^[[:space:]]*$ ]] && continue
    line="${line#export }"
    key="${line%%=*}"
    value="${line#*=}"
    key="${key//[[:space:]]/}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    [ -n "${!key+x}" ] && continue
    if [[ "$value" == \"*\" && "$value" == *\" ]]; then value="${value:1:${#value}-2}"; fi
    if [[ "$value" == \'*\' && "$value" == *\' ]]; then value="${value:1:${#value}-2}"; fi
    export "$key=$value"
  done < "$env_file"
}
load_env_file

: "${SERVER_PORT:?SERVER_PORT is required}"
: "${FRONTEND_PORT:?FRONTEND_PORT is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${CORS_ORIGINS:?CORS_ORIGINS is required}"
: "${OPENROUTER_API_KEY:?OPENROUTER_API_KEY is required}"
: "${OPENROUTER_MODEL:?OPENROUTER_MODEL is required}"
[ "${OPENROUTER_BASE_URL:-}" = "https://openrouter.ai/api/v1" ] || { echo 'Exact OPENROUTER_BASE_URL is required' >&2; exit 1; }
[ "$SERVER_PORT" = 30952 ] && [ "$FRONTEND_PORT" = 30953 ] || { echo 'Expected assigned ports 30952/30953' >&2; exit 1; }
[ -d "$project_dir/server/node_modules" ] || { echo 'Server dependencies are missing' >&2; exit 1; }
[ -d "$project_dir/client/node_modules" ] || { echo 'Client dependencies are missing' >&2; exit 1; }
[ -f "$project_dir/client/dist/index.html" ] || { echo 'Client build is missing' >&2; exit 1; }
for app_port in "$SERVER_PORT" "$FRONTEND_PORT"; do
  lsof -nP -iTCP:"$app_port" -sTCP:LISTEN >/dev/null 2>&1 && { echo "Port $app_port is already in use" >&2; exit 1; }
done

children=()
cleanup() {
  trap - EXIT INT TERM HUP
  for pid in "${children[@]}"; do kill -TERM "$pid" 2>/dev/null || true; done
  for pid in "${children[@]}"; do wait "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM HUP

(cd "$project_dir/server" && exec node index.js) &
children+=("$!")
(cd "$project_dir/client" && exec env API_PROXY_TARGET="http://127.0.0.1:$SERVER_PORT" npm run preview -- --host 127.0.0.1 --port "$FRONTEND_PORT" --strictPort) &
children+=("$!")
while :; do
  for pid in "${children[@]}"; do
    kill -0 "$pid" 2>/dev/null || { wait "$pid"; exit $?; }
  done
  sleep 1
done

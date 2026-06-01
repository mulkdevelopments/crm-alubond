#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTS=(3000 4000)

kill_port_if_busy() {
  local port="$1"
  local pids

  pids="$(lsof -ti "tcp:${port}" || true)"
  if [[ -n "${pids}" ]]; then
    echo "Killing process(es) on port ${port}: ${pids}"
    kill -9 ${pids} || true
  else
    echo "Port ${port} is free"
  fi
}

for port in "${PORTS[@]}"; do
  kill_port_if_busy "${port}"
done

echo "Starting postgres on :5433 (docker compose)"
docker compose -f "${ROOT_DIR}/docker-compose.yml" up -d postgres

cleanup() {
  echo "Stopping frontend/backend dev servers..."
  [[ -n "${BACK_PID:-}" ]] && kill "${BACK_PID}" 2>/dev/null || true
  [[ -n "${FRONT_PID:-}" ]] && kill "${FRONT_PID}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "Starting backend on :4000"
npm run dev --prefix "${ROOT_DIR}/backend" &
BACK_PID=$!

echo "Starting frontend on :3000"
npm run dev --prefix "${ROOT_DIR}/frontend" &
FRONT_PID=$!

wait "${BACK_PID}" "${FRONT_PID}"

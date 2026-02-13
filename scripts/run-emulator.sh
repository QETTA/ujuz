#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_CONFIG_WIN='C:\\temp\\dockercfg'
DOCKER_COMPOSE_UP_DONE=0

set +H
if [[ -f "$ROOT_DIR/.env.local" ]]; then
  set -a
  # shellcheck source=/dev/null
  # 환경변수 파일은 UTF-8 KEY=VALUE 포맷 기준으로 읽음
  source "$ROOT_DIR/.env.local"
  set +a
fi

find_free_port() {
  local port="$1"
  while true; do
    if ! ss -ltn "sport = :$port" 2>/dev/null | rg -q LISTEN; then
      echo "$port"
      return 0
    fi
    port=$((port + 1))
  done
}

TARGET_PORT="${PORT:-4000}"
FORCE_PORT="${EMULATOR_FORCE_PORT:-0}"

if [[ "$FORCE_PORT" == "1" ]]; then
  if ss -ltn "sport = :$TARGET_PORT" 2>/dev/null | rg -q LISTEN; then
    echo "Port $TARGET_PORT is already in use. Set EMULATOR_FORCE_PORT=0 or choose another PORT."
    echo "Tip: PORT=$((TARGET_PORT + 1)) pnpm emulator"
    exit 1
  fi
  PORT="$TARGET_PORT"
else
  FREE_PORT="$(find_free_port "$TARGET_PORT")"
  if [[ "$FREE_PORT" != "$TARGET_PORT" ]]; then
    echo "Port $TARGET_PORT is in use. Using free port $FREE_PORT."
    PORT="$FREE_PORT"
  fi
fi

if command -v docker-compose >/dev/null 2>&1; then
  if docker-compose -f "$ROOT_DIR/docker-compose.yml" up -d; then
    DOCKER_COMPOSE_UP_DONE=1
  else
    echo "linux docker-compose is not connected to Docker daemon."
  fi
else
  echo "linux docker-compose not found."
fi

if [[ "$DOCKER_COMPOSE_UP_DONE" -eq 0 ]] && command -v cmd.exe >/dev/null 2>&1; then
  echo "Trying Windows docker-compose fallback..."
  if cmd.exe /c "set DOCKER_CONFIG=${DOCKER_CONFIG_WIN} && C:\\Progra~1\\Docker\\Docker\\resources\\bin\\docker-compose.exe -f C:\\Users\\sihu2\\ujuz-api\\docker-compose.yml up -d"; then
    DOCKER_COMPOSE_UP_DONE=1
  else
    echo "Windows docker-compose fallback failed."
  fi
fi

if [[ "$DOCKER_COMPOSE_UP_DONE" -eq 0 ]]; then
  echo "Skipping automatic DB boot in this WSL context."
  echo "Run this once in Windows shell if DB is not running:"
  echo "  cmd.exe /c \"set DOCKER_CONFIG=C:\\temp\\dockercfg && C:\\Progra~1\\Docker\\Docker\\resources\\bin\\docker-compose.exe -f C:\\Users\\sihu2\\ujuz-api\\docker-compose.yml up -d\""
  echo "Continuing API startup in emulator mode..."
else
  echo "MongoDB container boot requested."
fi

export PORT="${PORT:-4000}"

echo "UjuZ emulator started. API: http://127.0.0.1:${PORT}"
echo "MongoDB: docker-compose up -d for $ROOT_DIR/docker-compose.yml"

pnpm dev:api

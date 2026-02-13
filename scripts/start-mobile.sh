#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

case "${1:-}" in
  "")
    exec pnpm run dev:api
    ;;
  "--android"|"--bg"|"--tunnel"|"--check"|"--url")
    # 이전 모바일 런처가 사라진 환경을 위해 호환용 no-op 처리
    echo "start-mobile.sh flag '${1}' is ignored in this repository backend mode."
    echo "Running API emulator directly..."
    exec pnpm run dev:api
    ;;
  "--stop")
    echo "stop requested: mobile/runtime launcher unavailable in this environment."
    exit 0
    ;;
  *)
    echo "Unsupported flag: ${1}"
    echo "Use: bash ./scripts/start-mobile.sh [--android|--bg|--tunnel|--check|--url|--stop]"
    exit 1
    ;;
esac

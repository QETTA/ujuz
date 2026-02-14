#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[refactor] validating local toolchain"

required_tools=(pnpm rg git)
for tool in "${required_tools[@]}"; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "[refactor][error] required tool missing: $tool"
    exit 1
  fi
  echo "[refactor][ok] found: $tool"
done

echo "[refactor] installing dependencies if node_modules is missing"
if [[ ! -d node_modules ]]; then
  pnpm install
else
  echo "[refactor][skip] node_modules already exists"
fi

echo "[refactor] running baseline checks"
pnpm typecheck
pnpm test

echo "[refactor] baseline checks complete"

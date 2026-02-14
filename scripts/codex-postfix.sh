#!/bin/bash
# Codex 후처리 자동화 스크립트
# 사용법: bash scripts/codex-postfix.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Codex 후처리 시작 ==="

# 1. 보호 파일 되돌리기
PROTECTED="tsconfig.json vitest.config.ts .env.example .gitignore"
for f in $PROTECTED; do
  if git diff --name-only | grep -q "^$f$"; then
    echo "[복원] $f"
    git checkout -- "$f"
  fi
done

# 2. mobile/_layout.tsx 보호
if git diff --name-only | grep -q "mobile/src/app/_layout.tsx"; then
  echo "[복원] mobile/src/app/_layout.tsx"
  git checkout -- mobile/src/app/_layout.tsx
fi

# 3. 정크 파일 삭제
for junk in dist/ index.ts src/api/ tsconfig.build.json; do
  if [ -e "$junk" ]; then
    echo "[삭제] $junk"
    rm -rf "$junk"
  fi
done

# 4. untracked 정크 docs 삭제 (연구용 파일)
for f in $(git ls-files --others --exclude-standard docs/ 2>/dev/null); do
  case "$f" in
    docs/CANONICAL-SPEC.md|docs/CODEX-TASKS.md|docs/openapi.yaml|docs/design/*) ;;
    *) echo "[삭제] $f"; rm -f "$f" ;;
  esac
done

# 5. typecheck
echo "=== pnpm typecheck ==="
pnpm typecheck 2>&1 | tail -5

echo "=== 후처리 완료 ==="

#!/bin/bash
# Codex-Spark 후처리 스크립트
# 사용법: bash scripts/codex-post-process.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Codex 후처리 시작 ===${NC}"

# 1) 보호 파일 복원
echo -e "\n${GREEN}[1/5] 보호 파일 복원${NC}"
PROTECTED="tsconfig.json vitest.config.ts package.json .env.example .gitignore"
for f in $PROTECTED; do
  if git diff --quiet -- "$f" 2>/dev/null; then
    echo "  ✓ $f (변경 없음)"
  else
    git checkout -- "$f" 2>/dev/null && echo "  ↩ $f 복원됨" || echo "  - $f (미추적)"
  fi
done

# 2) Codex 정크 삭제
echo -e "\n${GREEN}[2/5] Codex 정크 삭제${NC}"
JUNK_DIRS="dist/ tsconfig.build.json"
JUNK_FILES="src/index.ts nul"
for j in $JUNK_DIRS; do
  if [ -e "$j" ]; then
    rm -rf "$j" && echo "  🗑 $j 삭제됨"
  fi
done
for j in $JUNK_FILES; do
  if [ -f "$j" ]; then
    rm -f "$j" && echo "  🗑 $j 삭제됨"
  fi
done
echo "  ✓ 정크 확인 완료"

# 3) pino-style 로거 감지
echo -e "\n${GREEN}[3/5] pino-style 로거 감지${NC}"
PINO_COUNT=0
while IFS= read -r f; do
  PINO_COUNT=$((PINO_COUNT + 1))
  echo -e "  ${RED}⚠ pino-style 감지: $f${NC}"
done < <(grep -rn 'logger\.\(error\|warn\|info\|debug\)({' src/ --include="*.ts" --include="*.tsx" -l 2>/dev/null || true)
if [ "$PINO_COUNT" -eq 0 ]; then
  echo "  ✓ pino-style 없음"
fi

# 4) 새로 생성된 파일 확인
echo -e "\n${GREEN}[4/5] 신규/변경 파일 목록${NC}"
echo "  --- Modified ---"
git diff --name-only 2>/dev/null | head -30 || true
echo "  --- Untracked ---"
git ls-files --others --exclude-standard 2>/dev/null | grep -v node_modules | grep -v .next | head -30 || true

# 5) TypeScript 체크 (Codex 변경 파일 에러만 필터)
echo -e "\n${GREEN}[5/5] TypeScript 체크${NC}"
CHANGED_FILES=$(git diff --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null | grep -v node_modules | grep -v .next)
TS_ERRORS=$(pnpm typecheck 2>&1 || true)

# 기존 이슈 제외 필터
FILTERED=$(echo "$TS_ERRORS" | grep "error TS" | grep -v "Cannot find module" | grep -v "JSX.IntrinsicElements" | grep -v "Cannot find namespace" | grep -v ".next/types" || true)

# 변경된 파일에 해당하는 에러만
NEW_ERRORS=0
while IFS= read -r pattern; do
  [ -z "$pattern" ] && continue
  MATCHES=$(echo "$FILTERED" | grep "$pattern" || true)
  if [ -n "$MATCHES" ]; then
    echo "$MATCHES"
    NEW_ERRORS=$((NEW_ERRORS + $(echo "$MATCHES" | wc -l)))
  fi
done < <(echo "$CHANGED_FILES" | sed 's/^//' | grep -E '\.(ts|tsx)$' | sed 's|/|/|g')

if [ "$NEW_ERRORS" -eq 0 ]; then
  echo -e "  ${GREEN}✓ Codex 변경 파일 에러 0개${NC}"
else
  echo -e "\n  ${RED}⚠ Codex 변경 파일 에러 ${NEW_ERRORS}개 — 수동 수정 필요${NC}"
fi

echo -e "\n${YELLOW}=== 후처리 완료 ===${NC}"

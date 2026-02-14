#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TASK_INPUT="${*:-전체 코드베이스 리팩토링을 진행하고, 변경 후 typecheck/test를 통과하도록 수정해줘.}"

if ! command -v codex >/dev/null 2>&1; then
  echo "[codex-refactor][error] codex CLI를 찾을 수 없습니다. (@openai/codex 설치 필요)"
  exit 1
fi

echo "[codex-refactor] 1/3 베이스라인 점검 실행"
pnpm refactor:start

echo "[codex-refactor] 2/3 Codex 리팩토링 실행"
PROMPT=$(cat <<PROMPT_EOF
다음 저장소에서 '전체 리팩토링'을 수행해줘.

[목표]
- 동작은 유지하면서 코드 구조를 단순화하고 중복을 줄일 것
- 위험한 대규모 변경 대신, 작은 단위로 안전하게 개선할 것
- 변경 후 반드시 typecheck/test 통과 상태 유지

[필수 작업]
1) 우선순위가 높은 중복/복잡도 지점을 식별하고 정리
2) 의미 있는 단위로 커밋
3) 최종적으로 아래 검증 명령을 실행
   - pnpm typecheck
   - pnpm test

[요청자 추가 지시]
$TASK_INPUT
PROMPT_EOF
)

codex exec "$PROMPT"

echo "[codex-refactor] 3/3 후속 검증 실행"
pnpm typecheck
pnpm test

echo "[codex-refactor] 완료"

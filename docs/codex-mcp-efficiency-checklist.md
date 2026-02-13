# Claude Code / Codex MCP 작업 효율 체크리스트

목적: Codex Spark(5.3) MCP 작업에서 반복 조회 루프를 줄이고, 경고를 실패성/알림성으로 분리해
사후 리뷰 속도를 높입니다.

## 0. 실행 전 동기화

1. 권한 확인
   - `~/.codex/settings.local.json`에 `Read`, `Write`, `Edit`, `Bash(...)` 항목이 명시되어 있는지 확인
   - `~/.codex/.mcp.json`의 `approval_policy`가 `on-request`인지 확인
2. CLI 확인
   - `codex --version`
   - `gpt-5.3-codex-spark`가 옵션/출력에 노출되는지 확인

## 1. 작업 중 운영 규칙(짧은 루프 차단)

1. `read/list/grep` 연속 반복 금지
   - 예: `rg`로 후보를 먼저 찾고, 이어서 `read` 1회로 마무리.
   - 같은 디렉토리를 매번 `ls` + `rg`로 탐색하지 말고, `rg` 단일 패턴으로 통합.
2. 상태 조회 축소
   - `git status`, `git diff`, `git log`를 분할 실행하지 않고 한 번에 묶어 실행.
3. 동일 명령이 3회 연속이면 중단 후 경로/필터를 재설계.
4. 도구 호출은 목적 단위로 묶어 1회 처리(최대 1차 수정 + 1회 검증).

## 2. 오류/경고 운영 규칙

1. 경고를 분류해서 기록
   - 실패성 경고: `failed`, `timeout`, `permission denied`, `not found`, `exception`, `traceback`
   - 알림성 경고: 포맷/스킵/정보성 메시지
2. 실패성 경고가 반복되면 다음 순서로 조치
   - 원인 패턴 분리
   - 승인 정책/권한 변경점 재점검
   - 동일 패턴 재실행 횟수 상한 설정(예: 2회)

## 3. 세션 종료 템플릿 (고정)

- thread_id:
- 기간:
- tool_calls:
- errors:
- warnings:
  - 실패성 warning:
  - 알림성 warning:
- completion 추정치:
- Top 반복 패턴:
- 실행 성과:
  - 완료한 항목:
  - 미완료 항목:
  - 다음 액션:

## 4. 자동 요약 실행(권장)

```bash
bash scripts/codex-mcp-runbook.sh
```

옵션:
- `bash scripts/codex-mcp-runbook.sh [로그경로] [TopN]`

예:

```bash
bash scripts/codex-mcp-runbook.sh "$HOME/.codex/log/codex-tui.log" 15
```

## 5. 개선 목표 KPI

1. warning 대비 실패성 warning 비율 감소
2. 동일 툴/동일 명령 반복 호출 횟수 감소
3. thread 단위 completion 추정치 상승

## 6. 클로드 코드 전달용 지시문(복붙용)

아래 문장을 작업 시작/종료 시 한 번에 전달해 주세요.

`작업 전/후로 다음을 실행해 주세요: 1) bash scripts/codex-mcp-runbook.sh ~/.codex/log/codex-tui.log 15  2) 세션 종료 시 출력 템플릿(thread_id, tool_calls, errors, warnings, 실패성 warning, 알림성 warning, completion 추정치, Top 반복 패턴, 다음 액션)을 그대로 남겨 요약`

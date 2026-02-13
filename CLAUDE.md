# CLAUDE.md

## Workflow Preferences

- **자동 검증 우선**: 브라우저 수동 확인 요청 대신 `pnpm typecheck`, 테스트 스크립트, curl 등으로 자동 검증할 것
- **dev 서버 포트**: Next.js dev 서버는 포트 **3001** (3000은 별도 서버)
- **최소한의 확인 요청**: 사용자가 엔터만 누르면 되도록 워크플로우 구성. 반복적인 브라우저 확인 요청 금지.
- **한국어 커뮤니케이션**: 설명과 대화는 한국어로

## Project Stack

- Next.js 15 (App Router)
- AI SDK v6 (`ai@^6.0.85`, `@ai-sdk/react@^3.0.87`)
- Zod 4 (`zod@^4.3.6`)
- MongoDB Atlas
- Zustand (state management)
- TypeScript strict mode

## Key Architecture

- **Streaming chat**: `POST /api/bot/chat/stream` → `createUIMessageStream` + `streamText`
- **Client hook**: `src/lib/client/hooks/useChat.ts` wraps `useAIChat` from `@ai-sdk/react`
- **Metadata flow**: Server sends `message-metadata` SSE chunk → client captures via `onFinish` callback → syncs to Zustand store
- **Non-streaming fallback**: Admission V2, API key missing → `createNonStreamingResponse`

## Codex 협업 워크플로우

대규모 개선 작업 시 **Codex CLI + Opus 분업** 패턴을 기본으로 사용한다.

### 분업 원칙 (Codex 토큰 극대화)
- **Codex (85~90%)**: 컴포넌트 구현, CSS, 데이터 바인딩, 에러 상태, 접근성, 테스트 작성, API 라우트, 리팩토링 등 대부분의 코드 작업
- **Opus (10~15%)**: 스트리밍 파이프라인, 상태 아키텍처, 보안 설계 등 설계 판단이 필수인 고난도 태스크만

### 실행 방법
1. Opus가 전체 개선 항목을 평가하고 태스크를 분류
2. Codex 태스크를 `CODEX-TASKS.md`에 자기완결형 프롬프트로 작성 (파일 경로, 변경 전/후, 검증 조건 포함)
3. Codex CLI 실행: `codex exec --sandbox workspace-write "$(cat CODEX-TASKS.md)"`
4. Opus 태스크는 직접 구현
5. 양쪽 완료 후 `pnpm typecheck` → push

### Codex 태스크 작성 규칙
- 각 태스크에 **수정 파일 경로**, **변경 전 코드**, **변경 후 코드** 명시
- 한 태스크 = 한 커밋 단위로 독립 실행 가능하게 구성
- `[CODEX-N]` 접두사로 커밋 메시지 통일

### 주의사항
- Codex는 래퍼 패턴보다 직접 구현을 선호함 — 래퍼 vs 직접 구현 충돌 시 사전에 방침 결정
- `approval_policy="full-auto"`는 미지원, `--sandbox workspace-write` 필수

### Codex 병렬 실행 (토큰 여유 시)
- 대형 태스크는 `CODEX-TASKS-A.md`, `CODEX-TASKS-B.md`로 분할
- Git worktree로 작업 디렉토리 격리 후 병렬 실행:
  ```bash
  git worktree add ../ujuz-codex-a -b codex-batch-a
  git worktree add ../ujuz-codex-b -b codex-batch-b
  cd ../ujuz-codex-a && codex exec --sandbox workspace-write "$(cat CODEX-TASKS-A.md)" &
  cd ../ujuz-codex-b && codex exec --sandbox workspace-write "$(cat CODEX-TASKS-B.md)" &
  ```
- 완료 후 메인 브랜치에 순차 머지

## Claude Code 협업 세팅

### 기본 모드
- **Plan Mode 기본**: `.claude/settings.json`에 `defaultMode: "plan"` 설정
- 모든 작업은 Plan → 승인 → 구현 순서

### Agent Teams (실험)
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 활성화
- 대형 작업 시 역할 분담: architect(설계) / implementer(구현) / tester(검증)
- 구현/테스트 트랙은 plan approval 후에만 변경

### 품질 게이트 (Hooks)
- `TaskCompleted`: `pnpm typecheck` 실패 시 완료 차단
- `PreToolUse`: `rm -rf` 차단
- 팀 공유: `.claude/settings.json` 커밋

### 세션 관리
- 작업 시작 시 `/rename feat-xxx`로 세션 이름 지정
- 이어하기: `claude --resume feat-xxx`
- 되감기: `/rewind`로 코드/대화 선택적 롤백

## Commands

- `pnpm typecheck` — TypeScript type check
- `pnpm dev` — Start dev server (port 3001)
- `pnpm test` — Run tests
- `codex exec --sandbox workspace-write "$(cat CODEX-TASKS.md)"` — Codex CLI 배치 실행
- `git diff main...HEAD | claude -p "코드리뷰해줘"` — Claude 헤드리스 리뷰
- `claude --permission-mode plan` — Plan Mode로 시작

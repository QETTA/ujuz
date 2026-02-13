# CLAUDE.md

## Project Direction

**`PROJECT-DIRECTION.md`** 참조 — 사업기획 보고서 2건(기술 실사 + 네이티브 확장 전략) 기반 12개월 로드맵.
- 현재 위치: TRL 5~6, 7개 서브시스템 (모바일 10% 포함)
- 핵심 가치: **(a) 시설 탐색(지도) + (b) TO 알림 즉시성** → 네이티브 필수
- 우선순위: **신뢰**(Phase 1) → **재방문/네이티브**(Phase 2) → **유료전환**(Phase 3) → **확장**(Phase 4)
- 기술 조합: Expo + react-native-maps + Expo Push + Toss(웹) + MongoDB → LRU → Redis
- 웹 = 유입 채널(SEO/결제), 모바일 = 핵심 경험(지도/알림/채팅)

## Workflow Preferences

- **자동 검증 우선**: 브라우저 수동 확인 요청 대신 `pnpm typecheck`, 테스트 스크립트, curl 등으로 자동 검증할 것
- **dev 서버 포트**: Next.js dev 서버는 포트 **3001** (3000은 별도 서버)
- **최소한의 확인 요청**: 사용자가 엔터만 누르면 되도록 워크플로우 구성. 반복적인 브라우저 확인 요청 금지.
- **한국어 커뮤니케이션**: 설명과 대화는 한국어로

## Project Stack

### Web (Next.js)
- Next.js 15 (App Router)
- AI SDK v6 (`ai@^6.0.85`, `@ai-sdk/react@^3.0.87`)
- Zod 4 (`zod@^4.3.6`)
- MongoDB Atlas
- Zustand (state management)
- TypeScript strict mode

### Mobile (Expo) — `mobile/`
- Expo SDK 52 + expo-router
- NativeWind v4 (Tailwind for RN)
- react-native-maps (Apple Maps/Google Maps)
- Zustand + TanStack Query + expo-secure-store
- EAS Build (CI/CD)

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

### Codex 병렬 실행 (검증된 패턴)
- **최대 8개 동시 실행** 검증 완료 (Round 3: 8 worktree 병렬, 충돌 0)
- 각 태스크는 **파일 겹침 없이** 독립적으로 설계
- Git worktree로 작업 디렉토리 격리:
  ```bash
  # N개 worktree 생성
  for i in $(seq 1 N); do git worktree add ../ujuz-p$i -b codex-batch-$i; done
  # 각 worktree에서 codex exec 병렬 실행
  for i in $(seq 1 N); do
    cd ../ujuz-p$i && codex exec --sandbox workspace-write "태스크 프롬프트" &
  done
  # 완료 후: 각 worktree 커밋 → 순차 머지 → typecheck → push
  for i in $(seq 1 N); do git merge codex-batch-$i --no-edit; done
  # 정리
  for i in $(seq 1 N); do git worktree remove ../ujuz-p$i; git branch -d codex-batch-$i; done
  ```
- **주의**: worktree에 node_modules 없음 → Codex가 pnpm install 시도 시 DNS 부하 발생 가능
- **해결**: typecheck는 메인 디렉토리에서 머지 후 1회 실행

### Codex MCP 연동 (Claude Code ↔ Codex-Spark)
- `.mcp.json`으로 Codex를 MCP 도구로 연결 (개인 세팅, `.gitignore` 처리)
- 모델: `gpt-5.3-codex-spark` (프로젝트 `.mcp.json`에서 고정)
- `approval_policy: "on-failure"` — Claude Code가 이미 사용자 승인 거치므로 이중 승인 방지
- Claude Code에서 `codex` / `codex-reply` 도구로 직접 호출 가능
- **역할 분담 8:2** — Codex-Spark (80%): 컴포넌트 구현, CSS, 데이터 바인딩, API 라우트, 핫픽스 / Claude (20%): 설계, 리뷰, 아키텍처, 보안
- 대형 태스크: Codex에 자기완결형 프롬프트 전달 → 결과 리뷰 → typecheck 게이트

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

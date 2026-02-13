# CLAUDE.md

## Status
Phase 5~8 진행 중. T-000~T-206 완료.

## Workflow
- 자동 검증: `pnpm typecheck` (품질 게이트)
- dev 포트: **3001**
- 한국어 커뮤니케이션
- "풀가동" = Codex CLI 5~10개 병렬, Plan Mode 생략

## Stack
- Next.js 15 App Router, React 19, TS strict
- AI SDK v6, Zod 4, MongoDB Atlas, Zustand 5, TailwindCSS v4, shadcn/ui, next-auth v5
- Mobile: Expo SDK 52 + expo-router (`mobile/`)

## Architecture
- **Chat**: `POST /api/bot/chat/stream` → `createUIMessageStream` + `streamText`
- **Filter**: sanitizeInput → isOffTopic → checkLimit → stream → incrementFeatureUsage + checkOutput
- **Client**: `src/lib/client/hooks/useChat.ts` (useAIChat 래퍼)
- **Logger**: `logger.error(msg, extra?)` — NOT pino-style
- **API 정본**: `docs/CANONICAL-SPEC.md` (23개 엔드포인트, 비래핑 응답)
- **태스크**: `docs/CODEX-TASKS.md` (Phase 5~8, 22개 티켓)
- **OpenAPI**: `docs/openapi.yaml` (Swagger/Redoc용)

## Codex CLI 병렬 패턴
- 8:2 분담 (Codex 80% 구현, Opus 20% 설계/통합)
- **실행**: `codex exec --full-auto -C /mnt/c/Users/sihu2/ujuz-api "프롬프트"`
- **프롬프트 필수 문구**: "Do NOT modify tsconfig.json, vitest.config.ts, package.json, .env.example, .gitignore, mobile/src/app/_layout.tsx. Do NOT create index.ts, dist/, src/api/, tsconfig.build.json. Do NOT create docs/ research files."
- **후처리 체크리스트**:
  1. `git checkout -- tsconfig.json vitest.config.ts .env.example .gitignore` (변경됐을 경우)
  2. `rm -rf dist/ index.ts src/api/ tsconfig.build.json` (생성됐을 경우)
  3. `git diff mobile/src/app/_layout.tsx` → 변경 시 되돌리기
  4. `git status` → untracked 정크 docs 삭제
  5. 로거 포맷 확인 (Codex는 항상 pino-style로 작성)
- **MCP 최소화**: `~/.codex/config.toml`에 filesystem만 유지 (mongodb/serena/figma/playwright 제거)

## Commands
```bash
pnpm dev          # Next.js dev 서버 (3001)
pnpm typecheck    # TS 체크 (필수)
pnpm test         # Vitest
pnpm build        # 빌드
```

## Key Paths
```
src/app/api/bot/chat/stream/  # 스트리밍 채팅
src/app/api/v1/               # REST API
src/app/api/cron/             # Vercel Cron
src/lib/server/               # 서버 유틸
src/lib/client/hooks/         # 클라이언트 훅
src/components/               # UI (74+ shadcn/ui)
mobile/src/components/states/ # 공통 상태 UI 6종
mobile/src/lib/permissions.ts # 권한 유틸
docs/                         # 정본 문서 (CANONICAL-SPEC, CODEX-TASKS, openapi.yaml)
```

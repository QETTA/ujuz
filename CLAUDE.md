# CLAUDE.md

## Status
Phase 1~4 완료. 67파일 +9,424줄. 프로덕션 MVP 완성.

## Workflow
- 자동 검증: `pnpm typecheck` (품질 게이트)
- dev 포트: **3001**
- 한국어 커뮤니케이션
- "풀가동" = Codex 10개 병렬, Plan Mode 생략

## Stack
- Next.js 15 App Router, React 19, TS strict
- AI SDK v6, Zod 4, MongoDB Atlas, Zustand 5, TailwindCSS v4, shadcn/ui, next-auth v5
- Mobile: Expo SDK 52 + expo-router (`mobile/`)

## Architecture
- **Chat**: `POST /api/bot/chat/stream` → `createUIMessageStream` + `streamText`
- **Filter**: sanitizeInput → isOffTopic → checkLimit → stream → incrementFeatureUsage + checkOutput
- **Client**: `src/lib/client/hooks/useChat.ts` (useAIChat 래퍼)
- **Logger**: `logger.error(msg, extra?)` — NOT pino-style

## Codex-Spark 병렬 패턴
- 8:2 분담 (Codex 80% 구현, Opus 20% 설계/통합)
- 후처리 필수: `git checkout -- tsconfig.json vitest.config.ts package.json .env.example .gitignore`
- Codex 정크 삭제: `rm -rf dist/ index.ts src/api/ tsconfig.build.json`
- 로거 포맷 수정 (Codex는 항상 pino-style로 작성)
- 프롬프트에 반드시 포함: "Do NOT modify tsconfig.json, vitest.config.ts, package.json, .env.example, .gitignore. Do NOT create index.ts, dist/, src/api/, tsconfig.build.json."

## Commands
```bash
pnpm typecheck    # TS 체크 (필수)
pnpm dev          # dev 서버 (3001)
pnpm test         # Vitest
pnpm build        # 빌드
```

## Key Paths
```
src/app/api/bot/chat/stream/  # 스트리밍 채팅
src/app/api/v1/               # REST API
src/app/api/cron/             # Vercel Cron
src/lib/server/               # 서버 유틸 (env, logger, collections, featureFlags, contentFilter, subscriptionService...)
src/lib/client/hooks/         # 클라이언트 훅
src/components/               # UI (74+ shadcn/ui)
docs/                         # 참고 문서 (ARCHITECTURE, CODEX-TASKS 등)
```

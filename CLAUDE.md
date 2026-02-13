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

## Commands

- `pnpm typecheck` — TypeScript type check
- `pnpm dev` — Start dev server (port 3001)
- `pnpm test` — Run tests

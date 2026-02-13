# UjuZ API — 프로젝트 아키텍처 메모리

## 스택
- Next.js 15 (App Router), React 19, TypeScript strict
- AI SDK v6 (ai@^6, @ai-sdk/react@^3), Anthropic Claude
- MongoDB Atlas (mongodb@^6), next-auth v5 beta
- Zustand 5 (상태관리), TailwindCSS v4, shadcn/ui (new-york)
- Vitest 4 + Testing Library (테스트)

## 핵심 경로
- `src/app/` — App Router 페이지/레이아웃
- `src/app/api/bot/chat/stream/` — 스트리밍 채팅 API
- `src/lib/client/hooks/useChat.ts` — AI SDK useAIChat 래퍼
- `src/lib/server/` — 서버 유틸리티
- `src/components/` — UI 컴포넌트 (shadcn/ui 기반)

## 스트리밍 파이프라인
1. Client: useChat hook → POST /api/bot/chat/stream
2. Server: createUIMessageStream + streamText
3. Metadata: SSE message-metadata 청크 → onFinish 콜백 → Zustand store 동기화
4. Fallback: Admission V2 / API key 미설정 시 createNonStreamingResponse

## 인증
- next-auth v5 beta (OAuth providers: Google, Kakao)
- AUTH_BYPASS=true로 로컬 개발 바이패스
- AUTH_SECRET 필수 (openssl rand -base64 32)

## 패턴 / 컨벤션
- path alias: @/* → ./src/*
- ESLint 9 flat config (eslint.config.mjs)
- pnpm 패키지 매니저
- dev 서버: port 3001

## 빌드 / 검증
- `pnpm typecheck` — tsc --noEmit (품질 게이트)
- `pnpm test` — vitest run
- `pnpm lint` — eslint src/
- `pnpm dev` — next dev -p 3001

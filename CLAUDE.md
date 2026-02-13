# CLAUDE.md

## Project Status (2026-02-14)

Phase 1~4 완료. 67파일 +9,424줄. **프로덕션 MVP 기능 세트 구축 완료.**

| Phase | 핵심 | 커밋 |
|-------|------|------|
| 1 신뢰 기반 | LRU 캐시, 입소 테스트 60+, UI 컴포넌트, Auth, Expo PoC | `850aa0d` |
| 2 재방문 엔진 | Push, TO cron, 지오코드, 이메일, 커뮤니티, 모바일 탭 4개, API v2 | `ada8c27` |
| 3 유료 전환 | Toss 결제, SMS, 가드레일/contentFilter, EAS, 딥링크, 구독 관리 | `40bda07` |
| 4 프로덕션 완성 | 아이관리, 글쓰기, 관리자, 히스토리, 비교, 검색, 설정, 내보내기 | `3922588` |

## Workflow Preferences

- **자동 검증 우선**: `pnpm typecheck`로 자동 검증. 브라우저 수동 확인 요청 금지
- **dev 서버 포트**: Next.js = **3001** (3000은 별도)
- **최소한의 확인 요청**: 사용자가 엔터만 누르면 되는 워크플로우
- **한국어 커뮤니케이션**: 설명과 대화는 한국어로
- **속도 우선**: "풀가동" = 10개 Codex-Spark 병렬 즉시 발사, Plan Mode 생략

## Project Stack

### Web (Next.js)
- Next.js 15 (App Router), React 19, TypeScript strict
- AI SDK v6 (`ai@^6`, `@ai-sdk/react@^3`)
- Zod 4 (`zod@^4.3.6`)
- MongoDB Atlas (`mongodb@^6`)
- Zustand 5, TailwindCSS v4, shadcn/ui (new-york)
- next-auth v5 beta

### Mobile (Expo) — `mobile/`
- Expo SDK 52 + expo-router
- NativeWind v4 (Tailwind for RN)
- react-native-maps + Zustand + TanStack Query
- EAS Build (dev/preview/prod)

## Key Architecture

- **Streaming chat**: `POST /api/bot/chat/stream` → `createUIMessageStream` + `streamText`
- **Content filter**: `sanitizeInput` → `isOffTopic` → `checkLimit` → stream → `incrementFeatureUsage` + `checkOutput`
- **Client hook**: `src/lib/client/hooks/useChat.ts` wraps `useAIChat`
- **Metadata flow**: SSE `message-metadata` chunk → `onFinish` → Zustand store
- **Non-streaming fallback**: Admission V2, API key missing → `createNonStreamingResponse`
- **Logger format**: `logger.error(message: string, extra?: Record<string, unknown>)` — NOT pino-style

## Codex-Spark MCP 협업 (검증된 패턴)

### 기본 세팅
- `.mcp.json`: `gpt-5.3-codex-spark`, `approval_policy: on-failure`
- Claude Code에서 `mcp__codex-spark__codex` / `mcp__codex-spark__codex-reply` 도구 직접 호출
- 역할 분담 **8:2** — Codex (80% 구현), Opus (20% 설계/통합)

### 대형 태스크 실행 패턴 (Phase 2~4 검증)
1. Opus가 태스크 10개를 설계 (파일 겹침 0)
2. 10개 `mcp__codex-spark__codex` 호출을 **단일 메시지에 병렬 발사**
3. 완료 후 Opus가 후처리:
   - `git checkout -- tsconfig.json vitest.config.ts package.json .env.example .gitignore`
   - `rm -rf dist/ index.ts src/api/ tsconfig.build.json` + Codex 정크 파일
   - 로거 포맷 수정 (Codex는 항상 pino-style로 작성)
   - 크로스-파일 통합 (featureFlags, collections, env.ts, stream route 등)
   - `pnpm typecheck` → 에러 수정 → commit + push

### Codex 프롬프트 필수 규칙
```
⚠️ 모든 Codex 프롬프트에 반드시 포함:
"Do NOT modify tsconfig.json, vitest.config.ts, package.json, .env.example, .gitignore, or README.md.
 Do NOT create index.ts, dist/, src/api/, or tsconfig.build.json.
 Only create the specified new files."
```

### Codex 약점 (매번 발생)
- **금지 파일 수정**: tsconfig.json, package.json을 ~50% 확률로 덮어씀 → 반드시 git checkout 복원
- **로거 포맷 오류**: pino-style `logger.error({ obj }, 'msg')` 사용 → `logger.error('msg', { obj })` 수정 필요
- **정크 파일 생성**: `dist/`, `index.ts`, `src/api/`, `tsconfig.build.json` 등 → rm 정리
- **환경 변수 직접 접근**: `process.env.X` 대신 `env.X` 사용 안 함 → 필요시 수동 통합

## Claude Code 세팅

### 권한
- `defaultMode: "editing"` (빠른 실행)
- `Bash(*)`, `Read(*)`, `Write(*)`, `Edit(*)`, `mcp__*` 전부 허용
- `rm -rf` hook 차단

### 품질 게이트
- `TaskCompleted` hook: `pnpm typecheck` 실패 시 차단
- `PostToolUse` hook: Write/Edit 파일 로깅

### 세션 관리
- `/rename feat-xxx` → `claude --resume feat-xxx`
- `/rewind` → 코드/대화 선택적 롤백

## Commands

```bash
pnpm typecheck          # TypeScript 타입 체크 (품질 게이트)
pnpm dev                # Next.js dev (port 3001)
pnpm test               # Vitest
pnpm build              # Next.js 빌드
git push origin master  # 배포
```

## File Map (핵심 경로)

```
src/
├── app/
│   ├── (app)/           # 메인 페이지 (children, community, admin, search, pricing, settings...)
│   ├── api/
│   │   ├── bot/chat/stream/  # 스트리밍 채팅 (contentFilter + checkLimit 통합)
│   │   ├── v1/               # REST API (payments, subscription, export, facilities, admin...)
│   │   ├── v2/               # 모바일 최적화 API (dashboard, facilities)
│   │   └── cron/             # Vercel Cron (detect-to, push-receipts)
│   └── (auth)/               # 인증 페이지
├── lib/
│   ├── server/               # 서버 유틸리티
│   │   ├── admissionEngineV2.ts  # 입소 확률 계산
│   │   ├── contentFilter.ts      # 프롬프트 인젝션/출력 필터/주제 이탈
│   │   ├── paymentService.ts     # Toss Payments 연동
│   │   ├── pushService.ts        # Expo Push 알림
│   │   ├── smsService.ts         # NCP SMS
│   │   ├── subscriptionService.ts # 구독/요금제/checkLimit
│   │   ├── toDetectionService.ts  # TO 감지 + push/SMS/email 연동
│   │   ├── strategyEngine.ts     # 추천 전략 엔진
│   │   ├── featureFlags.ts       # 기능 플래그
│   │   ├── collections.ts        # MongoDB 컬렉션명 상수
│   │   ├── env.ts                # 환경변수 Zod 스키마
│   │   └── logger.ts             # JSON 구조화 로거
│   └── client/               # 클라이언트 유틸리티
│       └── hooks/useChat.ts  # AI SDK useAIChat 래퍼
├── components/               # UI 컴포넌트 (74+ shadcn/ui 기반)
└── __tests__/                # Vitest 테스트
mobile/
├── src/app/                  # Expo Router 스크린 (tabs, community, auth)
├── src/lib/                  # 모바일 유틸리티 (deepLink, notifications)
└── eas.json                  # EAS Build 프로파일
```

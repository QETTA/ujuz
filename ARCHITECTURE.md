# UjuZ Architecture Overview

> GPT Pro 코드 리뷰 시 이 파일을 첫 번째 컨텍스트로 제공하세요.
> 마지막 업데이트: 2026-02-13

## 프로젝트 요약

UjuZ는 **어린이집 입소 예측 + TO 알림 + 커뮤니티** 서비스.
Next.js 15 풀스택 앱 (App Router) + MongoDB Atlas + Claude AI 챗봇.

## 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| Framework | Next.js (App Router) | 15.x |
| Runtime | React | 19.x |
| Language | TypeScript (strict) | 5.7+ |
| Styling | Tailwind CSS v4 + OKLCH 색상 시스템 | 4.1+ |
| State | Zustand | 5.x |
| AI | Vercel AI SDK v6 + Anthropic Claude | ai@6.x |
| Auth | NextAuth v5 (beta) | 5.0-beta |
| DB | MongoDB Atlas (native driver) | 6.x |
| Validation | Zod 4 | 4.x |
| Font | Pretendard Variable (한국어 최적화) | - |
| Package | pnpm | - |

## 디렉토리 구조

```
src/
├── app/
│   ├── (app)/                    # 인증된 사용자 페이지 그룹
│   │   ├── page.tsx              # 홈 (리다이렉트)
│   │   ├── dashboard/page.tsx    # 대시보드
│   │   ├── chat/page.tsx         # AI 챗봇
│   │   ├── ai/page.tsx           # AI 탭 (위젯 내장)
│   │   ├── score/page.tsx        # 입소 점수
│   │   ├── facilities/page.tsx   # 시설 목록
│   │   ├── facilities/[id]/      # 시설 상세
│   │   ├── alerts/page.tsx       # TO 알림
│   │   ├── community/page.tsx    # 커뮤니티
│   │   ├── checklist/page.tsx    # 체크리스트
│   │   ├── my/page.tsx           # 마이페이지
│   │   ├── search/page.tsx       # 검색
│   │   ├── pricing/page.tsx      # 요금제
│   │   └── subscription/page.tsx # 구독 관리
│   ├── api/                      # API 라우트 (아래 상세)
│   ├── login/page.tsx            # 로그인
│   ├── onboarding/               # 온보딩 플로우
│   ├── layout.tsx                # 루트 레이아웃
│   └── globals.css               # 디자인 토큰 + 유틸리티
├── components/
│   ├── ui/          # 기본 UI (Button, Card, Tabs, Toast, Dialog...)
│   ├── composites/  # 조합 컴포넌트 (ChatBubble, ScoreGauge, FacilityCard...)
│   ├── ai/          # AI 전용 (chat-input, chat-error, data-block-card)
│   ├── layouts/     # 레이아웃 (AppShell, PageHeader, BottomSheet)
│   ├── nav/         # 네비게이션 (BottomNav, TopBar)
│   ├── sheets/      # 모달 시트 (BottomSheet, FilterSheet)
│   ├── strategy/    # 전략 위젯
│   ├── facility/    # 시설 관련
│   ├── onboarding/  # 온보딩 UI
│   ├── primitives/  # 원자 단위 (Chip, Spinner, EmptyState)
│   ├── providers/   # Context Providers (AppProviders, ThemeProvider)
│   └── data/        # 데이터 시각화 (GradeRing, ProbabilityBar)
├── lib/
│   ├── client/      # 클라이언트 훅/유틸 (useChat, useApiFetch, auth)
│   ├── server/      # 서버 로직 (40+ 파일)
│   ├── store.ts     # Zustand 스토어 8개
│   ├── types.ts     # 공유 타입
│   └── utils.ts     # cn() 등 유틸리티
└── middleware.ts     # 인증 미들웨어
```

## API 라우트 맵

### 스트리밍 챗봇
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/bot/chat/stream` | SSE 스트리밍 (메인 경로) |
| POST | `/api/bot/chat` | 레거시 비스트리밍 |
| GET/DELETE | `/api/bot/conversations` | 대화 목록 CRUD |
| GET | `/api/bot/conversations/[id]` | 대화 상세 |

### 입소 예측
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/admission/score` | 시설 점수 계산 |
| POST | `/api/admission/explain` | 점수 설명 |
| POST | `/api/admission/score-by-name` | 이름으로 점수 |
| GET | `/api/simulate` | 시뮬레이션 |

### 시설/TO알림/커뮤니티
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/facilities`, `/api/facilities/[id]` | 시설 조회 |
| POST | `/api/facilities/follow` | 관심 시설 |
| POST/GET | `/api/to-alerts` | TO 알림 구독 |
| GET | `/api/to-alerts/history` | 알림 이력 |
| GET/POST | `/api/v1/community/posts` | 커뮤니티 |

### 사용자
| Method | Path | 설명 |
|--------|------|------|
| GET/POST | `/api/children` | 자녀 프로필 |
| GET | `/api/subscription` | 구독 상태 |
| GET/PATCH | `/api/user/profile` | 사용자 프로필 |

## Zustand 스토어 (8개)

| 스토어 | 파일 | 역할 |
|--------|------|------|
| `useAdmissionStore` | store.ts | 입소 점수 결과 |
| `useChatStore` | store.ts | 대화 목록/ID 관리 |
| `useToAlertStore` | store.ts | TO 알림 구독 + 폴링 |
| `useStrategyStore` | store.ts | 전략 추천 + 시설 하이라이트 |
| `useHomeStore` | store.ts | 홈 히어로 상태 |
| `useOnboardingStore` | store.ts | 온보딩 진행 상태 |
| `useFacilityBrowseStore` | store.ts | 시설 검색/필터 |
| `useThemeStore` | store.ts | 테마 (light/dark/system) |

## 핵심 아키텍처 패턴

### 1. 스트리밍 챗봇 파이프라인
```
Client (useChat hook)
  → DefaultChatTransport (SSE)
  → POST /api/bot/chat/stream
  → classifyIntent → prepareClaudeParams
  → streamText (Anthropic Claude)
  → createUIMessageStream
    ├── text-delta 청크 (실시간)
    └── message-metadata 청크 (onFinish 후)
        { conversation_id, suggestions }
  → Client onFinish
    ├── conversationId → Zustand 동기화
    └── suggestions → 추천 질문 UI
```

### 2. 비스트리밍 폴백
- 입소 V2 계산 → `createNonStreamingResponse`
- API 키 없음 → `generateFallback`
- 둘 다 동일한 UIMessageStream 형식으로 래핑

### 3. 상태 관리 원칙
- **서버 상태**: `useApiFetch` (SWR 패턴, 자동 refetch)
- **클라이언트 상태**: Zustand (persist 미사용, 메모리 only)
- **AI 상태**: `useAIChat` from `@ai-sdk/react` → `useChat` 래퍼

### 4. 컴포넌트 계층
```
ui/         ← 디자인 시스템 기본 블록 (Button, Card, Tabs...)
primitives/ ← 원자 단위 (Chip, Spinner)
composites/ ← 조합 (ChatBubble = ui/Card + primitives/Chip + ...)
ai/         ← AI 전용 래퍼 (chat-input → composites/ChatInput 위임)
layouts/    ← 페이지 레이아웃
pages/      ← app/(app)/*/page.tsx
```

### 5. 디자인 시스템
- **색상**: OKLCH 기반 시맨틱 토큰 (`--color-brand-500`, `--color-text-primary`)
- **다크모드**: CSS `prefers-color-scheme` + `.dark` 클래스 + Zustand toggle
- **@supports 폴백**: OKLCH 미지원 브라우저 → hex 폴백
- **접근성**: `prefers-reduced-motion`, `prefers-reduced-transparency` 대응
- **글래스 효과**: `.glass` 유틸리티 (backdrop-filter + inner shadow)
- **z-index 레이어**: `z-header`, `z-overlay`, `z-modal`, `z-toast`

## 코딩 컨벤션

### TypeScript
- strict 모드, no `any` (불가피한 경우 주석 필수)
- 타입은 `src/lib/types.ts` 또는 `src/lib/server/dbTypes.ts`에 집중
- Zod 스키마 → 타입 추론 (`z.infer<typeof schema>`)

### React
- 서버 컴포넌트 기본, `'use client'` 필요 시에만 선언
- 이벤트 핸들러는 `useCallback`으로 메모이제이션
- 조건부 렌더링: `loading → skeleton → error → empty → content` 순서

### CSS
- Tailwind 유틸리티 우선, 커스텀 CSS는 `globals.css`에만
- 반응형: mobile-first (`lg:` 브레이크포인트로 데스크톱)
- 시맨틱 토큰 사용 (`text-text-primary`, `bg-surface`, `border-border`)

### API
- 모든 에러: `{ error: "CODE", message: "...", details?: {} }`
- 인증: `Authorization: Bearer <token>` (NextAuth 세션 기반)
- Rate limit: `checkRateLimit` → 429 응답
- 입력 검증: Zod 스키마 → 400 응답

### Git
- 커밋 메시지: `feat:`, `fix:`, `docs:`, `feat(codex):` 접두사
- Codex 태스크: `feat(codex): [CODEX-N] description`
- 단일 브랜치 (`master`), 리니어 히스토리

## 보안 체크포인트

- [ ] `.env.local` 절대 커밋 금지 (`.gitignore`에 포함)
- [ ] XSS: 커뮤니티 입력 → `sanitize.ts` (스크립트 태그 제거)
- [ ] PII: 전화번호/이메일/주소 → `sanitize.ts` 마스킹
- [ ] CSRF: NextAuth 자동 보호
- [ ] Rate limit: 모든 POST 엔드포인트에 적용
- [ ] CSP 헤더: `next.config.ts`에 설정
- [ ] SQL Injection: N/A (MongoDB)
- [ ] NoSQL Injection: Zod 입력 검증으로 차단

## 성능 고려사항

- 스트리밍: SSE로 첫 토큰 < 1s
- 이미지: Next/Image 자동 최적화
- 코드 분할: App Router 자동 (페이지 단위)
- DB: MongoDB 인덱스 (`ensureIndexes.ts`)
- 번들: Tailwind v4 자동 tree-shaking

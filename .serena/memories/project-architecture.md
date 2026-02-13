# UjuZ — 프로젝트 아키텍처 (v2, 2026-02-14)

## 스택
- **Web**: Next.js 15 (App Router), React 19, TypeScript strict, AI SDK v6, Zod 4
- **DB**: MongoDB Atlas (mongodb@^6), 30+ 컬렉션
- **Auth**: next-auth v5 beta (OAuth + AUTH_BYPASS dev)
- **State**: Zustand 5
- **UI**: TailwindCSS v4, shadcn/ui (new-york), 74+ 컴포넌트
- **Mobile**: Expo SDK 52, expo-router, NativeWind v4, react-native-maps, EAS Build
- **Test**: Vitest 4 + Testing Library

## 핵심 서비스 (src/lib/server/)

| 서비스 | 파일 | 역할 |
|--------|------|------|
| 스트리밍 채팅 | stream/route.ts | UIMessageStream + Claude |
| 콘텐츠 필터 | contentFilter.ts | 인젝션 탐지, 출력 필터, 주제 이탈 |
| 입소 엔진 | admissionEngineV2.ts | 베이지안 확률 계산, 60+ 테스트 |
| TO 감지 | toDetectionService.ts | 스냅샷 비교 → push/SMS/email |
| 결제 | paymentService.ts | Toss Payments API |
| 구독 | subscriptionService.ts | 티어별 한도, checkLimit, incrementFeatureUsage |
| 푸시 | pushService.ts | Expo Push 전송/영수증/토큰 정리 |
| SMS | smsService.ts | NCP HMAC-SHA256 |
| 이메일 | emailService.ts | nodemailer + retry + bounce |
| 추천 | strategyEngine.ts | 3루트 분석, 주간 액션 |
| 메모리 | userMemoryService.ts | 대화 기억 추출/저장 |

## API 구조

```
/api/bot/chat/stream     — 스트리밍 채팅 (contentFilter 통합)
/api/v1/payments/*       — Toss 결제 (initiate, confirm, webhook)
/api/v1/subscription/*   — 구독 관리 (cancel, usage)
/api/v1/facilities/*     — 시설 CRUD + 고급 검색
/api/v1/community/*      — 커뮤니티 게시글/댓글
/api/v1/admin/*          — 관리자 통계/크롤링
/api/v1/export           — 데이터 내보내기 (JSON/CSV)
/api/v1/recommendations/* — 추천 히스토리
/api/v2/dashboard        — 모바일 최적화 대시보드
/api/cron/detect-to      — TO 감지 (30분)
/api/cron/push-receipts  — 푸시 영수증 (15분)
```

## 로거 컨벤션
```typescript
// 올바른 형식 (프로젝트 표준)
logger.error('메시지', { key: value })
logger.info('메시지', { key: value })

// 잘못된 형식 (pino-style, Codex가 자주 사용)
logger.error({ key: value }, '메시지')  // ❌
```

## 환경변수 (env.ts Zod 스키마)
- 필수: MONGODB_URI, AUTH_SECRET
- 선택: ANTHROPIC_API_KEY, TOSS_PAYMENTS_SECRET_KEY, NCP_*, KAKAO_REST_API_KEY, SENTRY_*
- 개발: AUTH_BYPASS=true, NODE_ENV=development

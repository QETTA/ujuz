# 기술 결정 (v2, Phase 1~4 반영)

## 확정 스택

### 백엔드
- Next.js API Routes (단일 백엔드)
- MongoDB Atlas + 30+ 컬렉션 (collections.ts 상수)
- 인메모리 LRU 캐시 (node-lru-cache) → Phase 5에서 Upstash Redis
- Zod 4 스키마 검증 (env.ts, API body)

### AI
- Claude (Anthropic) via AI SDK v6 streamText
- 가드레일: contentFilter.ts (인젝션 11패턴, 출력 필터, 주제 이탈)
- 사용량 제한: checkLimit + incrementFeatureUsage (티어별)

### 결제
- Toss Payments (웹 전용, 3.5%)
- 앱 → 웹 딥링크 결제 (ujuz:// + Universal Links)
- 구독: Free/Basic ₩5,900/Premium ₩9,900
- IAP는 DAU >5K 시 재평가

### 모바일
- Expo SDK 52 (managed) + NativeWind v4
- 6탭: 홈/검색/지도/채팅/알림/MY
- EAS Build (dev/preview/prod 프로파일)
- 딥링크: ujuz:// 스킴

### 알림
- 푸시: Expo Push Service (영수증 기반 재시도 + 15분 cron)
- SMS: NCP (HMAC-SHA256) — 프리미엄 사용자 opt-in
- 이메일: nodemailer + Brevo SMTP — 현재 disabled

### 모니터링
- Sentry (DSN 설정 완료, 통합 대기)
- Phase 5: PostHog 또는 Amplitude

## 기각된 대안
- OneSignal (벤더 락인), Kakao Map SDK (RN 미성숙), Redis 초기 도입 (과도한 인프라)
- Stripe (한국 결제 부족), Flutter (생태계 전환 비용), IAP 초기 (30% 수수료)

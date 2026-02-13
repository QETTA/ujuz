# 기술 조합 결정 메모리 (2026-02-14)

## 확정된 기술 스택

### 백엔드
- Next.js API Routes (단일 백엔드, 분리 안함)
- MongoDB Atlas (현행 유지)
- 인메모리 LRU 캐시 (node-lru-cache) → Phase 3에서 Upstash Redis

### 모바일
- Expo SDK 52 (managed workflow) + NativeWind v4
- expo-router (파일 기반 라우팅)
- react-native-maps (Apple Maps/Google Maps)
- Zustand + TanStack Query + expo-secure-store
- EAS Build (CI/CD)

### 푸시
- Expo Push Service (primary)
- Receipt 기반 재시도 + 토큰 정리 (백엔드 필수)
- Phase 3: DAU >10K 시 직접 FCM/APNs 폴백 추가

### 지도
- 렌더링: react-native-maps (커스텀 마커로 자체 시설 DB 표시)
- 지오코딩: Kakao Local REST API (백엔드 프록시)
- Kakao Map 네이티브 SDK는 Phase 3 재평가

### 결제
- Toss Payments (웹 전용, 3.5%)
- 앱 → 웹 결제 딥링크 (Universal Links / App Links)
- IAP는 Phase 4+ (DAU >5K 시)

### API
- Zod 4 스키마 → zod-openapi로 OpenAPI 생성
- 에러 포맷: { error: string, code: string, details?: unknown }
- 버전: /api/v1/ (현행), /api/v2/ (모바일 최적화, Phase 2)

### 모니터링
- Phase 1: Vercel Analytics
- Phase 2: Sentry (웹+모바일) + 푸시 영수증 대시보드
- Phase 3: 프로덕트 애널리틱스 (PostHog 또는 Amplitude)

## 기각된 대안 (이유)
- OneSignal: 벤더 락인 + 비용
- Kakao Map 네이티브 SDK: RN 래퍼 미성숙
- Redis 즉시 도입: 과도한 인프라 복잡성
- Stripe: 한국 결제수단 커버리지 부족
- Flutter: 생태계 전환 비용
- 인앱결제 초기 도입: 30% 수수료 + 규제 복잡

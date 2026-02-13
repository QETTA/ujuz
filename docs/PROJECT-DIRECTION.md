# UjuZ 프로젝트 방향 (2026-02 ~)

> 본 문서는 두 차례 사업기획 보고서(기술 실사 + 시장 분석 + 네이티브 확장 전략)와 코드베이스 실제 상태를 교차 매핑하여 도출한 **실행 가능한 기술 로드맵**이다.

---

## 1. 현재 위치: TRL 5~6 (통합 프로토타입)

### 서브시스템 성숙도 매핑

| 서브시스템 | 성숙도 | 핵심 파일 | 상태 요약 |
|-----------|--------|---------|---------|
| **데이터 파이프라인** | 95% | `facility/crawlService.ts`, `connector.ts`, `ingestService.ts` | data.go.kr 수집/정제/검색 완성. 스냅샷 diff 동작 |
| **입소 엔진** | 95% | `admissionEngineV2.ts`, `admissionMath.ts` | Bayesian Gamma-Poisson 모델 + Evidence Cards. 테스트 커버 |
| **TO 알림** | 40% | `toDetectionService.ts`, `toAlertService.ts`, `emailService.ts` | 감지+이메일만 동작. Push/SMS 미구현, 스케줄러 없음 |
| **커뮤니티** | 20% | `community/posts/route.ts` | 읽기만 가능. `communityWrite: false`. 댓글/투표 없음 |
| **AI 상담** | 90% | `botService.ts`, `responseGenerator.ts`, `memoryExtractor.ts` | 10개 의도 분류, RAG, 스트리밍, 비용 추적. 가드레일 미비 |
| **구독/과금** | 5% | `subscriptionService.ts` | 스키마+요금제 정의만 존재. **결제 연동 0%** |
| **모바일(Expo)** | 10% | `mobile/` | 프로젝트 스캐폴드 + 5탭 레이아웃 + API 클라이언트 + 인증 뼈대 |

### Phase 1 완료 항목 (2026-02-14)
- ✅ GitHub Actions CI (`pnpm typecheck → test → lint`)
- ✅ 개인정보처리방침 + 이용약관 (`/privacy`, `/terms`)
- ✅ AI 면책 라벨 자동 삽입 (`responseGenerator.ts` + `stream/route.ts`)
- ✅ EvidenceLabel + DisclaimerBanner 컴포넌트 생성
- ✅ CHANGELOG.md 초기화
- ✅ Expo + NativeWind 프로젝트 스캐폴드 (22개 파일)

---

## 2. 전략 원칙

> **신뢰** → **재방문** → **유료전환** 순서. 기능 확장보다 데이터·신뢰·컴플라이언스를 먼저 완성한다.

### 핵심 가치 정의
UjuZ의 제품 가치는 **(a) 시설 탐색(지도/주변)과 (b) TO(결원/입소 기회) 알림의 '즉시성'**에 있다. 네이티브 앱은 과한 선택이 아니라 **제품-시장 적합(engagement/retention)에 직접 기여하는 구조적 선택**이다.

### 포지셔닝
- **경쟁 회피**: 키즈노트(기관 소통)와 정면 경쟁 X → "입소 전 단계(탐색/대기/전략)"에 집중
- **차별화 축**: 공공데이터 + Bayesian 예측 + AI 상담 = "근거 중심 의사결정 보조"
- **수익 모델**: 프리미엄 구독 (Free → Basic ₩5,900 → Premium ₩9,900/월)
- **앱 우선**: 앱 = 핵심 경험(지도/알림/채팅), 웹 = 유입 채널(SEO/랜딩/결제/온보딩)

### 벤치마크 시사점
| 서비스 | 패턴 | UjuZ 시사점 |
|--------|------|------------|
| 키즈노트 | 보호자 앱 무료, ISMS-P 인증 강조, 스토어/광고 확장 | 신뢰 신호(인증) + 앱 기본 접점 |
| brightwheel | 가족 앱 무료, 기관 대상 커스텀 프라이싱 | B2C 무료 → B2B 과금 |
| Lillio | 부모 무료, 센터 과금(견적 기반) | 같은 패턴 |
| Winnie | 마켓플레이스 → SaaS(센터 규모 기반 구독) | 데이터 플랫폼 → SaaS 전환 경로 |

### BM 아키텍처 (권고 조합)
1. **B2C 구독(핵심)**: TO 알림 + 개인화 + 입소 확률/전략 리포트
2. **B2B2C 제휴(보조)**: 커뮤니티/맘카페/부동산/육아 브랜드와 리드/번들
3. **데이터 서비스(선별)**: 시설/지역 수요 동향 리포트 (비식별)

### 8:2 분업 원칙
- **Codex-Spark (80%)**: 컴포넌트, API 라우트, 결제 연동, 알림 채널, CRUD, CSS, 테스트
- **Claude Opus (20%)**: 아키텍처 설계, 보안 리뷰, 스트리밍 파이프라인, 컴플라이언스 검토

---

## 3. 기술 조합 최종 결정 (Architecture Decision Records)

### ADR-01: 백엔드 아키텍처
| | |
|---|---|
| **결정** | Next.js API Routes를 단일 백엔드로 유지 |
| **근거** | MongoDB 통합, 레이트리밋, 비용 추적, 스트리밍, 인증이 이미 구현됨. x-device-id 패턴으로 모바일 친화적. 별도 백엔드는 인프라 비용 2배 |
| **대안 기각** | Express 분리 (불필요한 마이그레이션), Hono/Fastify (Next.js 에코시스템 이탈) |

### ADR-02: 모바일 프레임워크
| | |
|---|---|
| **결정** | Expo SDK 52 (managed) + NativeWind v4 + expo-router |
| **근거** | 스캐폴드 완성(mobile/), Tailwind 공유 멘탈모델, 파일 기반 라우팅(Next.js와 동일 패턴), EAS Build로 클라우드 빌드 |
| **대안 기각** | Flutter (생태계 전환 비용), 풀 네이티브 Swift/Kotlin (2x 코드베이스), bare workflow (관리 오버헤드) |

### ADR-03: 푸시 알림 스택
| | |
|---|---|
| **결정** | **Expo Push Service** (primary) + **receipt 기반 신뢰성 레이어** |
| **근거** | iOS 웹 푸시 = "홈 화면 추가" 필수 → TO 알림 도달률 치명적. Expo Push는 무료 + APNs/FCM 통합. SLA 없음 → receipt 확인 + 재시도 + 토큰 정리로 보완 |
| **Phase 3 폴백** | DAU >10K 시 직접 FCM/APNs 병행 |
| **대안 기각** | OneSignal (벤더 락인, 비용), 웹 푸시 단독 (iOS 도달률 불가), 직접 FCM만 (iOS 통합 복잡) |
| **구현 요구사항** | SDK 53+ 안드로이드: Expo Go 아닌 개발 빌드 필수. 영수증(Receipt) 체크 → 재시도 → 토큰 정리를 백엔드 KPI로 포함 |

### ADR-04: 지도 SDK
| | |
|---|---|
| **결정** | **react-native-maps** (렌더링) + **Kakao Local REST API** (지오코딩, 백엔드 프록시) |
| **근거** | UjuZ는 자체 시설 DB(data.go.kr lat/lng, 2dsphere 인덱스)가 핵심 → 지도는 "우리 데이터의 렌더러". react-native-maps = RN 생태계 최고 안정성. Kakao Local API = 한국 주소 지오코딩 최적 |
| **대안 기각** | Kakao Map 네이티브 SDK (@react-native-kakao/map: RN 래퍼 미성숙), Naver Map (RN 지원 부족), WebView 지도 (성능/제스처 문제) |
| **비용 주의** | 카카오 API 쿼터/유료 정책 → Phase 2부터 호출량+비용 추적 필수 |
| **Phase 3 재평가** | 사용자 리서치에서 카카오/네이버 지도 타일 강한 선호 확인 시 마이그레이션 |

### ADR-05: 결제 전략
| | |
|---|---|
| **결정** | **웹 결제 전용 (Toss Payments)** + 앱에서 웹 딥링크 |
| **근거** | iOS IAP 30% vs Toss 3.5% → 사용자당 월 ₩1,500+ 절감. 한국 제3자 결제 entitlement 26% + 제한 조건 → 복잡. 앱 "구독하기" → 웹 결제 → 앱 복귀 |
| **Phase 3** | DAU >5K 시 인앱결제 전환율 리프트 평가 후 IAP 추가 검토 |
| **대안 기각** | 인앱결제 초기 도입 (높은 수수료, 규제 부담), Stripe (한국 결제수단 커버리지 부족) |

### ADR-06: 캐싱 전략
| | |
|---|---|
| **결정** | **MongoDB TTL (현행)** + **인메모리 LRU (node-lru-cache)** → Phase 3 Redis |
| **근거** | 현재 <100 DAU → MongoDB TTL 24h 충분. LRU로 핫 경로(입소 점수) 캐싱 = 0원 개선. Redis는 DAU 1K+에서 Upstash(서버리스) 도입 |
| **대안 기각** | Redis 즉시 도입 (과도한 인프라 복잡성), Cloudflare KV (Node 런타임 비호환) |

### ADR-07: API 계약
| | |
|---|---|
| **결정** | Zod 4 스키마 (현행) → **zod-openapi로 OpenAPI 자동 생성** |
| **근거** | Zod 4 이미 사용 중. OpenAPI 생성 = 모바일 클라이언트 타입 안전성 + 외부 DD 신뢰도. 에러 포맷: `{ error, code, details? }` 통일 |
| **버전닝** | `/api/v1/` (현행), `/api/v2/` (모바일 최적화, Phase 2) |

### ADR-08: 모바일 상태 관리
| | |
|---|---|
| **결정** | **Zustand** (클라이언트) + **TanStack Query** (서버) + **expo-secure-store** (인증) |
| **근거** | Zustand = 웹과 동일 패턴. TanStack Query = 자동 리페치/캐싱/옵티미스틱 업데이트. expo-secure-store = 네이티브 암호화 저장소 |

### ADR-09: 모니터링
| | |
|---|---|
| **결정** | Vercel Analytics (웹) → Sentry (Phase 2, 웹+모바일) → 커스텀 푸시 대시보드 |
| **근거** | Phase 1: Vercel 기본 (무료). Phase 2: Sentry 무료 티어 5K events/월. 푸시 메트릭: MongoDB `push_delivery_log` 컬렉션으로 영수증 추적 |

### ADR-10: 모바일 CI/CD
| | |
|---|---|
| **결정** | **EAS Build** (Expo 클라우드) + GitHub Actions 트리거 |
| **근거** | EAS Build 무료 티어 15빌드/월. mobile/ 변경 시 자동 트리거. EAS Update로 JS 변경 OTA 배포 (스토어 심사 우회) |

### ADR-11: 웹/앱 역할 분리
| | |
|---|---|
| **결정** | 웹 = **유입 채널**, 모바일 = **핵심 경험** |
| 웹 담당 | SEO/랜딩, 가격/신뢰, 가입/온보딩, 웹 결제(Toss), 법적 문서(/privacy, /terms), 고객지원 |
| 모바일 담당 | 지도 탐색, TO 푸시 알림, 즐겨찾기/구독, 채팅 상담, 개인화 대시보드, 오프라인/백그라운드 |

### ADR-12: BM 과금 구조
| | |
|---|---|
| **결정** | B2C 프리미엄 구독 (웹 결제) + 향후 B2B 데이터 |
| Free | 기본 검색, 제한된 점수, 커뮤니티 읽기 |
| Basic ₩5,900 | 전체 점수, TO 이메일 알림, Evidence Cards |
| Premium ₩9,900 | 푸시 알림, SMS, 우선 분석, AI 채팅 무제한 |

---

## 4. 12개월 로드맵

### Phase 1: 신뢰 기반 (0~2개월) — 2026-02 ~ 2026-04

**목표**: 데이터/예측 신뢰 확보 + 릴리스 엔지니어링 + Expo 리스크 선제 검증

| 태스크 | 담당 | 상태 | KPI |
|--------|------|------|-----|
| CI/CD (GitHub Actions) | Codex | ✅ 완료 | typecheck → test → lint 게이트 |
| 개인정보/면책 (/privacy, /terms, AI면책) | Claude Agent | ✅ 완료 | 법적 문서 초안 |
| Evidence Label + Disclaimer 컴포넌트 | Codex | ✅ 완료 | 컴포넌트 생성 |
| CHANGELOG + Expo 스캐폴드 | Codex | ✅ 완료 | 22개 파일 |
| 데이터 파이프라인 인메모리 캐시 | Codex | 🔲 대기 | data.go.kr 장애 시 서비스 유지 |
| 입소 엔진 테스트 확장 (60+ 케이스) | Codex | 🔲 대기 | 규정 변경 자동 감지 |
| EvidenceLabel/DisclaimerBanner UI 통합 | Codex | 🔲 대기 | 모든 점수에 근거 라벨 |
| API 에러 포맷 표준화 (T-000) | Codex | ✅ 완료 | `{ error, code }` 통일 → 22개 라우트 v1 마이그레이션 |
| **AUTH_BYPASS 프로덕션 안전 검증** | **Claude** | 🔲 대기 | NODE_ENV 이중 게이트 확인 |
| **Expo 푸시/지도 PoC (실기기)** | **Codex+Claude** | 🔲 대기 | 1~2주 내 실기기 동작 검증 |

### Phase 2: 재방문 엔진 (2~4개월) — 2026-04 ~ 2026-06

**목표**: TO 알림 완성 + 네이티브 핵심 화면 + DAU 확보

| 태스크 | 담당 | 핵심 영역 | KPI |
|--------|------|----------|-----|
| Expo Push (토큰 등록 + 수신 + 영수증 시스템) | Codex | `mobile/` + 새 API | 도달률 95%+, 영수증 성공률 추적 |
| TO 감지 스케줄러 (cron) | Codex | `toDetectionService.ts` | 감지 → 알림 지연 < 30분|
| 네이티브 지도/시설 검색 (react-native-maps) | Codex | `mobile/src/app/` | 지도 화면 완성 |
| Kakao Local API 백엔드 프록시 | Codex | 새 API 라우트 | 주소 지오코딩 동작 |
| 이메일 retry/bounce 처리 | Codex | `emailService.ts` | 전송 성공률 98%+ |
| 커뮤니티 쓰기 + 댓글 | Codex | `community/` | 일 게시글 > 10개 |
| 모바일 채팅 UI | Codex | `mobile/src/app/(tabs)/chat.tsx` | 스트리밍 채팅 동작 |
| API v2 (모바일 최적화) | Codex | 새 라우트 | 응답 크기 30% 감소 |
| **알림 개인화 아키텍처** | **Claude** | 알림 우선순위 + 선호 | 알림 클릭률 > 15% |
| **푸시 신뢰성 모니터링** | **Claude** | `push_delivery_log` 설계 | 장애 15분 내 감지 |

### Phase 3: 유료 전환 (4~6개월) — 2026-06 ~ 2026-08

**목표**: 결제 연동 + 구독 UX + AI 고도화 + 스토어 배포

| 태스크 | 담당 | 핵심 영역 | KPI |
|--------|------|----------|-----|
| Toss Payments 웹 결제 연동 | Codex | `subscriptionService.ts` | 결제 성공률 > 99% |
| 앱→웹 결제 딥링크 | Codex | Universal Links/App Links | 결제 전환율 추적 |
| 구독 해지/환불 UX | Codex | 해지 플로우 | FTC 리스크 0 |
| SMS 알림 (NCP) | Codex | 새 서비스 | 프리미엄 전용 |
| App Store / Play Store 배포 | Codex | EAS Submit | 심사 통과 |
| LLM 가드레일 (프롬프트 인젝션 방어) | Codex | `responseGenerator.ts` | 안전하지 않은 응답 0% |
| **RAG 고도화 (동적 DataBlock)** | **Claude** | `botService.ts` + 벡터 검색 | CSAT 4.0+ |
| **비용 예산 자동화 + 모델 선택** | **Claude** | `costManager.ts` | LLM 월비용 예산 내 |

### Phase 4: 확장 (6~12개월) — 2026-08 ~ 2027-02

**목표**: B2B 탐색 + 파트너십 + 스케일

| 태스크 | 담당 | 핵심 영역 | KPI |
|--------|------|----------|-----|
| B2B 기관용 대기관리 API | Codex | v2 API | PoC 기관 3개+ |
| 데이터 API (외부 제공) | Codex | API 게이트웨이 | API 구독 매출 |
| 인앱결제 검토 (DAU >5K 시) | Codex | IAP 연동 | 전환율 리프트 |
| Upstash Redis 캐싱 (DAU >1K 시) | Codex | 캐시 레이어 | P95 응답시간 감소 |
| 지자체/기관 파트너십 대시보드 | Codex | 관리자 UI | 파트너 온보딩 |
| **엣지 배포 (Cloudflare Workers)** | **Claude** | OpenNext 호환 | TTFB < 100ms |
| **보안 강화 (RBAC, 감사 로그)** | **Claude** | 인증/인가 | 보안 감사 통과 |

---

## 5. KPI 프레임워크

### 푸시 성과
- 구독 대비 푸시 허용률
- 토큰 유효률
- 발송 대비 영수증 성공률
- 알림 클릭률 (목표: >15%)
- 알림 후 24시간 내 재방문율

### 탐색 성과
- 지도 화면 진입률
- 시설 상세 전환율
- 즐겨찾기/구독 전환율
- 검색 → 구독까지 소요 시간

### 사업 성과
- 무료 → 유료 전환율 (동일 코호트)
- 유료 ARPPU
- TO 알림 기반 유지율 (30/90일)
- CS 티켓 / 1천 사용자

---

## 6. 비용 시나리오

### 개발+초기운영 (6개월, Phase 2 도달 기준)

| 구간 | 범위 | 포함 항목 | 핵심 인력(최소) |
|------|------|----------|---------------|
| **저(Lean)** | 6,000만~1.2억 KRW | Expo 뼈대 + 지도/검색 + 기본 푸시 + 웹 결제 + 기본 QA | RN 1, 풀스택 1, 디자이너(파트) |
| **중(Standard)** | 1.2억~2.5억 KRW | + 개인화/구독 UX + 알림 세분화 + 모니터링 + CS툴 + 보안 | RN 1~2, 풀스택 1~2, 데이터 0.5, 디자이너 1 |
| **고(Scale)** | 2.5억~5억 KRW | + 앱스토어 결제 + 다국가 + 고급 추천 + SRE | RN 2, 백엔드 2, 데이터 1, 디자이너 1, QA 1 |

현재 상태: **저(Lean)** 모드에서 **1인 개발** → Codex-Spark 8:2 분업으로 3~4 FTE 생산성 달성 목표.

### 월간 운영비 (런칭 후)

| 항목 | 저(Lean) | 중(Standard) | 고(Scale) |
|------|----------|-------------|----------|
| LLM | ~$50 (하이쿠 중심) | ~$200 (소네/하이쿠 혼합) | ~$1,000+ |
| 서버 | ~$20 (Vercel Free+) | ~$50 (Vercel Pro) | ~$200+ (Workers) |
| DB | $0 (Atlas M0) | ~$50 (M10) | ~$200+ (M30) |
| 푸시 | $0 (Expo Push 무료) | $0 | ~$50 (직접 FCM/APNs 시) |
| 지도 API | $0 (카카오 무료 쿼터) | ~$30 | ~$100+ |
| EAS Build | $0 (무료 15빌드/월) | ~$15 (프로) | ~$50 |

---

## 7. 기술 의사결정 기록 (종합)

| # | 결정 | 선택 | 이유 | Phase |
|---|------|------|------|-------|
| 01 | 백엔드 | Next.js API Routes 단일 | 이미 완성된 인프라 활용 | - |
| 02 | 모바일 | Expo 52 + NativeWind v4 | Tailwind 공유, 파일 라우팅 | 1 |
| 03 | 푸시 | Expo Push + Receipt 레이어 | 무료 + 통합, SLA 보완 | 2 |
| 04 | 지도 렌더링 | react-native-maps | RN 최고 안정성, 커스텀 마커 | 2 |
| 05 | 지오코딩 | Kakao Local REST (백엔드) | 한국 주소 최적, 키 보호 | 2 |
| 06 | 결제 | Toss Payments (웹) + 딥링크 | 3.5% vs IAP 30%, 규제 회피 | 3 |
| 07 | 캐싱 | MongoDB TTL → LRU → Redis | 점진적 확장, 비용 최소화 | 1→3→4 |
| 08 | API 계약 | Zod 4 → OpenAPI 자동 생성 | 타입 안전 + DD 신뢰도 | 1 |
| 09 | 모바일 상태 | Zustand + TanStack Query | 웹 동일 패턴 + 서버 캐싱 | 2 |
| 10 | 모니터링 | Vercel → Sentry → 커스텀 | 점진적 확장 | 1→2→3 |
| 11 | 모바일 CI | EAS Build + GitHub Actions | 무료 클라우드 빌드 | 2 |
| 12 | SMS | NCP SMS | 국내 최저가, 건당 ~9원 | 3 |
| 13 | 벡터 DB | MongoDB Atlas Vector Search | 기존 Atlas 활용, 추가 $0 | 3 |
| 14 | 엣지 | Cloudflare Workers + OpenNext | 이미 devDep 포함 | 4 |

---

## 8. Feature Flag 로드맵

| 플래그 | 현재 | Phase | 해제 조건 |
|--------|------|-------|---------|
| `communityWrite` | `false` | Phase 2 | 댓글 API + 스팸 필터 완성 |
| `toEmailNotification` | `false` | Phase 2 | 이메일 retry + bounce 처리 완성 |
| `pushNotification` | 미존재 | Phase 2 | Expo Push + receipt 시스템 완성 |
| `nativeMap` | 미존재 | Phase 2 | react-native-maps 통합 + 성능 검증 |
| `smsNotification` | 미존재 | Phase 3 | NCP SMS 연동 + 프리미엄 게이팅 |
| `tossPayment` | 미존재 | Phase 3 | Toss Payments 테스트 통과 |
| `vectorRAG` | 미존재 | Phase 3 | Atlas Vector Search 인덱스 + 평가 통과 |
| `inAppPurchase` | 미존재 | Phase 4 | DAU >5K + IAP 전환율 리프트 확인 |
| `b2bApi` | 미존재 | Phase 4 | 기관용 API 스펙 확정 |

---

## 9. 리스크 레지스터

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Expo Push SLA 없음 | TO 알림 누락 → 핵심 가치 훼손 | Receipt 기반 재시도 + 토큰 정리 + Phase 3 직접 FCM 폴백 |
| 카카오 API 쿼터/비용 | 지도 사용량 증가 시 비용 선형 누적 | Phase 2부터 호출량 추적, DevTalk/사업자 심사 채널 사전 확보 |
| iOS/Android 결제 규정 변경 | 수수료/정책 변동 | 웹 결제 우선 전략으로 리스크 분산, IAP는 Phase 4+ |
| AI 규제 (EU AI Act 등) | 글로벌 진출 시 의무 | NIST AI RMF 기반 체크리스트, Phase 3에서 가드레일 구현 |
| Google Maps 한국 데이터 부족 | 지도 UX 불만 | 자체 시설 DB 커스텀 마커로 보완, Phase 3에서 카카오 SDK 재평가 |
| 문서/README 불일치 | DD 신뢰도 하락 | Phase 1에서 API 스펙/보안정책 문서화 |

---

## 10. 아키텍처 다이어그램

```
┌─ Clients ──────────────────────────────────────────┐
│                                                     │
│  ┌─────────────┐         ┌──────────────────────┐  │
│  │ Web (Next.js│         │ Mobile (Expo +       │  │
│  │  SSR/CSR)   │         │  NativeWind)         │  │
│  │             │         │                      │  │
│  │ SEO/랜딩    │         │ 지도/알림/채팅        │  │
│  │ 결제/온보딩  │         │ 즐겨찾기/개인화       │  │
│  └──────┬──────┘         └──────────┬───────────┘  │
│         │                           │               │
└─────────┼───────────────────────────┼───────────────┘
          │    x-device-id / Cookie   │
          ▼                           ▼
┌─ Backend (Next.js API Routes) ─────────────────────┐
│                                                     │
│  /api/v1/facilities  /api/admission/score           │
│  /api/bot/chat/stream  /api/v1/admin/*              │
│  /api/v1/push/register  /api/v1/subscriptions       │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ MongoDB  │ │ LRU Cache│ │ Rate     │           │
│  │ Atlas    │ │ (memory) │ │ Limiter  │           │
│  └──────────┘ └──────────┘ └──────────┘           │
└─────────┬───────────┬───────────┬───────────────────┘
          │           │           │
          ▼           ▼           ▼
┌─ External Services ────────────────────────────────┐
│                                                     │
│  Kakao Local API    Expo Push Service    Anthropic  │
│  (지오코딩)          (APNs+FCM)           (LLM)     │
│                                                     │
│  data.go.kr         Toss Payments       NCP SMS     │
│  (공공데이터)        (결제, Phase 3)     (Phase 3)   │
└─────────────────────────────────────────────────────┘
```

---

*이 문서는 프로젝트 진행에 따라 업데이트한다. 마지막 갱신: 2026-02-14 (v2 — 네이티브 확장 전략 반영)*

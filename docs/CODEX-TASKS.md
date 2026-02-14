# Codex Tasks — Phase 5~8 정본 (Claude Code 실행용)

> A 패키지 티켓 + B 피그마 프레임 명칭 + 실행 순서 통합본.
> API 계약은 `docs/CANONICAL-SPEC.md` 참조. 비래핑 응답(Option A) 통일.

---

## 운영 규칙(필수)

* 한 번에 **1티켓만** Claude Code에 입력
* **P0 → P1 → P2** 순서
* 티켓 완료 시:
  1. **AC(완료조건)** 체크
  2. 수동 테스트 3개(**성공/실패/빈상태**)
  3. 로그/이벤트가 남는지 확인
* **API 계약 변경은 모바일만 고치지 말고**, 서버 응답/에러 규격도 함께 정본에 맞춤

---

## 인덱스(우선순위)

### P0

| 티켓 | 설명 | 상태 |
|------|------|------|
| **T-000** | API 계약 정합화(모바일↔서버): 지도/알림/채팅 | ✅ 완료 |
| **T-001** | 공통 상태 UI 컴포넌트(로딩/빈/오류/권한/제한) | ✅ 완료 |
| **T-002** | 권한 UX(위치/푸시) "필요한 순간 요청" + 거절 대체 동선 | ✅ 완료 |

### P1

| 티켓 | 설명 | Phase | 상태 |
|------|------|-------|------|
| **T-101** | 커뮤니티 글쓰기 UI + 안전장치 | 5 | ✅ 완료 |
| **T-102** | Push 알림 설정 화면(웹/모바일) + 설정 저장 | 5 | ✅ 완료 |
| **T-103** | SEO/GPT 노출 기본기(sitemap/robots/canonical) + 가이드 템플릿 | 5 | ✅ 완료 |
| **T-201** | 온보딩(3-step) + 프리프롬프트 연결 | 6 | ✅ 완료 |
| **T-202** | 지도 메인(주변+검색+필터) | 6 | ✅ 완료 |
| **T-203** | 시설 상세(저장/알림 CTA) | 6 | ✅ 완료 |
| **T-204** | TO 알림 목록(unread 배지/읽음 처리) | 6 | ✅ 완료 |
| **T-205** | 알림 생성/설정(구독 생성/조건/채널/테스트) | 6 | ✅ 완료 |
| **T-206** | 채팅 화면(작동 우선 MVP) | 6 | ✅ 완료 |
| **T-301** | 상담 상품 랜딩(티어+비교+샘플) | 7 | ✅ 완료 |
| **T-302** | 사전 설문(주문/설문 저장) | 7 | ✅ 완료 |
| **T-303** | Toss 결제(initiate+confirm) | 7 | ✅ 완료 |
| **T-304** | 예약 화면(슬롯 or 희망 3개) | 7 | ✅ 완료 |
| **T-305** | 리포트 화면(상태+PDF+체크리스트) | 7 | ✅ 완료 |
| **T-401** | 관리자 대시보드(매출/SLA/실패/원가) | 8 | ✅ 완료 |
| **T-402** | 푸시 모니터링(receipt+token cleanup) | 8 | ✅ 완료 |

### P2

| 티켓 | 설명 | Phase | 상태 |
|------|------|-------|------|
| **T-207** | 마이페이지(정책/문의/권한) | 6 | ✅ 완료 |
| **T-306** | SMS 백업(유료 애드온) | 7 | 🔲 대기 |
| **T-403** | 캐시/레이트리밋 | 8 | 🔲 대기 |
| **T-404** | 기관 Lite(B2B) API + 기본 UI | 8 | 🔲 대기 |

---

## P0 티켓 상세

### T-000. API 계약 정합화 — ✅ 완료

```
커밋: d757a0a feat(T-000): API 계약 정합화 — 에러포맷 정본 + 22개 라우트 v1 마이그레이션
완료: 2026-02-14
```

---

### T-001. 공통 상태 UI 컴포넌트 세트(정본)

```
Title: T-001 공통 상태 UI 컴포넌트 세트(정본)
Phase: 5~6
Priority: P0

Goal:
- 모바일 전 화면에서 동일한 상태 컴포넌트를 사용한다.

Scope:
- 공통 상태 컴포넌트 6종:
  1) LoadingSkeleton
  2) EmptyFirstUse
  3) EmptyNoResults
  4) PermissionDenied (location/push variant)
  5) NetworkError
  6) PlanLimit
- props 표준화:
  - title, description, primaryCta({label, onPress}), secondaryCta?(...)

Files:
- mobile/src/components/states/LoadingSkeleton.tsx
- mobile/src/components/states/EmptyFirstUse.tsx
- mobile/src/components/states/EmptyNoResults.tsx
- mobile/src/components/states/PermissionDenied.tsx
- mobile/src/components/states/NetworkError.tsx
- mobile/src/components/states/PlanLimit.tsx
- mobile/src/app/(tabs)/*

Copy Tone:
- 과장/보장 금지, 다음 행동 1개 CTA 중심

Analytics:
- state_view(screen, state_type)
- state_cta_click(screen, state_type, action)

Acceptance Criteria:
- map/alerts/chat 최소 3개 화면에서 공통 상태 컴포넌트 사용
- CTA 동작(재시도/설정 열기/필터 초기화)이 실제 수행
- 접근성: 터치타겟 44px+, 폰트 확대 시 레이아웃 유지

Manual Tests:
- 네트워크 오프 -> NetworkError 노출 + 재시도
- 권한 거절 -> PermissionDenied 노출 + 설정 열기
- 결과 0개 -> EmptyNoResults 노출 + 필터 초기화 동작
```

---

### T-002. 권한 UX(정본) — 필요 순간 요청 + 거절 대체 동선

```
Title: T-002 권한 UX(정본) - 위치/푸시 필요 순간 요청
Phase: 6
Priority: P0

Goal:
- 위치/푸시 권한을 "기능 진입 시점"에서만 요청한다.
- 거절해도 핵심 플로우(탐색/알림 확인)가 끊기지 않는다.

Scope:
1) 위치 권한
   - 지도 첫 진입에 요청 금지
   - "내 주변 보기" 버튼 탭 -> 프리프롬프트 -> OS 권한 요청
   - 거절 시: 지역 검색(수동 선택)으로 대체
2) 푸시 권한
   - 알림 목록 진입에 요청 금지
   - alert-subscription 생성 직전에 프리프롬프트 -> OS 권한 요청
   - 거절 시: 앱 내 알림센터로 확인(폴백) + 설정 열기 안내
3) 설정 열기
   - OS 설정 페이지로 안내

Files:
- mobile/src/lib/permissions.ts (신규)
- mobile/src/app/(tabs)/map.tsx
- mobile/src/app/alerts/create.tsx (또는 알림 구독 생성 화면)
- mobile/src/components/states/PermissionDenied.tsx

UX States:
- pre_prompt_shown, granted, denied

Analytics:
- permission_prompt(type, entry_point)
- permission_result(type, granted)
- permission_open_settings(type)

Acceptance Criteria:
- 앱 첫 실행 시 권한 팝업 자동 노출 없음
- 지도: "내 주변 보기" 클릭 시에만 위치 권한 요청
- 알림 구독 생성 시점에만 푸시 권한 요청
- 거절해도 지도(검색 기반)와 알림(앱 내 확인)은 정상 사용 가능

Manual Tests:
- iOS/Android: 허용/거절 각각 동선 확인
- 거절 후에도 대체 동선으로 기능 사용 가능한지 확인
```

---

## Phase 5 (P1) 티켓 상세

### T-101. 커뮤니티 글쓰기 UI + 안전장치(정본)

```
Title: T-101 커뮤니티 글쓰기 UI + 안전장치(정본)
Phase: 5
Priority: P1

Goal:
- 글쓰기 MVP를 만들되, 임시저장/가이드/신고 안내로 운영 리스크를 낮춘다.

Scope:
- 제목/본문/카테고리/익명 옵션
- 임시저장(로컬) + 이탈 경고
- 가이드 인라인(개인정보/명예훼손/허위정보 주의)
- 제출 성공/실패 UX

Files:
- src/app/(app)/community/write/page.tsx
- src/components/community/Editor.tsx
- src/lib/validation/community.ts

UX States:
- draft_saved, submit_loading, validation_error, submit_fail

Analytics:
- community_write_start
- community_draft_save
- community_submit_success/fail

Acceptance Criteria:
- 필수 누락 시 필드 단위 에러
- 성공 시 상세/목록 이동 + 토스트
- 임시저장 복구 가능

Manual Tests:
- 빈 제목 제출 -> validation_error
- 서버 500 -> submit_fail UI + 재시도
- 임시저장 후 새로고침 -> 복구 확인
```

---

### T-102. 알림 설정 화면(웹/모바일) + 저장(정본)

```
Title: T-102 알림 설정 화면(정본) + 저장
Phase: 5
Priority: P1

Goal:
- 사용자가 알림 통제감을 느끼게 하고, 설정을 저장/복원한다.

Scope:
- 전체 토글
- quiet hours 프리셋(22:00~07:00)
- 알림 종류 토글(TO/공지/상담)
- 저장(서버 우선):
  - GET/PUT /api/v1/user/notification-settings (권장)
  - 서버가 아직 없으면 MVP는 로컬 저장 -> Phase 6/7에서 서버 연동

Files:
- mobile/src/app/(tabs)/settings/notifications.tsx
- src/app/(app)/settings/notifications/page.tsx (웹 존재 시)
- src/app/api/v1/user/notification-settings/route.ts (신규 가능)

UX States:
- loading, save_success, save_fail

Analytics:
- notif_settings_view
- notif_settings_change(key, value)

Acceptance Criteria:
- 변경 즉시 UI 반영
- 저장 성공/실패 피드백
- 재진입 시 설정 유지(서버/로컬)

Manual Tests:
- 저장 실패 -> 재시도 버튼
- 변경 후 앱 재시작 -> 유지 확인
```

---

### T-103. SEO/GPT 노출 기본기 + 가이드 템플릿(정본)

```
Title: T-103 SEO/GPT 노출 기본기(정본) + 가이드 템플릿
Phase: 5
Priority: P1

Goal:
- 검색/LLM 인용 가능한 콘텐츠 템플릿 + 색인 기본기를 구축한다.

Scope:
- sitemap / robots / canonical 기본 세팅
- 가이드 템플릿:
  - 요약 3줄 -> 체크리스트 -> 주의/리스크 -> 근거 링크 -> 무료 진단 CTA -> 상담 CTA

Files:
- src/app/sitemap.ts
- src/app/robots.ts
- src/app/(marketing)/guides/[slug]/page.tsx
- src/components/guide/Checklist.tsx

Analytics:
- guide_view(slug, region)
- guide_cta_click(cta_type)

Acceptance Criteria:
- /sitemap.xml, /robots.txt 응답 정상
- 가이드 3개 샘플 발행 가능
- canonical 적용 확인

Manual Tests:
- sitemap에 guide URL 포함
- 가이드 렌더/CTA 이벤트 확인
```

---

## Phase 6 (P1/P2) 티켓 상세

### T-201. 온보딩(3-step) + 프리프롬프트 연결(정본)

```
Title: T-201 모바일 온보딩(정본) 3-step
Phase: 6
Priority: P1

Goal:
- 60초 내 가치 전달 + 다음 행동(지도/알림/상담)으로 연결

Scope:
- 3-step: TO 알림 / 지도 탐색 / 상담·리포트
- 완료/스킵 상태 저장
- 권한 프리프롬프트는 연결만(실제 요청은 T-002)

Files:
- mobile/src/app/onboarding.tsx
- mobile/src/lib/storage/onboarding.ts

Analytics:
- onboarding_view
- onboarding_complete
- onboarding_skip

Acceptance Criteria:
- 최초 1회만 노출(재노출 제어)
- 완료/스킵 저장 확인

Manual Tests:
- 스킵 후 재실행 -> 미노출
```

---

### T-202. 지도 메인(정본) — 주변/검색/필터

```
Title: T-202 지도 메인(정본) - nearby/search/filter
Phase: 6
Priority: P1

Goal:
- 탐색 -> 시설 상세 -> 저장/알림 구독으로 이어지는 핵심 화면 완성

Scope:
- 지도 렌더 + "내 주변 보기"(권한은 T-002)
- GET /api/v1/facilities/nearby -> { facilities: [...] }
- 검색(지역/키워드)
- 필터 2~3개: 설립유형/거리/운영시간(최소)

Files:
- mobile/src/app/(tabs)/map.tsx
- mobile/src/components/map/*
- mobile/src/lib/api.ts

UX States:
- loading, empty_no_results, permission_denied, error_network, error_server

Analytics:
- map_view
- map_search(query)
- map_filter_change(key, value)

Acceptance Criteria:
- 검색/필터 적용 시 마커/리스트 갱신 일관
- 마커 탭 -> 시설 상세 이동

Manual Tests:
- 성공/0개/네트워크 오프 상태 확인
```

---

### T-203. 시설 상세(정본) — 저장 + 알림 구독 CTA

```
Title: T-203 시설 상세(정본) - save + alert-subscription CTA
Phase: 6
Priority: P1

Scope:
- 요약 카드(이름/주소/거리/연락)
- 저장 토글(낙관적 업데이트 + 실패 롤백)
  - POST /api/v1/facilities/{id}/save
  - DELETE /api/v1/facilities/{id}/save
- CTA: "TO 알림 받기" -> 알림 구독 생성 화면 이동

Files:
- mobile/src/app/facilities/[id].tsx
- mobile/src/components/facility/*

UX States:
- data_missing, save_fail, error_network

Analytics:
- facility_detail_view(id)
- facility_save_toggle(id, saved)
- facility_create_subscription_click(id)

Acceptance Criteria:
- 저장 토글 즉시 반영
- 알림 구독 생성 화면으로 이동

Manual Tests:
- 저장 성공/저장 실패/정보 일부 누락 상태 확인
```

---

### T-204. TO 알림 목록(정본) — unread + 읽음 처리

```
Title: T-204 TO 알림 목록(정본) - unread + read patch
Phase: 6
Priority: P1

Scope:
- GET /api/v1/to-alerts/unread -> { alerts, unread_count }
- PATCH /api/v1/to-alerts/read body { alert_ids } -> { updated }
- 빈 상태 2종 분리:
  - empty_first_use(알림 구독 없음)
  - empty_no_alerts(구독은 있으나 이벤트 없음)

Files:
- mobile/src/app/(tabs)/alerts.tsx
- mobile/src/components/alerts/*
- mobile/src/lib/api.ts

UX States:
- empty_first_use, empty_no_alerts, error_network, loading

Analytics:
- alerts_view
- alert_open(alert_id)
- alert_mark_read(count)

Acceptance Criteria:
- 읽음 처리 후 unread_count 감소 및 UI 반영
- 실패 시 토스트 + 재시도

Manual Tests:
- unread 존재/0개/서버500 케이스 확인
```

---

### T-205. 알림 생성/설정(정본) — "구독 생성"

```
Title: T-205 알림 구독 생성/설정(정본) - alert-subscriptions
Phase: 6
Priority: P1

Scope:
- 구독 생성:
  - POST /api/v1/alert-subscriptions
    body { facility_id, schedule, channels }
  - Response { subscription_id }
- 조건: 빈도/quiet hours(MVP)
- 채널: push 기본, sms는 Phase7 옵션 토글만
- 성공 시: 알림 목록으로 이동 + 성공 토스트
- 푸시 권한 요청은 "구독 생성 직전"(T-002)

Files:
- mobile/src/app/alerts/create.tsx
- mobile/src/components/alerts/settings/*
- mobile/src/lib/api.ts

UX States:
- validation_error, save_fail, permission_prompt(push)

Analytics:
- subscription_create_start
- subscription_create_success/fail(reason)

Acceptance Criteria:
- 구독 생성 성공 -> 목록 이동 + 성공 토스트
- 푸시 거절해도 구독 생성은 가능(앱 내 확인 폴백)

Manual Tests:
- 성공/validation 실패/plan limit(409) 상태 확인
```

---

### T-206. 채팅 화면(정본) — non-stream

```
Title: T-206 채팅 화면(정본) - POST /api/v1/bot/chat
Phase: 6
Priority: P1

Scope:
- 메시지 리스트 + 입력 + 전송
- POST /api/v1/bot/chat body { message } -> { reply, disclaimer? }
- 에러 처리:
  - 429 RATE_LIMITED -> plan_limited UI
  - 500 SERVER_ERROR -> 네트워크/서버 오류 UI
- CTA: 상담 상품 보기(Phase7 연결)

Files:
- mobile/src/app/(tabs)/chat.tsx
- mobile/src/components/chat/*
- mobile/src/lib/api.ts

Analytics:
- chat_view
- chat_send(len)
- chat_error(type)

Acceptance Criteria:
- 질문->답변 1회 이상 정상 출력
- 실패 시 안내+재시도 동작

Manual Tests:
- 성공/429/네트워크 오프 확인
```

---

### T-207. 마이페이지(정본) — P2

```
Title: T-207 마이페이지(정본) - 정책/문의/권한
Phase: 6
Priority: P2

Scope:
- 메뉴: 알림 설정 / 개인정보처리방침 / 이용약관 / 문의 / 권한 관리
- 정책 문서 링크(웹 URL)

Files:
- mobile/src/app/(tabs)/me.tsx

Analytics:
- me_view
- legal_open(doc_type)

Acceptance Criteria:
- 정책 문서 접근 가능
- 문의 동선 동작
```

---

## Phase 7 (P0/P1/P2) 티켓 상세 — 상담/결제

### T-301. 상담 상품 랜딩(정본)

```
Title: T-301 상담 상품 랜딩(정본) - tier + compare + sample
Phase: 7
Priority: P0

Scope:
- 티어 3개 카드 + 비교표 + 샘플 리포트 미리보기
- CTA: "설문 시작" "상담 예약"
- 패키지 데이터는 API로(권장):
  - GET /api/v1/consultations/packages -> { packages: [...] }

Files:
- src/app/(marketing)/consult/page.tsx
- mobile/src/app/consult/index.tsx (앱 제공 시)

Analytics:
- consult_landing_view
- consult_tier_select(tier)

Acceptance Criteria:
- 티어 선택 -> 설문으로 진입
```

---

### T-302. 사전 설문(정본) — 주문/설문 저장

```
Title: T-302 상담 사전 설문(정본) - create order + intake submit
Phase: 7
Priority: P0

Scope:
- 필수5/선택5 + 진행률
- 로컬 임시저장
- 제출 플로우:
  1) POST /api/v1/consultations/orders -> { order_id, status }
  2) POST /api/v1/consultations/orders/{orderId}/intake -> { status }

Files:
- src/app/(marketing)/consult/intake/page.tsx
- src/app/api/v1/consultations/orders/route.ts
- src/app/api/v1/consultations/orders/[id]/intake/route.ts

Analytics:
- consult_intake_start
- consult_intake_submit_success/fail

Acceptance Criteria:
- 제출 후 결제 단계로 이동
- 임시저장 복구 가능
```

---

### T-303. Toss 결제(정본) — initiate + confirm

```
Title: T-303 Toss 결제 플로우(정본) - initiate + confirm
Phase: 7
Priority: P0

정본 플로우:
1) POST /api/v1/payments/initiate  body { order_id, amount_krw, order_name }
2) Toss 결제창 -> 성공 시 /payment/success 페이지로 리다이렉트
3) 페이지가 POST /api/v1/payments/confirm 호출:
   body { paymentKey, orderId, amount }
4) 성공 시 주문 status=PAID

Scope:
- 결제 진행/성공/실패 화면
- 실패 시 재시도/CS 안내

Files:
- src/app/api/v1/payments/initiate/route.ts
- src/app/api/v1/payments/confirm/route.ts (신규)
- src/app/(marketing)/consult/payment/*
- src/app/payment/success/page.tsx
- src/app/payment/fail/page.tsx

Analytics:
- payment_initiate
- payment_confirm_success
- payment_confirm_fail(reason)

Acceptance Criteria:
- sandbox 결제 성공/실패 재현 가능
- confirm 성공 시 order 상태가 PAID로 전이
```

---

### T-304. 예약 화면(정본)

```
Title: T-304 상담 예약(정본) - slot or 3 choices
Phase: 7
Priority: P1

Scope:
- 옵션 A: 슬롯 선택(availability 제공)
- 옵션 B(MVP): 희망시간 3개 제출 -> 운영자 확정
- API:
  - (옵션) GET /api/v1/consultations/availability?date=YYYY-MM-DD
  - POST /api/v1/consultations/orders/{orderId}/appointments

Files:
- src/app/(marketing)/consult/booking/*
- src/app/api/v1/consultations/availability/route.ts
- src/app/api/v1/consultations/orders/[id]/appointments/route.ts

Analytics:
- consult_booking_view
- consult_booking_submit

Acceptance Criteria:
- 예약 정보가 주문에 연결되고 어드민에서 확인 가능
```

---

### T-305. 리포트 화면(정본)

```
Title: T-305 리포트 화면(정본) - status + pdf + checklist
Phase: 7
Priority: P1

Scope:
- 상태: WRITING/READY/DELIVERED
- PDF 다운로드
- 다음 행동 체크리스트(앱에서도 표시)
- CTA: TO 알림 구독 만들기

API:
- GET /api/v1/consultations/orders/{orderId}/report -> { status, report?, pdf_url? }

Files:
- src/app/(marketing)/consult/report/page.tsx
- src/app/api/v1/consultations/orders/[id]/report/route.ts
- mobile/src/app/consult/report.tsx (앱 제공 시)

Analytics:
- report_view
- report_download
- report_cta_alert_setup

Acceptance Criteria:
- READY 상태에서 다운로드 가능
```

---

### T-306. SMS 백업(유료 애드온)(정본) — P2

```
Title: T-306 SMS 백업(정본) - opt-in + cost cap
Phase: 7
Priority: P2

Scope:
- SMS 옵션 토글(기본 OFF)
- 비용 안내 + 동의 체크박스 + 해지 경로
- 서버: 월/일 상한(캡) 초과 시 차단 + 로그

Files:
- mobile/src/app/(tabs)/settings/notifications.tsx
- src/app/api/v1/sms/*

Analytics:
- sms_opt_in
- sms_send
- sms_blocked(reason)

Acceptance Criteria:
- opt-in 없이는 SMS 발송 불가
- 캡 초과 시 자동 차단 동작
```

---

## Phase 8 (P1/P2) 티켓 상세 — 운영/Admin/B2B

### T-401. 관리자 대시보드(정본)

```
Title: T-401 Admin 대시보드(정본) - 매출/SLA/실패/원가
Phase: 8
Priority: P1

Scope:
- 카드 6개:
  1) 오늘 결제/매출
  2) 결제 실패율
  3) 리포트 SLA(48h 초과)
  4) 푸시 실패율
  5) 지도 호출 추정(원가 지표)
  6) SMS 비용(옵션)
- 기간 필터(7/30d)
- SLA 초과 리스트 drill-down

API:
- GET /api/v1/admin/metrics?range=7d

Files:
- src/app/(app)/admin/page.tsx
- src/app/api/v1/admin/metrics/route.ts

Analytics:
- admin_dashboard_view

Acceptance Criteria:
- 최소 3개 지표가 DB 기반으로 표시
- SLA 초과 클릭 -> 상세 리스트 이동
```

---

### T-402. 푸시 모니터링(정본)

```
Title: T-402 Admin 푸시 모니터링(정본) - receipt + token cleanup
Phase: 8
Priority: P1

Scope:
- 24h/7d 집계: sent/delivered/failed
- 실패 Top3 테이블
- 토큰 정리 수 표시

API:
- GET /api/v1/admin/push-metrics?range=24h

Files:
- src/app/(app)/admin/push/page.tsx
- src/app/api/v1/admin/push-metrics/route.ts

Acceptance Criteria:
- Top3 실패 유형 표 표시
- tokens_cleaned 수 표시
```

---

### T-403. 캐시/레이트리밋(정본) — P2

```
Title: T-403 캐시/레이트리밋(정본) - facilities/to-alerts
Phase: 8
Priority: P2

Scope:
- nearby 캐시(30~120초)
- facility detail 캐시(더 길게)
- to-alerts/unread 캐시(짧게)
- 레이트리밋 저장소 Redis/KV 전환(가능하면)

Files:
- src/lib/server/cache/*
- src/app/api/v1/facilities/*
- src/app/api/v1/to-alerts/*

Acceptance Criteria:
- 반복 호출 시 체감 성능 개선
- 캐시 히트 로그 확인
```

---

### T-404. 기관 Lite(B2B) MVP(정본) — P2

```
Title: T-404 기관 Lite(B2B) MVP(정본) - profile + leads + admin
Phase: 8
Priority: P2

Scope:
- Partner API(최소 3개):
  1) PATCH /api/v1/partner/profile
  2) POST  /api/v1/partner/leads
  3) GET   /api/v1/partner/leads
- 인증: partner API key(헤더)
- Admin UI: 기관 목록/상세 + 리드 인박스 + 상태 변경(new/in_progress/done)

Files:
- src/app/api/v1/partner/*
- src/app/(app)/admin/orgs/*
- src/lib/server/authPartner.ts

Analytics:
- b2b_lead_received
- b2b_lead_status_change

Acceptance Criteria:
- 테스트 API key로 리드 생성->조회 가능
- 관리자 화면에서 리드 상태 변경 가능
```

---

## 디자인 스택 (D-시리즈) — 2026 트렌드 기반 UX/UI

> **원칙**: 토큰→컴포넌트→상태→핸드오프→QA 순서로 설계.
> Web(Tailwind) + Mobile(NativeWind) 동일 토큰 파이프라인.
> 접근성(WCAG 2.2 + 44×44pt 터치타겟)은 기본값.

### D-시리즈 인덱스

| 티켓 | 설명 | 의존 | 상태 |
|------|------|------|------|
| **D-001** | 디자인 토큰 파이프라인 (Figma Variables → tokens.json → Tailwind/NativeWind) | — | 🔲 대기 |
| **D-002** | 접근성 표준 & 체크리스트 (WCAG 2.2 + iOS/Android 가이드) | — | 🔲 대기 |
| **D-003** | 타이포그래피 스케일 & Dynamic Type 대응 | D-001 | 🔲 대기 |
| **D-004** | 권한 UX 디자인 스펙 (프리프롬프트/거절 대체 동선) | D-001 | 🔲 대기 |
| **D-005** | 적응형/반응형 레이아웃 파운데이션 (폰/태블릿/데스크톱) | D-001 | 🔲 대기 |
| **D-006** | 상태 UI 디자인 시스템 (7종 × 카피 톤 통일) | D-001, D-002 | 🔲 대기 |
| **D-007** | Figma 파일 구조 세팅 (Pages/네이밍/모드 3종) | D-001 | 🔲 대기 |
| **D-008** | 코어 컴포넌트 10종 디자인 (버튼~상태컴포넌트) | D-001, D-002, D-003 | 🔲 대기 |
| **D-009** | 리서치 바인더 세팅 (Foundations/Platform/Product 문서) | — | 🔲 대기 |
| **D-010** | 디자인 QA 기준선 (접근성 + 알림/권한 + 핸드오프 체크) | D-002 | 🔲 대기 |
| **D-011** | P6 핵심 화면 디자인 (지도/시설상세/알림 × 상태) | D-006, D-007, D-008 | 🔲 대기 |
| **D-012** | P7 수익화 화면 디자인 (랜딩/설문/결제/리포트) | D-008 | 🔲 대기 |
| **D-013** | P8 Admin 화면 디자인 (대시보드/푸시/B2B) | D-008 | 🔲 대기 |

---

### D-001. 디자인 토큰 파이프라인

```
Title: D-001 디자인 토큰 파이프라인 — Figma → Code 싱크
Priority: P0 (모든 디자인/구현의 기반)

Goal:
- Figma Variables를 Single Source of Truth로 두고
  Web(Tailwind) + Mobile(NativeWind)가 같은 토큰을 사용한다.

Scope:
1) 토큰 범위(최소):
   - Color: bg/surface/text/border/brand/semantic(success/warn/error)
   - Typography: fontFamily/fontSize/lineHeight/fontWeight
   - Spacing: 2/4/8/12/16/20/24/32
   - Radius: sm/md/lg/xl
   - Shadow: sm/md
   - Motion: duration/easing (reduce motion 고려)

2) 모드(Mode) 설계 — 최소 3개:
   - Light / Dark / HighContrast

3) 파이프라인:
   - Figma Variables → Tokens Studio(Plugin) → tokens.json(repo)
   - tokens.json → tailwind config (globals.css @theme)
   - tokens.json → nativewind config (mobile/)

4) 코드 연동 검증:
   - globals.css @theme 블록의 커스텀 토큰이
     Tailwind v4 유틸리티와 충돌하지 않도록 네이밍 규칙 확정
   - 주의: --spacing-xs/sm/md/lg/xl/2xl 이름은 max-w-* 유틸리티와 충돌
     → spacing은 숫자 스케일(--spacing-1 ~ --spacing-12) 또는
       고유 접두사(--gap-xs) 사용 권장

Deliverables:
- docs/design/01-token-map.md (토큰 네이밍 ↔ Tailwind/NativeWind 매핑표)
- tokens.json (또는 Tokens Studio 동기화 구조)
- globals.css @theme 업데이트 (충돌 해소)

Acceptance Criteria:
- 동일 토큰으로 웹/모바일 색상·간격·폰트가 일치
- Light/Dark 모드 전환 시 토큰 기반 자동 전환
- max-w-*, p-*, m-* 등 Tailwind 유틸리티와 충돌 없음
```

---

### D-002. 접근성 표준 & 체크리스트

```
Title: D-002 접근성 표준 & 체크리스트 — WCAG 2.2 + 모바일 가이드
Priority: P0

Goal:
- 접근성을 "옵션"이 아닌 기본값으로 디자인 시스템에 내장한다.

Scope:
1) Web 기준:
   - WCAG 2.2 핵심 체크: 키보드 내비게이션, 포커스 관리, 대체 텍스트, 오류 방지
   - 색상 대비 4.5:1 (텍스트), 3:1 (대형 텍스트/UI)

2) Mobile 기준:
   - iOS 터치 타겟 최소 44×44pt
   - Android Material 3 터치 타겟 48dp
   - React Native 접근성 props 규칙:
     accessibilityLabel, accessibilityRole, accessibilityHint, accessible

3) 공통:
   - 스크린리더 대응 (VoiceOver/TalkBack)
   - 폰트 확대(200%) 시 레이아웃 유지
   - reduce-motion 대응

Deliverables:
- docs/design/02-accessibility-checklist.md
- 컴포넌트별 필수 접근성 속성 표

Acceptance Criteria:
- 모든 CTA 버튼 44×44pt 이상
- 모든 이미지/아이콘에 대체 텍스트
- 키보드만으로 핵심 플로우 완료 가능(웹)
```

---

### D-003. 타이포그래피 스케일 & Dynamic Type 대응

```
Title: D-003 타이포그래피 스케일 & Dynamic Type
Priority: P0

Goal:
- 부모 사용자층의 높은 가독성 요구를 반영한 타이포 시스템 구축
- iOS Dynamic Type / Android 폰트 스케일 대응

Scope:
1) 타이포 스케일 정의:
   - xs(12) / sm(14) / base(16) / lg(18) / xl(20) / 2xl(24) / 3xl(30)
   - lineHeight: 1.4(제목) / 1.6(본문) / 1.8(밀도 높은 정보)
   - fontWeight: regular(400) / medium(500) / semibold(600) / bold(700)

2) Dynamic Type 대응:
   - Apple HIG: 모든 글자 크기에 레이아웃 적응
   - Material 3: 디바이스/컨텍스트별 스케일
   - 최소/최대 폰트 크기 클램프 설정

3) 정보 밀도 가이드:
   - 알림 목록: 밀도 높음(1줄 제목 + 메타)
   - 시설 상세: 밀도 보통(카드형)
   - 채팅: 밀도 낮음(여유 있는 줄간격)

Deliverables:
- docs/design/03-typography-scale.md
- Figma Text Styles 정의

Acceptance Criteria:
- iOS 접근성 설정에서 "더 큰 텍스트" 활성화 시 레이아웃 유지
- Android 폰트 크기 200%에서 텍스트 잘림 없음
```

---

### D-004. 권한 UX 디자인 스펙

```
Title: D-004 권한 UX 디자인 스펙 — 프리프롬프트 + 거절 대체 동선
Priority: P0

Goal:
- "필요한 순간" 권한 요청 + 거절해도 핵심 플로우가 끊기지 않는 설계

Scope:
1) 위치 권한:
   - 프리프롬프트 화면 디자인 (왜 필요한지 1줄 설명 + 아이콘)
   - 허용 → 지도 내 주변 마커
   - 거절 → 지역 검색(수동 선택) 전환

2) 푸시 권한:
   - 프리프롬프트 화면 디자인 (TO 알림 가치 설명)
   - 허용 → 푸시 채널 활성
   - 거절 → 앱 내 알림센터 폴백 + 설정 열기 안내

3) 설정 열기 시트:
   - BottomSheet로 "설정에서 권한을 변경할 수 있어요" 안내
   - OS 설정 딥링크

Deliverables:
- Figma 프레임: P6/Common/Permission/* (3종 × 각 상태)
- docs/design/04-permission-ux-spec.md

Acceptance Criteria:
- 앱 첫 실행 시 자동 권한 팝업 없음
- 거절 후에도 모든 핵심 화면 접근 가능
```

---

### D-005. 적응형/반응형 레이아웃 파운데이션

```
Title: D-005 적응형/반응형 레이아웃 — 폰/태블릿/데스크톱
Priority: P1

Goal:
- 모바일(폰) + 태블릿(부모 탐색) + 데스크톱(Admin) 멀티 폼팩터 대응

Scope:
1) 브레이크포인트 정의:
   - mobile: ~640px (1열)
   - tablet: 641~1024px (2열 또는 마스터-디테일)
   - desktop: 1025px~ (사이드바 + 콘텐츠)

2) 레이아웃 패턴:
   - AppShell: 모바일=바텀탭, 태블릿+=사이드바
   - 지도: 모바일=풀스크린, 태블릿+=사이드 패널
   - Admin: 사이드바 + 카드 그리드

3) 컨테이너 전략:
   - max-w-[32rem] (모바일 앱 느낌)
   - max-w-none (태블릿+)
   - Material 3 Adaptive 참고

Deliverables:
- docs/design/05-layout-system.md
- Figma 프레임: 주요 화면별 모바일/태블릿 2종

Acceptance Criteria:
- 640px~1280px 리사이즈 시 깨짐 없음
- Admin 페이지 1024px 이상에서 정상 사용
```

---

### D-006. 상태 UI 디자인 시스템

```
Title: D-006 상태 UI 디자인 시스템 — 7종 × 카피 톤 통일
Priority: P0

Goal:
- "기능보다 상태가 더 자주 노출된다" → 상태 경험이 곧 품질

Scope:
1) 표준 상태 7종:
   - loading (스켈레톤)
   - empty_first_use (첫 사용, 다음 행동 안내)
   - empty_no_results (검색/필터 결과 없음)
   - error_network (인터넷 연결 문제)
   - error_server (서버 문제, 재시도)
   - permission_denied (권한 거절, 설정 안내)
   - plan_limited (무료 한도, 업그레이드 CTA)

2) 카피 톤 규칙:
   - 과장/보장 금지
   - 다음 행동 1개 CTA 중심
   - 예: "네트워크 연결을 확인해 주세요" + [다시 시도] 버튼

3) 컴포넌트 Props 표준:
   - icon, title, description, primaryCta, secondaryCta?
   - 웹/모바일 동일 Props 인터페이스

Deliverables:
- Figma 프레임: P6/Common/State/* (7종 × default)
- 카피 가이드 시트 (상태별 제목/설명/CTA 텍스트)

Acceptance Criteria:
- 모든 화면에서 동일한 상태 컴포넌트 사용
- 카피 톤이 일관됨 (과장 없음, CTA 명확)
```

---

### D-007. Figma 파일 구조 세팅

```
Title: D-007 Figma 파일 구조 세팅 — Pages/네이밍/모드
Priority: P0 (Day 1 세팅)

Goal:
- "바로 그릴 수 있는" 표준 구조의 Figma 파일 세팅

Scope:
1) Figma Pages:
   - 00_Cover & Spec
   - 01_Flows (User + Admin)
   - 02_Tokens (Variables/Modes)
   - 03_Components_Core
   - 04_Components_Domain
   - 05_P5_Web
   - 06_P6_Mobile
   - 07_P7_Monetization
   - 08_P8_Admin
   - 09_Content (SEO/GPT)

2) Variables 구조:
   - Color, Typography, Spacing, Radius, Shadow, Motion
   - Modes: Light / Dark / HighContrast

3) 프레임 네이밍 규칙:
   P{Phase}/{Tab}/{Screen}/{State}
   예: P6/탐색/지도메인/default

Deliverables:
- Figma 파일 (Pages + Variables 초안)
- docs/design/07-figma-conventions.md

Acceptance Criteria:
- 모든 Pages 생성 + Variables 1차 등록
- Light/Dark/HighContrast 모드 뼈대 완성
```

---

### D-008. 코어 컴포넌트 10종 디자인

```
Title: D-008 코어 컴포넌트 10종 디자인
Priority: P0

Goal:
- 모든 화면에서 재사용하는 기본 컴포넌트 10종 디자인 확정

Scope:
1) 10종:
   ① Button (primary/secondary/ghost/danger × sm/md/lg)
   ② Input (text/search/select × default/focus/error/disabled)
   ③ Toggle/Switch
   ④ Chip/Tag (선택/필터용)
   ⑤ Badge (unread count/상태 표시)
   ⑥ Card (기본/시설/알림)
   ⑦ BottomSheet
   ⑧ Toast (success/error/info)
   ⑨ Modal/Dialog
   ⑩ StateComponent (D-006의 7종 래퍼)

2) 각 컴포넌트별:
   - Variants/Props 정의
   - States: default/hover/pressed/focus/disabled
   - 접근성: 터치타겟 44pt+, accessibilityRole

Deliverables:
- Figma 03_Components_Core 페이지
- docs/design/08-component-spec.md (Props/States/Events 표)

Acceptance Criteria:
- 10종 모두 Figma Component Set으로 등록
- Dark Mode에서도 정상 표시
- 접근성 속성 명세 포함
```

---

### D-009. 리서치 바인더 세팅

```
Title: D-009 리서치 바인더 세팅 — 조사 결과가 구현에 바로 연결
Priority: P1

Goal:
- "조사 → 의사결정 → 구현"이 끊김 없이 이어지는 문서 구조

Scope:
(1) Foundations:
   - 01-Design-Principles.md (톤/문구 룰, 상태 네이밍 표준)
   - 02-Accessibility-Checklist.md (D-002 산출물)

(2) Platform Guidelines:
   - 03-iOS-Permissions.md (알림/위치 권한 가이드)
   - 04-Typography-DynamicType.md (D-003 산출물)

(3) Product Research:
   - 05-Competitor-Audit.xlsx (검색/지도/알림/결제/상담 퍼널 비교)
   - 06-User-Questions.md (부모가 GPT/검색에 묻는 질문 50개)
   - 07-Usability-Test-Plan.md (5명 테스트 스크립트)

(4) UX Research 질문 12개:
   ① 위치 권한 요청 최적 시점
   ② 위치 거절 시 대체 동선 선호
   ③ TO 알림 빈도 선호(즉시/하루1회/조용한시간)
   ④ 푸시를 끄는 이유
   ⑤ 알림 후 실제 행동 여부
   ⑥ 상담 구매 시 불안 지점
   ⑦ PDF 리포트에서 핵심 1~2장
   ⑧ 체크리스트 vs 설명형 선호
   ⑨ 아이 정보 입력 시 민감 항목
   ⑩ 관심시설 저장 개수
   ⑪ 앱 리텐션 핵심 요소(알림/정보/상담)
   ⑫ 결제 의향 시점(입소 시즌/대기 변동/결정 직전)

Deliverables:
- docs/design/ 폴더 구조 + 각 문서 초안

Acceptance Criteria:
- 모든 문서 경로가 존재하고 목차 포함
- 리서치 질문이 인터뷰에 바로 사용 가능한 문장
```

---

### D-010. 디자인 QA 기준선

```
Title: D-010 디자인 QA 기준선 — 개발 시작 전 확정
Priority: P0

Goal:
- 구현 후 QA에서 "무엇을 체크할지" 사전 합의

Scope:
1) 접근성 QA:
   - iOS 터치 타겟 44×44pt
   - Dynamic Type/폰트 확대 시 깨짐 없음
   - RN: accessibilityLabel/Role/Hint 규칙
   - Web: WCAG 2.2 체크리스트

2) 알림/권한 QA:
   - 앱 첫 실행: 자동 권한 팝업 없음
   - 프리프롬프트 → OS 요청 → 허용/거절 각 동선 확인
   - 거절 후 대체 동선 정상 동작

3) 상태 QA:
   - 모든 화면에서 7종 상태 도달 가능한 시나리오
   - 카피 톤 일관성 체크

4) 핸드오프 QA:
   - Figma ↔ 구현 간 토큰(색/간격/폰트) 일치
   - 컴포넌트 Props가 Figma Variants와 1:1 매칭

Deliverables:
- docs/design/10-design-qa-checklist.md

Acceptance Criteria:
- 체크리스트 항목 최소 30개
- Phase별 QA 시나리오 포함
```

---

### D-011. P6 핵심 화면 디자인

```
Title: D-011 P6 핵심 화면 디자인 — 지도/시설상세/알림 × 상태
Priority: P1
의존: D-006, D-007, D-008

Goal:
- Phase 6 핵심 3개 화면의 default + empty + error 상태까지 완성

Scope:
- 지도 메인: default|loading|permission_denied|empty_no_results|error_network
- 시설 상세: default|loading|error_network|data_missing
- 알림 목록: default|loading|empty_first_use|empty_no_alerts|error_network
- 알림 구독 생성: default|permission_prompt|success_toast
- 채팅: default|loading_reply|error_network|plan_limited
- 온보딩: step1~3 + complete
- 마이페이지: 메인/알림설정/정책문서/권한관리

Deliverables:
- Figma 06_P6_Mobile 페이지 완성

Acceptance Criteria:
- 모든 화면 × 모든 상태 프레임 존재
- 접근성 QA 기준(D-010) 충족
- 44×44pt 터치타겟 확인 완료
```

---

### D-012. P7 수익화 화면 디자인

```
Title: D-012 P7 수익화 화면 디자인 — 랜딩/설문/결제/리포트
Priority: P1
의존: D-008

Scope:
- 상담 랜딩: default|tier_compare|sample_preview
- 사전 설문: default|progress_60|validation_error|save_draft
- 결제: 진행/성공/실패
- 예약: slot_picker|3choices_submit
- 리포트: writing|ready|delivered|checklist
- SMS 옵션: default|consent_required|blocked_by_cap

Deliverables:
- Figma 07_P7_Monetization 페이지 완성
```

---

### D-013. P8 Admin 화면 디자인

```
Title: D-013 P8 Admin 화면 디자인 — 대시보드/푸시/B2B
Priority: P1
의존: D-008

Scope:
- Admin 대시보드: default|filters|drilldown
- 푸시 모니터링: default|failure_top3|token_cleanup
- 기관 관리: list|detail
- 리드 인박스: inbox

Deliverables:
- Figma 08_P8_Admin 페이지 완성
```

---

## 빠른 실행 순서(정본) — 개발(T) + 디자인(D) 통합

```
── Day 1~2 (디자인 세팅) ──────────────────────
D-001 토큰 파이프라인 + D-007 Figma 구조 세팅
D-002 접근성 체크리스트 + D-009 리서치 바인더
D-006 상태 UI 7종 카피 톤 고정
D-008 코어 컴포넌트 10종 프레임
D-003 타이포 스케일 + D-010 QA 기준선

── Phase 5 (완료) ──────────────────────────────
T-000 ✅ → T-001 ✅ → T-002 ✅
T-101 ✅ → T-102 ✅ → T-103 ✅

── Phase 6 (개발 + 디자인 병행) ────────────────
D-004 권한 UX 스펙 + D-005 레이아웃
D-011 P6 핵심 화면 디자인
T-201 ✅ 온보딩 → T-202 ✅ 지도 → T-203 ✅ 시설상세
T-204 ✅ 알림목록 → T-205 ✅ 알림구독 → T-206 ✅ 채팅
T-207 ✅ 마이페이지

── Phase 7 (수익화) ────────────────────────────
D-012 P7 화면 디자인
T-301 ✅ 랜딩 → T-302 ✅ 설문 → T-303 ✅ 결제
T-304 ✅ 예약 → T-305 ✅ 리포트
T-306 SMS(P2)

── Phase 8 (Admin/운영) ────────────────────────
D-013 P8 화면 디자인
T-401 ✅ Admin 대시보드 → T-402 ✅ 푸시 모니터링
T-403 캐시(P2) → T-404 B2B(P2)
```

---

## 48시간 디자인 세팅 플랜

### Day 1 (4~6시간)

| # | 작업 | 티켓 |
|---|------|------|
| 1 | Figma 파일 생성 + Pages 세팅 | D-007 |
| 2 | Variables(토큰) 초안: color/spacing/type/radius | D-001 |
| 3 | 모드: Light/Dark/HighContrast 뼈대 | D-001 |
| 4 | Core Components 10종 프레임 생성 | D-008 |
| 5 | 상태 UI 7종 카피 톤 고정 | D-006 |

### Day 2 (4~6시간)

| # | 작업 | 티켓 |
|---|------|------|
| 1 | Tokens Studio 연결 → export 구조 결정 | D-001 |
| 2 | 권한 UX 프리프롬프트 2종 + 거절 대체 동선 | D-004 |
| 3 | P6 핵심 화면 3개(지도/시설상세/알림) default+empty+error | D-011 |
| 4 | 접근성 체크(44×44, Dynamic Type) 1차 QA | D-002, D-010 |

---

## 피그마 프레임 명칭(B 패키지)

> 네이밍 규칙: `P{Phase}/{Tab}/{Screen}/{State}`

### Figma Pages

* `00_Cover & Spec`
* `01_Flows (User + Admin)`
* `02_Design Tokens`
* `03_Components (Core)`
* `04_Components (Domain)`
* `05_P5_Web`
* `06_P6_Mobile`
* `07_P7_Monetization`
* `08_P8_Admin`
* `09_Content (SEO/GPT)`

### 공통 상태 프레임

* `P6/Common/State/loading/default`
* `P6/Common/State/empty_first_use/default`
* `P6/Common/State/empty_no_results/default`
* `P6/Common/State/error_network/default`
* `P6/Common/State/error_server/default`
* `P6/Common/State/permission_denied_location/default`
* `P6/Common/State/permission_denied_push/default`
* `P6/Common/State/plan_limited/default`

### 권한 프롬프트 프레임

* `P6/Common/Permission/location_pre_prompt/default`
* `P6/Common/Permission/push_pre_prompt/default`
* `P6/Common/Permission/open_settings_sheet/default`

### Phase 6 모바일

* `P6/온보딩/step1~3/default`, `P6/온보딩/complete/default`
* `P6/탐색/지도메인/default|loading|permission_denied|empty_no_results|error_network`
* `P6/탐색/검색결과_리스트/default`, `P6/탐색/필터_바텀시트/default`
* `P6/탐색/시설상세/default|loading|error_network|data_missing`
* `P6/알림/목록/default|loading|empty_first_use|empty_no_alerts|error_network`
* `P6/알림/구독생성/default|permission_prompt|success_toast`
* `P6/상담/채팅/default|loading_reply|error_network|plan_limited`
* `P6/마이/메인/default`, `P6/마이/알림설정/default`, `P6/마이/정책문서/default`, `P6/마이/권한관리/default`

### Phase 7 수익화

* `P7/상담/랜딩/default|tier_compare_table|sample_report_preview`
* `P7/상담/설문/default|progress_60|validation_error|save_draft_toast`
* `P7/결제/진행/default`, `P7/결제/성공/default`, `P7/결제/실패/default`
* `P7/상담/예약/default|optionA_slot_picker|optionB_3choices_submit`
* `P7/상담/리포트/writing|ready|delivered|checklist_module`
* `P7/설정/SMS옵션/default|consent_required|blocked_by_cap`

### Phase 8 Admin

* `P8/Admin/Dashboard/default|filters_7d_30d|card_drilldown_orders`
* `P8/Admin/PushMonitor/default|failure_top3_table|token_cleanup_stats`
* `P8/Admin/Orgs/list|detail`, `P8/Admin/Leads/inbox`

---

*정본 v3 — 2026-02-14. D-시리즈(디자인 스택) 추가. API 계약 변경 시 `docs/CANONICAL-SPEC.md`와 동기화 필수.*

# Canonical API Spec — Phase 5~8 (정본)

> 비래핑 응답(Option A) 통일. 이 문서가 서버/모바일/웹 공통 계약의 단일 진실 원천(SSOT)이다.

---

## 0.1 API Prefix / 네이밍

* 모든 API: `/api/v1/*`
* 발생 알림(이벤트): `/api/v1/to-alerts/*`
* 알림 설정(구독/규칙): `/api/v1/alert-subscriptions/*`
* 챗봇: `/api/v1/bot/chat`
* 푸시 토큰 등록: `/api/v1/push/register`
* 상담: `/api/v1/consultations/*`
* 결제(Toss): `/api/v1/payments/*`
* Admin: `/api/v1/admin/*`
* Partner(B2B): `/api/v1/partner/*`

> "alerts" 혼동 방지: **to-alerts(발생)** / **alert-subscriptions(설정)** 분리

## 0.2 공통 헤더

* `content-type: application/json`
* `x-device-id: <uuid>` (모바일/비로그인 세션 식별)
* `authorization: Bearer <token>` (선택)

## 0.3 공통 응답 포맷(비래핑)

### 성공

```json
{ "facilities": [] }
```

### 실패(모든 API 동일)

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "잠시 후 다시 시도해 주세요.",
    "details": {}
  }
}
```

## 0.4 HTTP Status ↔ Error Code

| Status | Code | 용도 |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | 입력 검증 실패 |
| 401 | `UNAUTHORIZED` | 인증 필요 |
| 403 | `FORBIDDEN`, `PUSH_NOT_ENABLED` | 권한 부족 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `PLAN_LIMIT_REACHED` | 플랜 한도 초과 |
| 429 | `RATE_LIMITED` | 요청 제한 |
| 500 | `SERVER_ERROR` | 서버 오류 |
| 402 | `PAYMENT_FAILED` | 결제 전용(선택) |

## 0.5 날짜/시간

* 서버 저장: UTC
* API 입출력: **ISO 8601** (offset 포함 허용: `2026-02-20T10:00:00+09:00`)

---

## 1. 공통 타입

### Facility

```json
{
  "id": "fac_abc",
  "name": "해피키즈 어린이집",
  "lat": 37.1234,
  "lng": 127.1234,
  "address": "서울 ...",
  "type": "public",
  "tags": ["국공립", "연장보육"],
  "distance_m": 820
}
```

### ToAlert (발생 알림)

```json
{
  "id": "alt_123",
  "title": "TO 변동 감지",
  "summary": "관심 시설에 변동이 있을 수 있어요.",
  "facility_id": "fac_abc",
  "created_at": "2026-02-14T09:10:11Z",
  "read_at": null
}
```

### AlertSubscription (알림 구독/설정)

```json
{
  "id": "sub_001",
  "facility_id": "fac_abc",
  "schedule": { "mode": "immediate", "quiet_hours": { "from": "22:00", "to": "07:00" } },
  "channels": { "push": true, "sms": false },
  "created_at": "2026-02-14T09:10:11Z"
}
```

### 공통 에러

```json
{
  "error": {
    "code": "PLAN_LIMIT_REACHED",
    "message": "현재 플랜 한도에 도달했어요.",
    "details": { "limit": 3, "current": 3 }
  }
}
```

---

## 2. API Endpoints — JSON 예시 (정본)

### 2.1 Facilities

#### (1) GET `/api/v1/facilities/nearby`

Query: `lat`(필수), `lng`(필수), `radius_m`(옵션=2000), `type`(옵션), `q`(옵션)

**200**

```json
{
  "facilities": [
    {
      "id": "fac_abc",
      "name": "해피키즈",
      "lat": 37.1,
      "lng": 127.1,
      "address": "...",
      "type": "public",
      "tags": ["국공립"],
      "distance_m": 820
    }
  ]
}
```

**400**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "lat/lng가 필요해요.", "details": {} } }
```

**429**

```json
{ "error": { "code": "RATE_LIMITED", "message": "요청이 많아요. 잠시 후 다시 시도해 주세요.", "details": {} } }
```

#### (2) GET `/api/v1/facilities/{id}`

**200**

```json
{
  "facility": {
    "id": "fac_abc",
    "name": "해피키즈",
    "lat": 37.1,
    "lng": 127.1,
    "address": "...",
    "phone": "02-0000-0000",
    "type": "public",
    "tags": ["국공립", "연장보육"],
    "updated_at": "2026-02-13T10:00:00Z"
  },
  "saved": false
}
```

#### (3) POST `/api/v1/facilities/{id}/save`

**200**

```json
{ "saved": true }
```

#### (4) DELETE `/api/v1/facilities/{id}/save`

**200**

```json
{ "saved": false }
```

---

### 2.2 TO Alerts (발생 알림)

#### (5) GET `/api/v1/to-alerts/unread`

**200**

```json
{
  "alerts": [
    {
      "id": "alt_123",
      "title": "TO 변동 감지",
      "summary": "변동이 있을 수 있어요.",
      "facility_id": "fac_abc",
      "created_at": "2026-02-14T09:10:11Z",
      "read_at": null
    }
  ],
  "unread_count": 1
}
```

#### (6) PATCH `/api/v1/to-alerts/read`

Body: `{ "alert_ids": ["alt_123"] }`

**200**

```json
{ "updated": 1 }
```

**400**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "alert_ids가 필요해요.", "details": {} } }
```

---

### 2.3 Alert Subscriptions (알림 구독/설정)

#### (7) POST `/api/v1/alert-subscriptions`

Body:

```json
{
  "facility_id": "fac_abc",
  "schedule": { "mode": "immediate", "quiet_hours": { "from": "22:00", "to": "07:00" } },
  "channels": { "push": true, "sms": false }
}
```

**200**

```json
{ "subscription_id": "sub_001" }
```

**403**

```json
{ "error": { "code": "PUSH_NOT_ENABLED", "message": "푸시 권한을 켜면 더 빠르게 받을 수 있어요.", "details": {} } }
```

**409**

```json
{ "error": { "code": "PLAN_LIMIT_REACHED", "message": "현재 플랜 한도에 도달했어요.", "details": { "limit": 3, "current": 3 } } }
```

#### (8) GET `/api/v1/alert-subscriptions`

**200**

```json
{
  "subscriptions": [
    {
      "id": "sub_001",
      "facility_id": "fac_abc",
      "schedule": { "mode": "immediate", "quiet_hours": { "from": "22:00", "to": "07:00" } },
      "channels": { "push": true, "sms": false },
      "created_at": "2026-02-14T09:10:11Z"
    }
  ]
}
```

#### (9) PATCH `/api/v1/alert-subscriptions/{id}`

Body: `{ "channels": { "push": true, "sms": true } }`

**200**

```json
{ "updated": true }
```

---

### 2.4 Push

#### (10) POST `/api/v1/push/register`

Body: `{ "token": "ExponentPushToken[...]", "platform": "ios", "device_name": "iPhone" }`

**200**

```json
{ "registered": true }
```

---

### 2.5 Bot Chat

#### (11) POST `/api/v1/bot/chat`

Body: `{ "message": "강남구에서 5세 아이, 이번 달 입소 가능성 높이려면?" }`

**200**

```json
{
  "reply": "상황을 정리해보면… (다음 행동 3가지)…",
  "disclaimer": "안내는 참고용이며 기관 사정에 따라 달라질 수 있어요."
}
```

**429**

```json
{ "error": { "code": "RATE_LIMITED", "message": "오늘은 여기까지 도와드릴 수 있어요.", "details": {} } }
```

**500**

```json
{ "error": { "code": "SERVER_ERROR", "message": "일시적인 오류가 발생했어요.", "details": {} } }
```

---

### 2.6 Consultations

#### (12) GET `/api/v1/consultations/packages`

**200**

```json
{
  "packages": [
    { "id": "pkg_lite", "tier": "lite", "title": "10분 콜 + PDF", "price_krw": 49000, "duration_min": 10, "includes": ["사전 설문", "요약 리포트"] },
    { "id": "pkg_std", "tier": "standard", "title": "30분 콜 + PDF", "price_krw": 99000, "duration_min": 30, "includes": ["사전 설문", "상담", "리포트"] }
  ]
}
```

#### (13) POST `/api/v1/consultations/orders`

Body: `{ "package_id": "pkg_std" }`

**200**

```json
{
  "order_id": "ord_001",
  "order_no": "UJZ-2026-000123",
  "status": "DRAFT",
  "tier": "standard",
  "amount_krw": 99000
}
```

#### (14) POST `/api/v1/consultations/orders/{orderId}/intake`

Body:

```json
{
  "region": { "sido": "서울", "sigungu": "강남구" },
  "desired_start_month": "2026-03",
  "child": { "age_years": 5 },
  "constraints": ["맞벌이", "방문은 주말"],
  "preferred_facilities": [{ "name": "A어린이집" }, { "name": "B유치원" }],
  "notes": "형제 없음"
}
```

**200**

```json
{ "status": "INTAKE_SUBMITTED" }
```

---

### 2.7 Payments (Toss)

#### (15) POST `/api/v1/payments/initiate`

Body: `{ "order_id": "ord_001", "amount_krw": 99000, "order_name": "UjuZ 상담 Standard" }`

**200**

```json
{
  "pg_order_id": "pay_001",
  "amount_krw": 99000,
  "success_url": "https://.../payment/success",
  "fail_url": "https://.../payment/fail"
}
```

#### (16) POST `/api/v1/payments/confirm`

Body: `{ "paymentKey": "payKey_xxx", "orderId": "pay_001", "amount": 99000 }`

**200**

```json
{ "status": "PAID", "receipt_url": "https://..." }
```

**400/402**

```json
{ "error": { "code": "PAYMENT_FAILED", "message": "결제가 완료되지 않았어요.", "details": {} } }
```

---

### 2.8 Appointments / Report

#### (17) POST `/api/v1/consultations/orders/{orderId}/appointments`

Body(슬롯):

```json
{ "mode": "slot", "start_at": "2026-02-20T10:00:00+09:00", "channel": "phone" }
```

Body(희망 3개):

```json
{
  "mode": "choices",
  "choices": ["2026-02-20T10:00:00+09:00", "2026-02-20T20:00:00+09:00", "2026-02-21T14:00:00+09:00"],
  "channel": "phone"
}
```

**200**

```json
{ "appointment_id": "apt_001", "status": "CONFIRMED" }
```

#### (18) GET `/api/v1/consultations/orders/{orderId}/report`

**200 (WRITING)**

```json
{ "status": "WRITING" }
```

**200 (READY)**

```json
{
  "status": "READY",
  "report": {
    "summary": "이번 달 전략은 ...",
    "actions": [{ "title": "이번 주 할 일", "detail": "..." }]
  },
  "pdf_url": "https://cdn.../report.pdf"
}
```

---

### 2.9 Admin

#### (19) GET `/api/v1/admin/metrics?range=7d`

**200**

```json
{
  "revenue_today": 198000,
  "payments_fail_rate": 0.07,
  "report_sla_overdue": 2,
  "push_fail_rate": 0.11,
  "map_calls_est": 12000,
  "sms_cost_krw": 0
}
```

#### (20) GET `/api/v1/admin/push-metrics?range=24h`

**200**

```json
{
  "sent": 1200,
  "delivered": 980,
  "failed": 220,
  "top_failures": [
    { "reason": "DeviceNotRegistered", "count": 140 },
    { "reason": "MessageTooBig", "count": 40 }
  ],
  "tokens_cleaned": 120
}
```

---

### 2.10 Partner (B2B)

#### (21) PATCH `/api/v1/partner/profile`

Body: `{ "org_id": "org_001", "name": "해피키즈", "address": "...", "phone": "02-..." }`

**200**

```json
{ "updated": true }
```

#### (22) POST `/api/v1/partner/leads`

Body: `{ "org_id": "org_001", "parent_name": "홍길동", "phone": "010-...", "message": "방문 상담 가능할까요?" }`

**200**

```json
{ "lead_id": "lead_001", "status": "new" }
```

#### (23) GET `/api/v1/partner/leads?org_id=org_001`

**200**

```json
{
  "leads": [
    { "id": "lead_001", "status": "new", "parent_name": "홍길동", "phone": "010-...", "message": "방문 상담 가능할까요?", "created_at": "2026-02-14T09:10:11Z" }
  ]
}
```

---

## 3. 화면 → API 호출 매핑

| 화면 | 필수 API | 부가 API |
|------|----------|----------|
| P6 지도 메인 | GET `/api/v1/facilities/nearby` | 시설 상세 프리페치, 캐시 |
| P6 시설 상세 | GET `/api/v1/facilities/{id}` + save 토글 | 구독 생성 진입 |
| P6 알림 목록(to-alerts) | GET `/api/v1/to-alerts/unread` + PATCH read | 딥링크 |
| P6 알림 구독 생성 | POST `/api/v1/alert-subscriptions` | GET subscriptions |
| P6 채팅 | POST `/api/v1/bot/chat` | 429 처리 |
| P7 상담 랜딩 | GET `/api/v1/consultations/packages` | 샘플 PDF CDN |
| P7 설문 | POST orders + POST intake | draft 저장(로컬) |
| P7 결제 | POST initiate + POST confirm | webhook(옵션) |
| P7 예약 | POST appointments | availability(옵션) |
| P7 리포트 | GET report | signed URL(옵션) |
| P8 Admin | GET metrics + GET push-metrics | drilldown(옵션) |
| P8 B2B | partner profile/leads | admin org UI |

---

*정본 v2 — 2026-02-14. 변경 시 CODEX-TASKS.md의 티켓 스펙과 동기화 필수.*

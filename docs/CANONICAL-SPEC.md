# Canonical API Spec — Phase 5~8 (정본)

## 0.1 API Prefix
- 모든 API: `/api/v1/*`
- 발생 알림(이벤트): `/api/v1/to-alerts/*`
- 알림 설정(구독/규칙): `/api/v1/alert-subscriptions/*`
- 챗봇: `/api/v1/bot/chat`
- 푸시 토큰 등록: `/api/v1/push/register`
- 상담: `/api/v1/consultations/*`
- 결제(Toss): `/api/v1/payments/*`
- Admin: `/api/v1/admin/*`
- Partner(B2B): `/api/v1/partner/*`

## 0.2 공통 헤더
- content-type: application/json
- x-device-id: <uuid>
- authorization: Bearer <token> (선택)

## 0.3 공통 응답 포맷(비래핑)
### 성공
```json
{ "facilities": [] }
```
### 실패
```json
{ "error": { "code": "RATE_LIMITED", "message": "잠시 후 다시 시도해 주세요.", "details": {} } }
```

## 0.4 HTTP Status ↔ Error Code
- 400 VALIDATION_ERROR
- 401 UNAUTHORIZED
- 403 FORBIDDEN, PUSH_NOT_ENABLED
- 404 NOT_FOUND
- 409 PLAN_LIMIT_REACHED
- 429 RATE_LIMITED
- 500 SERVER_ERROR
- 402 PAYMENT_FAILED (결제 전용, 선택)

## 0.5 날짜/시간
- 서버 저장: UTC
- API 입출력: ISO 8601 (offset 포함 허용)

---

## API Endpoints (정본)

### Facilities
1. GET /api/v1/facilities/nearby?lat=&lng=&radius_m=&type=&q=
   → { facilities: Facility[] }
2. GET /api/v1/facilities/{id}
   → { facility: Facility, saved: boolean }
3. POST /api/v1/facilities/{id}/save → { saved: true }
4. DELETE /api/v1/facilities/{id}/save → { saved: false }

### TO Alerts (발생 알림)
5. GET /api/v1/to-alerts/unread
   → { alerts: Alert[], unread_count: number }
6. PATCH /api/v1/to-alerts/read  body { alert_ids: string[] }
   → { updated: number }

### Alert Subscriptions (알림 구독)
7. POST /api/v1/alert-subscriptions
   body { facility_id, schedule, channels }
   → { subscription_id: string }
8. GET /api/v1/alert-subscriptions
   → { subscriptions: AlertSubscription[] }
9. PATCH /api/v1/alert-subscriptions/{id}
   → { updated: true }

### Push
10. POST /api/v1/push/register
    body { token, platform, device_name }
    → { registered: true }

### Bot Chat
11. POST /api/v1/bot/chat
    body { message: string }
    → { reply: string, disclaimer?: string }

### Consultations
12. GET /api/v1/consultations/packages
    → { packages: Package[] }
13. POST /api/v1/consultations/orders
    body { package_id }
    → { order_id, order_no, status, tier, amount_krw }
14. POST /api/v1/consultations/orders/{orderId}/intake
    → { status: "INTAKE_SUBMITTED" }

### Payments (Toss)
15. POST /api/v1/payments/initiate
    body { order_id, amount_krw, order_name }
    → { pg_order_id, amount_krw, success_url, fail_url }
16. POST /api/v1/payments/confirm
    body { paymentKey, orderId, amount }
    → { status: "PAID", receipt_url }

### Appointments / Report
17. POST /api/v1/consultations/orders/{orderId}/appointments
    → { appointment_id, status }
18. GET /api/v1/consultations/orders/{orderId}/report
    → { status, report?, pdf_url? }

### Admin
19. GET /api/v1/admin/metrics?range=7d
20. GET /api/v1/admin/push-metrics?range=24h

### Partner (B2B)
21. PATCH /api/v1/partner/profile
22. POST /api/v1/partner/leads
23. GET /api/v1/partner/leads?org_id=

---

## Types (정본)

### Facility
```json
{ "id": "fac_abc", "name": "해피키즈 어린이집", "lat": 37.1234, "lng": 127.1234, "address": "서울...", "type": "public", "tags": ["국공립","연장보육"], "distance_m": 820 }
```

### ToAlert
```json
{ "id": "alt_123", "title": "TO 변동 감지", "summary": "관심 시설에 변동이 있을 수 있어요.", "facility_id": "fac_abc", "created_at": "2026-02-14T09:10:11Z", "read_at": null }
```

### AlertSubscription
```json
{ "id": "sub_001", "facility_id": "fac_abc", "schedule": { "mode": "immediate", "quiet_hours": { "from": "22:00", "to": "07:00" } }, "channels": { "push": true, "sms": false }, "created_at": "2026-02-14T09:10:11Z" }
```

### Error
```json
{ "error": { "code": "PLAN_LIMIT_REACHED", "message": "현재 플랜 한도에 도달했어요.", "details": { "limit": 3, "current": 3 } } }
```

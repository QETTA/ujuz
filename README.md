# UjuZ API

Standalone Fastify + MongoDB backend for the UjuZ product (daycare admission prediction + TO alerts + anonymous community).

## Tech Stack

- **Node.js 20** + TypeScript (strict mode)
- **Fastify 5.x** (routing, validation, error handling, pino logging)
- **MongoDB 7** via official `mongodb` driver (Mongoose forbidden)
- **Zod** for request validation
- **jose** for JWT (HS256)
- **vitest** for tests
- **pnpm** for package management

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start MongoDB:**
   ```bash
   docker-compose up -d
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

4. **Run development server:**
   ```bash
   pnpm dev
   ```

5. **Run tests:**
   ```bash
   pnpm test
   ```

6. **Type check:**
   ```bash
   pnpm typecheck
   ```

7. **Build for production:**
   ```bash
   pnpm build
   pnpm start
   ```

## Project Structure

```
/src
  /api/v1
    anon.ts          POST /api/v1/anon/session
    status.ts        GET /api/v1/status
    admission.ts     POST /api/v1/admission/calc, POST /api/v1/admission/explain
    toAlerts.ts      POST|GET|PATCH|DELETE /api/v1/to-alerts
    community.ts     GET|POST /api/v1/community/posts, POST /api/v1/community/posts/:id/report
  /lib
    db.ts            MongoClient singleton with retry logic
    ensureIndexes.ts Database index creation
    auth.ts          JWT sign/verify, anon_id extraction
    tier.ts          Tier determination (X-Dev-Tier header support)
    time.ts          Asia/Seoul period calculation
    limits.ts        Atomic usage gating with findOneAndUpdate
    errors.ts        AppError class and error handler
    validation.ts    All Zod schemas
    sanitize.ts      XSS strip + PII masking
    heuristic.ts     Admission probability engine
  /__tests__
    anon.test.ts     Anonymous session tests
    admission.test.ts Admission calculation tests
    limits.test.ts   Atomic increment tests
  index.ts           Server bootstrap
```

## Environment Variables

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=ujuz
JWT_SECRET=change-me
JWT_ISSUER=ujuz-api
JWT_AUDIENCE=ujuz-widget
DEVICE_HASH_SALT=change-me
AI_DEGRADED=false
COMMUNITY_WRITE_ENABLED=false
TIER_DEFAULT=free
AUTH_BYPASS=false
NODE_ENV=development
```

### Dev Auth Bypass Mode

For local testing, you can bypass all auth checks:

```bash
AUTH_BYPASS=true pnpm dev
```

Or set it in your local env file:

```env
AUTH_BYPASS=true
```

This bypass is ignored in `NODE_ENV=production`.

## API Endpoints

All endpoints are under `/api/v1`. Protected endpoints require `Authorization: Bearer <token>`.

### 1. POST /api/v1/anon/session

Create or retrieve anonymous session.

**Request:**
```bash
curl -X POST http://localhost:4000/api/v1/anon/session \
  -H "Content-Type: application/json" \
  -d '{"device_fingerprint": "unique-device-id-123"}'
```

**Response:**
```json
{
  "anon_id": "550e8400-e29b-41d4-a716-446655440000",
  "anon_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "handle": "익명1234"
}
```

### 2. GET /api/v1/status

Get system status.

**Request:**
```bash
curl http://localhost:4000/api/v1/status
```

**Response:**
```json
{
  "ai": {
    "degraded": false,
    "message": null
  },
  "features": {
    "communityWrite": false
  }
}
```

### 3. POST /api/v1/admission/calc

Calculate admission probability.

**Requires:** Auth + `admission_calc` gating (1/month for free tier)

**Request:**
```bash
TOKEN="your-anon-token"

curl -X POST http://localhost:4000/api/v1/admission/calc \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "region": {
      "type": "SIGUNGU",
      "code": "11110",
      "label": "서울시 종로구"
    },
    "age_class": "AGE_2",
    "desired_start_month": "2026-03",
    "applied_month": "2025-12",
    "wait_rank": 15,
    "bonuses": ["dual_income", "sibling"],
    "facility_scope": {
      "mode": "REGION_ONLY",
      "facility_ids": []
    }
  }'
```

**Response:**
```json
{
  "request_id": "ar_abc123xyz",
  "model_version": "admission-bayes@1.0.0",
  "result": {
    "grade": "B",
    "probability": {
      "p_3m": 0.35,
      "p_6m": 0.54,
      "p_12m": 0.75
    },
    "eta_months": {
      "p50": 6,
      "p90": 12
    },
    "uncertainty": {
      "band": "MEDIUM",
      "notes": []
    }
  },
  "evidence_cards": [
    {
      "id": "REGION_COMPETITION",
      "title": "지역 경쟁도 분석",
      "summary": "서울시 종로구 지역의 입소 경쟁 상황입니다.",
      "signals": [{"name": "지역 대기자 수", "direction": "NEUTRAL", "strength": "MEDIUM"}],
      "confidence": "MEDIUM",
      "disclaimer": "최근 3개월 평균 기준이며, 실제 상황은 변동될 수 있습니다."
    }
  ],
  "next_ctas": [
    {"type": "EXPLAIN", "label": "상세 설명 보기"},
    {"type": "TO_ALERT", "label": "입소알림 설정"}
  ]
}
```

### 4. POST /api/v1/admission/explain

Get detailed explanation for admission result.

**Requires:** Auth + `admission_explain` gating (3/day for free tier)

**Request:**
```bash
curl -X POST http://localhost:4000/api/v1/admission/explain \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "ar_abc123xyz",
    "focus": "next_steps"
  }'
```

**Response:**
```json
{
  "summary": "귀하의 입소 가능성은 비교적 높습니다 (등급: B). 현재 대기 순번을 유지하면서 정기적으로 상태를 확인하세요.",
  "next_actions": [
    {
      "title": "인근 어린이집 추가 신청",
      "why": "선택지를 넓혀 기회를 높입니다",
      "effort": "MEDIUM",
      "impact": "MEDIUM"
    }
  ],
  "caveats": [
    "예측은 과거 데이터 기반이며 실제 결과와 다를 수 있습니다.",
    "어린이집별 상황은 상이하므로 개별 확인이 필요합니다."
  ]
}
```

### 5. POST /api/v1/to-alerts

Create TO alert.

**Requires:** Auth + slot limit check (1 for free, 5 for basic, unlimited for premium)

**Request:**
```bash
curl -X POST http://localhost:4000/api/v1/to-alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "facility_id": "F12345",
    "age_class": "AGE_2",
    "notify_mode": "instant"
  }'
```

**Response:**
```json
{
  "alert_id": "ta_xyz789",
  "anon_id": "550e8400-e29b-41d4-a716-446655440000",
  "facility_id": "F12345",
  "age_class": "AGE_2",
  "notify_mode": "instant",
  "active": true,
  "last_notified_at": null,
  "created_at": "2026-02-12T10:00:00.000Z"
}
```

### 6. GET /api/v1/to-alerts

List user's TO alerts.

**Request:**
```bash
curl http://localhost:4000/api/v1/to-alerts \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "items": [
    {
      "alert_id": "ta_xyz789",
      "facility_id": "F12345",
      "age_class": "AGE_2",
      "notify_mode": "instant",
      "active": true,
      "created_at": "2026-02-12T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### 7. PATCH /api/v1/to-alerts/:id

Update alert (activate/deactivate).

**Request:**
```bash
curl -X PATCH http://localhost:4000/api/v1/to-alerts/ta_xyz789 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'
```

**Response:**
```json
{
  "alert_id": "ta_xyz789",
  "active": false,
  ...
}
```

### 8. DELETE /api/v1/to-alerts/:id

Delete alert.

**Request:**
```bash
curl -X DELETE http://localhost:4000/api/v1/to-alerts/ta_xyz789 \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `204 No Content`

### 9. GET /api/v1/community/posts

Get community posts with pagination.

**Request:**
```bash
curl "http://localhost:4000/api/v1/community/posts?region=서울&type=review&sort=recent&limit=10"
```

**Response:**
```json
{
  "items": [
    {
      "post_id": "po_abc123",
      "anon_handle": "익명5678",
      "board_region": "서울",
      "type": "review",
      "content": "어린이집 후기입니다...",
      "score": 5,
      "status": "published",
      "created_at": "2026-02-12T10:00:00.000Z"
    }
  ],
  "next_cursor": "eyJfaWQiOiI2NWE..."
}
```

### 10. POST /api/v1/community/posts

Create community post.

**Requires:** Auth + `COMMUNITY_WRITE_ENABLED=true` + `community_write` gating (0/day for free, 5/day for basic, 20/day for premium)

**Request:**
```bash
# First, enable community write
export COMMUNITY_WRITE_ENABLED=true

curl -X POST http://localhost:4000/api/v1/community/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "board_region": "서울",
    "type": "review",
    "structured_fields": {
      "age_class": "AGE_2",
      "wait_months": 6,
      "facility_type": "국공립"
    },
    "content": "어린이집 후기를 공유합니다. 선생님들이 친절하고..."
  }'
```

**Response:**
```json
{
  "post_id": "po_newpost123"
}
```

### 11. POST /api/v1/community/posts/:id/report

Report a post.

**Request:**
```bash
curl -X POST http://localhost:4000/api/v1/community/posts/po_abc123/report \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "spam",
    "detail": "광고성 게시물입니다"
  }'
```

**Response:**
```json
{
  "report_id": "rp_report123"
}
```

**Note:** If a post receives 3+ reports, it is automatically hidden.

## X-Dev-Tier Header (Development Only)

In non-production environments, you can override the tier using the `X-Dev-Tier` header:

```bash
# Test as free tier (1 admission calc per month)
curl -X POST http://localhost:4000/api/v1/admission/calc \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Dev-Tier: free" \
  -H "Content-Type: application/json" \
  -d '...'

# Test as basic tier (10 admission calcs per month)
curl -X POST http://localhost:4000/api/v1/admission/calc \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Dev-Tier: basic" \
  -H "Content-Type: application/json" \
  -d '...'

# Test as premium tier (unlimited)
curl -X POST http://localhost:4000/api/v1/admission/calc \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Dev-Tier: premium" \
  -H "Content-Type: application/json" \
  -d '...'
```

**Important:** In `NODE_ENV=production`, the `X-Dev-Tier` header is **ignored**.

## Usage Limits & Gating Verification

### Scenario 1: admission/calc (Monthly Limit)

**Free tier: 1 per month**

```bash
# First request - SUCCESS
curl -X POST http://localhost:4000/api/v1/admission/calc \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Dev-Tier: free" \
  -H "Content-Type: application/json" \
  -d '{...}'
# Response: 200 OK with admission result

# Second request - 429 LIMIT_EXCEEDED
curl -X POST http://localhost:4000/api/v1/admission/calc \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Dev-Tier: free" \
  -H "Content-Type: application/json" \
  -d '{...}'
# Response: 429 with error details
```

**429 Response:**
```json
{
  "error": "LIMIT_EXCEEDED",
  "message": "Usage limit exceeded",
  "details": {
    "feature": "admission_calc",
    "allowed": false,
    "remaining": 0,
    "reset_at": "2026-03-01T00:00:00+09:00",
    "upgrade_needed": true
  }
}
```

### Scenario 2: admission/explain (Daily Limit)

**Free tier: 3 per day**

```bash
# Requests 1-3: SUCCESS
for i in {1..3}; do
  curl -X POST http://localhost:4000/api/v1/admission/explain \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Dev-Tier: free" \
    -H "Content-Type: application/json" \
    -d '{"request_id": "ar_xyz", "focus": "next_steps"}'
done

# Request 4: 429 LIMIT_EXCEEDED
curl -X POST http://localhost:4000/api/v1/admission/explain \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Dev-Tier: free" \
  -H "Content-Type: application/json" \
  -d '{"request_id": "ar_xyz", "focus": "next_steps"}'
# Response: 429
```

### Scenario 3: TO Alert Slots

**Free tier: 1 slot**

```bash
# First alert - SUCCESS
curl -X POST http://localhost:4000/api/v1/to-alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Dev-Tier: free" \
  -H "Content-Type: application/json" \
  -d '{"facility_id": "F001", "age_class": "AGE_2", "notify_mode": "instant"}'
# Response: 201 Created

# Second alert - 429 LIMIT_EXCEEDED
curl -X POST http://localhost:4000/api/v1/to-alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Dev-Tier: free" \
  -H "Content-Type: application/json" \
  -d '{"facility_id": "F002", "age_class": "AGE_3", "notify_mode": "instant"}'
# Response: 429
```

### Scenario 4: Community Write Feature Flag

**COMMUNITY_WRITE_ENABLED=false → 403**

```bash
export COMMUNITY_WRITE_ENABLED=false

curl -X POST http://localhost:4000/api/v1/community/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"board_region": "서울", "type": "review", "content": "test"}'
# Response: 403 FEATURE_DISABLED
```

**COMMUNITY_WRITE_ENABLED=true + Basic tier: 5 per day**

```bash
export COMMUNITY_WRITE_ENABLED=true

# Requests 1-5: SUCCESS
for i in {1..5}; do
  curl -X POST http://localhost:4000/api/v1/community/posts \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Dev-Tier: basic" \
    -H "Content-Type: application/json" \
    -d "{\"board_region\": \"서울\", \"type\": \"review\", \"content\": \"post $i\"}"
done

# Request 6: 429 LIMIT_EXCEEDED
curl -X POST http://localhost:4000/api/v1/community/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Dev-Tier: basic" \
  -H "Content-Type: application/json" \
  -d '{"board_region": "서울", "type": "review", "content": "post 6"}'
# Response: 429
```

### Scenario 5: Auto-hide After 3 Reports

```bash
# Get 3 different users to report the same post
for i in {1..3}; do
  # Create new session for each reporter
  REPORTER_TOKEN=$(curl -X POST http://localhost:4000/api/v1/anon/session \
    -H "Content-Type: application/json" \
    -d "{\"device_fingerprint\": \"reporter-$i\"}" | jq -r '.anon_token')
  
  # Report the post
  curl -X POST http://localhost:4000/api/v1/community/posts/po_target/report \
    -H "Authorization: Bearer $REPORTER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"reason": "spam"}'
done

# After 3rd report, the post status becomes "hidden"
# Verify by fetching posts - the reported post should not appear
curl "http://localhost:4000/api/v1/community/posts"
# The post with ID "po_target" should not be in the results
```

## Tier Limits Summary

| Feature | Free | Basic | Premium |
|---------|------|-------|---------|
| admission_calc | 1/month | 10/month | Unlimited |
| admission_explain | 3/day | 30/day | Unlimited |
| community_write | 0/day | 5/day | 20/day |
| to_alert_slots | 1 | 5 | Unlimited |

## Error Response Format

All errors follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {}
}
```

**Common error codes:**
- `VALIDATION_ERROR` (400)
- `INVALID_TIER` (400)
- `MISSING_AUTH` (401)
- `INVALID_TOKEN` (401)
- `FORBIDDEN` (403)
- `FEATURE_DISABLED` (403)
- `NOT_FOUND` (404)
- `DUPLICATE_ALERT` (409)
- `LIMIT_EXCEEDED` (429)
- `INTERNAL_ERROR` (500)

## Testing

Run all tests:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test:watch
```

Type check:
```bash
pnpm typecheck
```

## License

Private

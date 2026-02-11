# Codex Agent Instructions

You are a senior backend engineer. Build the **UjuZ API** — a standalone Fastify + MongoDB backend for the UjuZ product (daycare admission prediction + TO alerts + anonymous community).

**CRITICAL RULES:**
- DO NOT look at any existing repo or GitHub. Build from this spec only.
- Frontend is out of scope. API + MongoDB only.
- Must run locally via `docker-compose up -d` (Mongo) + `pnpm dev`.
- Use pnpm, NOT npm.
- All dates/periods use Asia/Seoul timezone (UTC+9).
- All IDs use prefixed format: `ar_`, `ta_`, `po_`, `rp_` + nanoid.
- Mongoose is FORBIDDEN. Use the official `mongodb` driver only.

---

## Tech Stack (fixed)

- Node.js 20 + TypeScript (strict)
- Fastify 5.x (routing, validation, error handling, pino logging)
- MongoDB 7 via official `mongodb` driver
- Zod for request validation
- jose for JWT (HS256)
- vitest for tests
- pnpm for package management

## Repo Structure

```
/src
  /api/v1          (route handlers, one file per resource)
    anon.ts        POST /anon/session
    status.ts      GET /status
    admission.ts   POST /admission/calc, POST /admission/explain
    toAlerts.ts    POST|GET|PATCH|DELETE /to-alerts
    community.ts   GET|POST /community/posts, POST /community/posts/:id/report
  /lib
    db.ts          MongoClient singleton, connect with retry (5x exponential backoff)
    ensureIndexes.ts
    auth.ts        JWT sign/verify, anon_id extraction from Bearer token
    tier.ts        getEffectiveTier(req) — X-Dev-Tier header support
    time.ts        Asia/Seoul period calculation, reset_at
    limits.ts      Atomic checkAndIncrement with findOneAndUpdate
    errors.ts      Standard AppError, errorHandler plugin
    validation.ts  All Zod schemas
    sanitize.ts    XSS strip + PII masking for community content
    heuristic.ts   Admission probability heuristic engine
  index.ts         Server bootstrap
docker-compose.yml
.env.example
tsconfig.json
package.json
vitest.config.ts
README.md
```

---

## Environment Variables (.env.example)

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
NODE_ENV=development
```

---

## MongoDB Collections & Indexes

### (1) anonymous_sessions
```ts
{
  anon_id: string,        // uuid
  device_hash: string,    // sha256(fingerprint + salt), UNIQUE
  handle: string,         // "익명1234" style
  trust_level: number,    // 0 default
  created_at: Date,
  last_seen: Date
}
```
Indexes: `device_hash` unique, `last_seen`

### (2) admission_requests
```ts
{
  request_id: string,     // "ar_" + nanoid
  anon_id: string,
  input: AdmissionCalcRequest,
  output: { grade, probability, eta_months, uncertainty },
  evidence_cards: EvidenceCard[],
  model_version: string,
  created_at: Date
}
```
Indexes: `(anon_id, created_at desc)`

### (3) to_alerts
```ts
{
  alert_id: string,       // "ta_" + nanoid
  anon_id: string,
  facility_id: string,
  age_class: "AGE_0".."AGE_5",
  notify_mode: "instant" | "digest",
  active: boolean,
  last_notified_at: Date | null,
  created_at: Date
}
```
Indexes: `(anon_id, active)`, `(facility_id, active)`

### (4) posts
```ts
{
  post_id: string,        // "po_" + nanoid
  anon_id: string,
  anon_handle: string,
  board_region: string,
  type: "review" | "to_report" | "question",
  structured_fields: {
    age_class?: string,
    wait_months?: number,
    facility_type?: string,
    certainty?: string
  },
  content: string,        // sanitized plain text
  score: number,          // default 0
  status: "published" | "hidden",
  created_at: Date
}
```
Indexes: `(board_region, type, created_at desc)`, `(type, score desc)`

### (5) reports_moderation
```ts
{
  report_id: string,      // "rp_" + nanoid
  post_id: string,
  reporter_anon_id: string,
  reason: "privacy" | "spam" | "abuse" | "false_info",
  detail?: string,
  created_at: Date,
  action: "none" | "hidden" | "ban"  // default "none"
}
```
Indexes: `(post_id, created_at desc)`

### (6) usage_counters
```ts
{
  subject_id: string,     // anon_id
  period: string,         // "YYYY-MM" or "YYYY-MM-DD" (Asia/Seoul)
  feature: "admission_calc" | "admission_explain" | "community_write",
  count: number,
  updated_at: Date
}
```
Indexes: `(subject_id, period, feature)` unique

---

## Admission Engine (Heuristic)

### Input: AdmissionCalcRequest
```ts
{
  region: { type: "ADM_CODE"|"SIGUNGU"|"CITY", code: string, label: string },
  age_class: "AGE_0".."AGE_5",
  desired_start_month: "YYYY-MM",
  applied_month: "YYYY-MM" | null,
  wait_rank: number | null,
  bonuses: string[],  // Zod enum: dual_income, sibling, single_parent, multi_child, disability, low_income
  facility_scope: { mode: "REGION_ONLY"|"SHORTLIST", facility_ids: string[] },
  preferences?: { facility_type?: string[], max_distance_km?: number },
  client_context?: { timezone?: string, locale?: string }
}
```

### Output: AdmissionCalcResponse
```ts
{
  request_id: string,
  model_version: "admission-bayes@1.0.0",
  result: {
    grade: "A".."F",
    probability: { p_3m: number, p_6m: number, p_12m: number },
    eta_months: { p50: number, p90: number },
    uncertainty: { band: "LOW"|"MEDIUM"|"HIGH", notes: string[] }
  },
  evidence_cards: EvidenceCard[],  // max 4
  next_ctas: [{ type: "EXPLAIN"|"TO_ALERT", label: string }]
}
```

### Heuristic Formula (MUST implement exactly)
```
base = 0.15
if wait_rank != null:
  base += clamp(0.35 - log(wait_rank + 1) * 0.08, -0.1, 0.35)
base += bonuses.length * 0.03
if desired_start_month in ["2026-03", "2026-09"]:
  base += 0.04
p6 = clamp(base, 0.02, 0.90)
p3 = clamp(p6 * 0.65, 0.01, p6)
p12 = clamp(1 - (1 - p6) * 0.55, p6, 0.98)
eta_p50 = round(clamp(12 * (1 - p6), 1, 18))
eta_p90 = min(24, eta_p50 + 6)
```

### Invariants (MUST enforce)
- 0 <= p3 <= p6 <= p12 <= 1
- 1 <= p50 <= p90
- Grade from p6: A>=0.75, B>=0.55, C>=0.40, D>=0.25, E>=0.10, F<0.10

### Uncertainty Rules
- wait_rank === null → HIGH + note "대기순번 미입력"
- facility_scope.mode === "SHORTLIST" AND wait_rank != null → LOW
- Otherwise → MEDIUM

### Evidence Cards (generate 3-4)
Always include: REGION_COMPETITION, YOUR_POSITION, SEASONALITY, ACTIONS.
Each card:
```ts
{
  id: "REGION_COMPETITION" | "SEASONALITY" | "YOUR_POSITION" | "FACILITY_SCOPE" | "COMMUNITY_SIGNAL" | "ACTIONS",
  title: string,
  summary: string,
  signals: [{ name: string, direction: "POSITIVE"|"NEGATIVE"|"NEUTRAL", strength: "LOW"|"MEDIUM"|"HIGH" }],
  confidence: "LOW"|"MEDIUM"|"HIGH",
  disclaimer: string
}
```

---

## Usage Limits (Gating)

### Tier Limits
```
free:    { admission_calc: 1/month, admission_explain: 3/day, community_write: 0/day, to_alert_slots: 1 }
basic:   { admission_calc: 10/month, admission_explain: 30/day, community_write: 5/day, to_alert_slots: 5 }
premium: { admission_calc: 99999, admission_explain: 99999, community_write: 20/day, to_alert_slots: 99999 }
```

### Atomic Check (CRITICAL)
Use `findOneAndUpdate` with filter `count < limit`:
```ts
const result = await col.findOneAndUpdate(
  { subject_id, period, feature, count: { $lt: limit } },
  { $inc: { count: 1 }, $set: { updated_at: new Date() }, $setOnInsert: { subject_id, period, feature } },
  { upsert: true, returnDocument: 'after' }
);
if (!result) → 429 LIMIT_EXCEEDED
```

### 429 Response Format
```json
{
  "error": "LIMIT_EXCEEDED",
  "feature": "admission_calc",
  "allowed": false,
  "remaining": 0,
  "reset_at": "2026-03-01T00:00:00+09:00",
  "upgrade_needed": true
}
```

### Period Calculation (Asia/Seoul fixed)
- Monthly features: period = "YYYY-MM", reset = next month 1st 00:00:00+09:00
- Daily features: period = "YYYY-MM-DD", reset = next day 00:00:00+09:00

---

## X-Dev-Tier Header (Development Only)

### src/lib/tier.ts
```ts
export type Tier = "free" | "basic" | "premium";

export function getEffectiveTier(req: FastifyRequest): Tier {
  if (process.env.NODE_ENV !== "production") {
    const header = req.headers["x-dev-tier"];
    if (header && ["free", "basic", "premium"].includes(header as string)) {
      return header as Tier;
    }
    if (header) throw new AppError(400, "INVALID_TIER", `Invalid tier: ${header}`);
  }
  const def = process.env.TIER_DEFAULT || "free";
  if (!["free", "basic", "premium"].includes(def)) return "free";
  return def as Tier;
}
```

- In production (NODE_ENV=production): X-Dev-Tier header is IGNORED
- In dev/test/staging: X-Dev-Tier overrides the default tier
- Invalid values → 400 error

All gating functions MUST accept `tier` as a parameter.

---

## API Endpoints

All under `/api/v1`. Auth via `Authorization: Bearer <anon_token>`.

### (1) POST /anon/session
No auth required.
```
Request:  { "device_fingerprint": "string" }
Response: { "anon_id": "uuid", "anon_token": "jwt...", "handle": "익명1234" }
```
- device_hash = sha256(device_fingerprint + DEVICE_HASH_SALT)
- Find or create in anonymous_sessions
- Update last_seen
- JWT claims: `{ anon_id, typ: "anon" }`, iss/aud from env, exp=30d
- Handle generation: "익명" + random 4-digit number

### (2) GET /status
No auth required.
```
Response: { "ai": { "degraded": false, "message": null }, "features": { "communityWrite": false } }
```

### (3) POST /admission/calc
Auth required. Gating: admission_calc (monthly).
```
Request:  AdmissionCalcRequest
Response: AdmissionCalcResponse
```
- Run heuristic
- Save to admission_requests
- Return with request_id

### (4) POST /admission/explain
Auth required. Gating: admission_explain (daily).
```
Request:  { "request_id": "ar_...", "focus": "next_steps"|"alternatives"|"docs" }
Response: {
  "summary": "...",
  "next_actions": [{ "title": "...", "why": "...", "effort": "LOW", "impact": "HIGH" }],
  "caveats": ["..."]
}
```
- NO LLM calls. Rule-based text generation from stored admission_request.
- Lookup request_id in admission_requests
- Generate summary/actions/caveats based on grade/uncertainty/bonuses

### (5) TO Alerts CRUD
Auth required.

**POST /to-alerts** — Gating: to_alert_slots (count active)
```
Request: { "facility_id": "...", "age_class": "AGE_2", "notify_mode": "instant" }
Response: { "alert_id": "ta_...", ... }
```
- Duplicate check: same facility_id + age_class → 409

**GET /to-alerts**
```
Response: { "items": [...], "total": N }
```

**PATCH /to-alerts/:id**
```
Request: { "active": false }
```

**DELETE /to-alerts/:id**

### (6) Community

**GET /community/posts**
```
Query: region?, type?, sort=recent|hot, limit<=20, cursor?
Response: { "items": [...], "next_cursor": "..." | null }
```
Cursor = base64(JSON({_id, created_at}))

**POST /community/posts**
- If COMMUNITY_WRITE_ENABLED=false → 403
- Gating: community_write (daily)
- Sanitize: strip `<script>`, `onerror=`, etc.
- PII masking: phone patterns, emails, kakao IDs, Korean address patterns (동/로/길 + numbers)
```
Request: { "board_region": "...", "type": "review", "structured_fields": {...}, "content": "..." }
Response: { "post_id": "po_..." }
```

**POST /community/posts/:id/report**
```
Request: { "reason": "spam", "detail": "..." }
```
- Save to reports_moderation
- If report count for post >= 3 → auto-hide post (update status to "hidden")

---

## Error Format (all errors)

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {}  // optional
}
```

Status codes: 400, 401, 403, 404, 409, 429, 500.

---

## Tests (vitest)

Write at minimum:
1. `anon.test.ts` — session creation + idempotency (same fingerprint = same anon_id)
2. `admission.test.ts` — calc returns valid shape, grade mapping, p3<=p6<=p12, gating 429
3. `limits.test.ts` — atomic increment, concurrent safety

Use `mongodb-memory-server` for test isolation.

---

## docker-compose.yml

```yaml
services:
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - ujuz-mongo-data:/data/db

volumes:
  ujuz-mongo-data:
```

---

## README.md Must Include

1. Quick start (docker-compose + pnpm dev)
2. Full file tree
3. curl examples for EVERY endpoint (with sample request/response)
4. X-Dev-Tier usage examples (free/basic/premium simulation)
5. Gating verification scenario:
   - admission/calc: 1st success, 2nd 429
   - admission/explain: 3 successes, 4th 429
   - to-alerts: free=1 slot, 2nd 429
   - community write: COMMUNITY_WRITE_ENABLED=false → 403
   - community write: enabled + basic → 5/day, then 429
   - report 3x → post auto-hidden

---

## Self-Check Before Done

- [ ] `pnpm build` passes with zero errors
- [ ] `pnpm test` passes
- [ ] All Zod schemas match the documented types exactly
- [ ] All error responses follow the standard format
- [ ] Period calculation uses Asia/Seoul (test with edge cases: 23:30 KST = next day UTC)
- [ ] Atomic gating: no race condition possible
- [ ] Community sanitize strips `<script>`, masks phone/email
- [ ] next_ctas always present in calc response
- [ ] evidence_cards length 3-4
- [ ] Invariants: p3<=p6<=p12, p50<=p90

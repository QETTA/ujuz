# UjuZ 사업계획서 업데이트 (수익화 우선순위 전환)

- 기준일: 2026-02-13 (KST)
- 목표: **이번 달(2026-02) 안에 매출 발생** + 2개월 내 반복매출 기반(기관 B2B) 초기 확보

## 1. 결론(이번 달 기준 최우선 전략)

UjuZ의 “가장 실현가능한 단기 수익화”는 앱 구독(Premium paywall)보다 **소규모 유저로도 성립하고, 스토어 결제/정책 리스크가 낮은 상품**부터 파는 것이다.

### 2-트랙 수익화(권고, 동시 진행)

1. **부모 B2C**: 1:1 “입소/입학 전략 상담 + 맞춤 리포트” (고단가, 즉시 현금화)
2. **기관 B2B**: “프로필/리드/대기관리 Lite” (월 과금, 반복매출 기반)

> 앱 내 디지털 구독(TO 알림/AI 프리미엄)은 **3순위**로 둔다.  
> iOS에서 “앱 안 기능/콘텐츠 잠금 해제”는 원칙적으로 IAP를 요구하며, 외부결제는 지역/요건/운영부담이 크다. (정책은 변동 가능, 출시 전 재검토 필요)

## 2. 트랙 1: B2C “1:1 전략 상담 + 맞춤 리포트” (가장 빠른 매출)

### 2.1 왜 ‘당장’ 가능한가(사업 논리)

- **MAU가 없어도 매출이 성립**: 구독은 트래픽/리텐션이 전제지만, 상담은 “10명만” 받아도 매출이 난다.
- **정책 리스크가 낮다**: iOS는 “실시간 1:1 개인 간 서비스(튜터링/의료상담/부동산 투어/피트니스 트레이닝)” 결제에 대해 IAP 외 결제수단을 허용하는 범주를 명시한다. (단, 1:다수 실시간 서비스는 IAP 요구)  
  - Apple App Review Guidelines 3.1.3(d) Person-to-Person Services 참고
- Android도 “1:1 온라인 유료 서비스” 중 조건을 만족하면 Google Play Billing이 필수는 아니라고 명시한다(두 개인 간, 세션 재생 불가 등).  
  - Google Play Console Help “Understanding Google Play’s Payments policy” 참고

### 2.2 상품 정의(최소 MVP, 7~14일 내 출시용)

**상품명(예시)**: “UjuZ 입소/입학 전략 45분 상담 + 개인화 액션플랜(PDF)”

**제공물(MVP)**:

- 사전 설문(온라인): 아이/가정/지역/희망기관/희망월/제약조건/우선순위/대기순번
- 45분 상담(전화/화상)
- **1~2페이지 액션플랜 PDF**: “이번주/이번달/다음달 할 일, 우선순위, 리스크 경고, 근거 링크”

**핵심 포지셔닝(리스크 관리)**:

- “합격/입소 보장”이 아닌 **전략/정보/의사결정 보조**로 정의
- 리포트/상담 결과는 “근거 링크 + 불확실성”을 항상 포함

### 2.3 가격/판매 전략(이번 달 매출 목적의 실전 제안)

- 단건 가격 실험(권고 범위): **₩50,000 ~ ₩150,000**
- 첫 달 목표(예시 KPI):
  - 10건 판매 × 10만원 = **매출 100만원**
  - 20건 판매 × 10만원 = **매출 200만원**

> “가격 결정”보다 중요한 것은 **빠른 결제-예약-납품 루프**를 2주 내 완성하는 것.

### 2.4 운영 플로우(최소 인력 운영 기준)

1. 랜딩(상품/범위/면책/후기) → 설문 제출
2. 결제(외부 PG/계좌/인보이스) → 예약(캘린더)
3. 상담 진행 → 리포트 생성(템플릿 + 보조 자동화) → 발송(이메일/카톡)

**AI 사용 원칙(원가/리스크 최소화)**:

- AI는 “상담 대체”가 아니라 **리포트 작성 보조(요약/체크리스트/문장화)**로만 사용
- 모델 비용은 MTok(백만 토큰) 단가로 즉시 계산 가능하므로, 기능별 COGS를 산정해 과금/제한을 설계한다.

## 3. 트랙 2: B2B “기관용 프로필/리드/대기관리 Lite” (반복매출)

### 3.1 왜 지금 B2B를 같이 해야 하나(현금흐름 구조)

- B2C 상담은 즉시 매출이지만 “노동집약”이다.  
  → B2B 월 과금으로 **반복매출(RR)** 기반을 빨리 만든다.
- 기관은 웹 대시보드/인보이스 결제 수용도가 높아 스토어 정책 리스크가 상대적으로 낮다.

### 3.2 제품(MVP) 구성(기관 3~10곳 파일럿용)

**(A) Claim & Manage**  
- 기관이 자기 시설 페이지를 “인증/수정/사진/프로그램/상담 가능시간” 관리

**(B) Lead Inbox**  
- 부모가 “방문 상담 요청/대기 문의” 남김 → 기관이 대시보드에서 응답/태깅/상태관리

**(C) 대기관리 Lite(선택)**  
- 엑셀/종이 대신 간단한 단계 관리: “문의 → 방문 → 대기 → 입소”

### 3.3 과금(현실적인 초기 가격 구조)

- “지점당 월 과금” + “리드/기능 확장”이 글로벌에서도 검증된 형태다(가격 자체가 아니라 구조 참고).
- 권고 초기 가격(한국, 파일럿):
  - Lite: ₩39,000~₩99,000 / 월 / 지점
  - Pro(리드/대기 기능 강화): ₩149,000~₩299,000 / 월 / 지점
  - 파일럿 1개월 무료/할인으로 3~10곳 빠르게 확보

### 3.4 영업(GTM) 최소 프로세스

1. 타깃 리스트(권역 1~2곳 + 시설 유형 특정) 50곳
2. “리드/상담 처리 시간 단축” 1페이지 자료 + 데모 10분
3. 파일럿 3~10곳 → 유료 전환 조건(리드 수/응답률/리텐션) 설정

## 4. 앱 구독(TO/AI 프리미엄)을 3순위로 두는 이유(정책/원가)

### 4.1 iOS/Android 결제 정책이 제품 설계 자체를 바꾼다

- iOS: 디지털 기능/콘텐츠 잠금 해제는 IAP 원칙이 강하고, 예외/대체경로는 조건이 많다.
- 한국 iOS 외부결제(3자 결제) 엔타이틀먼트는:
  - **한국 전용 바이너리 분리**, **IAP와 혼용 불가**, **26% 커미션**, **월별 판매 보고** 등 운영 요구가 크다.

### 4.2 원가(COGS) 관리가 선행돼야 한다

- “알림 무제한/검색 무제한/AI 무제한”은 외부 API/토큰 원가를 폭발시킬 수 있다.
- 따라서 “구독”은 PMF/리텐션 확인 후에:
  - 기능별 원가 산정
  - 제한/티어링(슬롯, 횟수, 리포트 크레딧)
  - 스토어 정책 준수(IAP/Play Billing)까지 포함해 설계

## 5. 14일 실행계획(이번 달 매출 발생용)

### 5.1 1주차(7일) = 판매/납품 루프 만들기

- D1~D2: 랜딩 + 설문(고정 템플릿) + 결제 수단 + 예약(캘린더)
- D3~D4: 리포트 템플릿 v1(1~2p) + 운영 체크리스트 + 면책/약관 문구
- D5~D7: 유료 3~5건 “첫 납품” + FAQ/스크립트 업데이트

### 5.2 2주차(7일) = B2B 파일럿 착수 + 반복/개선

- D8~D10: 기관 50곳 아웃리치 → 10곳 데모 → 3곳 파일럿 시작
- D11~D14: 리드 인박스/프로필 관리 MVP 범위 확정(핵심 3기능만)

## 6. KPI(이번 달/다음 달)

### 6.1 B2C(상담)

- 유료 전환율: 랜딩 방문 → 결제
- 납품 리드타임: 결제 → 상담 → PDF 발송(24~48h 목표)
- CSAT/후기 확보율(다음 매출의 연료)

### 6.2 B2B(기관)

- 파일럿 → 유료 전환율
- 월 유지율(초기엔 2~3개월 유지가 핵심)
- 리드 응답률/응답 시간(기관 효율 KPI)

## 7. 리스크/컴플라이언스(최소 체크리스트)

- (정책) 앱에서 결제 유도 문구/링크/CTA는 스토어 정책에 의해 리스크가 될 수 있음  
  → **앱은 “동반 앱(예약 확인/알림)” 중심**, 구매는 웹/운영 채널 중심으로 분리(정책 재검토)
- (법/책임) “보장” 표현 금지, 정보 출처/한계 명시, 개인정보 최소 수집
- (운영) 환불/노쇼 정책, 상담 품질 표준(템플릿/스크립트), 데이터 보안(접근 통제/로그 최소화)

---

# 부록 A. “상담 상품 MVP” 데이터/API/어드민/PDF 설계(요약)

> 목표: 운영자가 “결제 확인 → 배정 → 상담 → 리포트 작성/발송”을 끊김 없이 처리

## A1. 데이터 모델(권고; MVP 최소 + 운영 필수)

### A1-1. `consultation_packages` (상품)

- `package_id`(문자열, slug): 예) `strategy-45`
- `title`, `duration_min`, `price_krw`
- `includes`: 예) `["사전 설문", "45분 상담", "맞춤 PDF 리포트(1~2p)"]`
- `active`, `sort_order`
- `created_at`, `updated_at`

인덱스: `package_id` unique, `active + sort_order`

### A1-2. `consultation_orders` (주문/상태 머신 핵심)

- `order_id`(UUID or prefixed id), `order_no`(표시용)
- `customer`: `{ user_id?, name?, email?, phone? }` (MVP는 최소 수집)
- `package_id`
- `status`:
  - `DRAFT`
  - `INTAKE_SUBMITTED`
  - `PAYMENT_PENDING`
  - `PAID`
  - `SCHEDULED`
  - `COMPLETED`
  - `REPORT_READY`
  - `REPORT_SENT`
  - `CLOSED`
  - 예외: `CANCELLED`, `REFUNDED`, `NO_SHOW`
- `pricing`: `{ price_krw, discount_krw, final_krw }`
- `payment`: `{ provider, method, external_order_id?, paid_at?, receipt_url? }`
- `assigned_counselor_id?`
- `appointment_id?`, `report_id?`
- `internal_note?`
- `created_at`, `updated_at`

인덱스: `order_no` unique, `status + created_at`, `assigned_counselor_id + status`

### A1-3. `consultation_intakes` (사전 설문; 민감정보 최소화)

- `order_id` unique
- `child`: `{ age_class?, birth_year?, months? }`
- `region`: `{ sido, sigungu, dong? }`
- `constraints`: `{ max_distance_km?, must_have?, avoid? }`
- `context`: `{ desired_start_month, applied_month?, wait_rank?, bonuses? }`
- `facility_shortlist?`: `[{ name, address?, memo? }]`
- `consent`: `{ privacy_accepted_at, terms_accepted_at }`
- `submitted_at`

인덱스: `order_id` unique, `submitted_at`

### A1-4. `consultation_appointments` (예약)

- `appointment_id`
- `order_id` unique
- `counselor_id?`
- `start_at`, `end_at`, `timezone`(고정 `Asia/Seoul`)
- `channel`: `phone | zoom | google_meet`
- `meeting_link?`
- `status`: `HOLD | CONFIRMED | DONE | NO_SHOW | CANCELLED`

인덱스: `counselor_id + start_at`, `start_at`

### A1-5. `consultation_reports` (리포트 + PDF)

- `report_id`
- `order_id` unique
- `counselor_id?`
- `template_version`: 예) `v1`
- `content`(JSON 권고):
  - `summary`
  - `risk_signals`: string[]
  - `recommended_actions`: `[{ title, why, effort, impact, due_date? }]`
  - `facility_shortlist?`: `[{ name, reason, distance_km?, notes? }]`
  - `references`: `[{ title, url }]`
- `pdf`: `{ status: NONE|GENERATING|READY|FAILED, file_key?, file_url?, generated_at? }`
- `sent_at?`, `send_channel?`
- `created_at`, `updated_at`

인덱스: `order_id` unique, `created_at`

## A2. API(예시; 프론트/노코드/앱 어디서든 붙을 수 있게 설계)

- (부모) `GET /api/v1/consultations/packages`
- (부모) `POST /api/v1/consultations/orders`
  - req: `{ package_id }`
  - res: `{ order_id, order_no, status }`
- (부모) `POST /api/v1/consultations/orders/:order_id/intake`
- (운영) `POST /api/v1/admin/consultations/orders/:order_id/mark-paid` (MVP 수동 결제 확인)
- (부모) `POST /api/v1/consultations/orders/:order_id/appointments`
- (운영) `PUT /api/v1/admin/consultations/orders/:order_id/report`
- (운영) `POST /api/v1/admin/consultations/orders/:order_id/report/pdf`
- (운영) `POST /api/v1/admin/consultations/orders/:order_id/report/send`

## A3. 관리자 화면(IA, MVP 필수 6개)

- 대시보드(요약): 오늘/이번주 상담, `REPORT_READY` 적체, SLA(48h)
- 주문 리스트/필터: 상태/기간/상품/상담사
- 주문 상세: 설문 요약 + 결제/예약 + 상담 노트 + 리포트 편집 + PDF/발송
- 캘린더(상담사별): 슬롯 오픈/예약 배정
- 상품 관리: 가격/구성/판매여부
- 로그(권고): 상태 변경/발송 이력(분쟁/CS 대비)

## A4. PDF 생성 방식(권고)

- (권고) **템플릿 기반 서버 PDF 생성**: 재현성/운영 안정성 우선(폰트/레이아웃 통제)
- (대안) HTML → Headless Chrome PDF: “화면 그대로”는 쉽지만 인프라/실행환경/비용 리스크

---

# 부록 B. 정책/결제 레퍼런스(핵심만)

- Apple App Review Guidelines 3.1.3(d): 실시간 person-to-person 서비스는 IAP 외 결제 가능(조건 존재)
- Apple StoreKit External Purchase Entitlement (South Korea): 한국 전용 외부결제(26% 커미션 + 월별 리포팅 등)
- Google Play Payments policy FAQ: 1:1 온라인 유료 서비스는 조건 충족 시 Play Billing 필수 아님(세션 재생 불가 등)
- Anthropic Claude Opus 4.6: API 가격(입력/출력 MTok 단가), 캐싱/배치로 비용 절감 가능

## Reference URLs (official)

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple: StoreKit External Purchase Entitlement (South Korea): https://developer.apple.com/support/storekit-external-entitlement-kr/
- Google Play Console Help (Payments policy): https://support.google.com/googleplay/android-developer/answer/10281818
- Anthropic pricing: https://www.anthropic.com/pricing
- Anthropic: Introducing Claude Opus 4.6: https://www.anthropic.com/news/claude-opus-4-6

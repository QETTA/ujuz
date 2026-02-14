# CLAUDE.md

## Status
Phase 8 전체 ✅ 완료. T-000~T-404 전 티켓 완료. D-시리즈(디자인) 대기.

## Workflow
- 품질 게이트: `pnpm typecheck` (0 에러 필수)
- dev 포트: **3001**
- 한국어 커뮤니케이션
- "풀가동" = Codex CLI 병렬, Plan Mode 생략
- **토큰 최소화**: 탐색 최소, 응답 간결, 불필요한 파일 읽기 금지, 중복 작업 금지

## Stack
- Next.js 15 App Router, React 19, TS strict
- AI SDK v6, Zod 4, MongoDB Atlas, Zustand 5, TailwindCSS v4, shadcn/ui, next-auth v5
- Mobile: Expo SDK 52 + expo-router (`mobile/`)

## Architecture
- **Chat**: `POST /api/bot/chat/stream` → `createUIMessageStream` + `streamText`
- **Logger**: `logger.error(msg, extra?)` — NOT pino-style
- **Auth**: `@/lib/server/auth` (NextAuth v5), `getUserId(req)` from `@/lib/server/apiHelpers`
- **DB**: `getDbOrThrow()` from `@/lib/server/db`, 컬렉션 상수 `U` from `@/lib/server/collections`
- **Errors**: `AppError(message, statusCode, code?, details?)` from `@/lib/server/errors`
- **API 정본**: `docs/CANONICAL-SPEC.md` (23개 엔드포인트, 비래핑 응답)
- **태스크**: `docs/CODEX-TASKS.md`

## ⛔ 절대 규칙
1. **Codex 실행 = Bash `codex exec` ONLY** — MCP 도구(mcp__codex-spark__*) 절대 금지
2. **병렬 실행**: `Bash(run_in_background: true)` + `codex exec --full-auto -C /mnt/c/Users/sihu2/ujuz-api "프롬프트"`
3. **보호 파일**: tsconfig.json, vitest.config.ts, package.json, .env.example, .gitignore, mobile/src/app/_layout.tsx — 수정 금지
4. **금지 생성물**: index.ts, dist/, src/api/, tsconfig.build.json, docs/ 연구 파일

## Codex 실행 템플릿
```bash
# instructions.md가 자동 로드되므로 "Do NOT modify..." 생략 가능
codex exec --full-auto -C /mnt/c/Users/sihu2/ujuz-api \
  "TASK {티켓번호}: {설명}. FILES: {파일목록}. SPEC: {상세}"
```
- `~/.codex/instructions.md`: 보호파일/금지생성물/로거/Auth/DB 규칙 자동 주입
- `~/.codex/config.toml`: `instructions_file` 설정으로 프로젝트별 자동 적용

## 후처리 (자동화)
```bash
bash scripts/codex-postfix.sh   # 보호파일 복원 + 정크 삭제 + typecheck
```
수동 체크: 로거 포맷 확인 (Codex는 pino-style로 작성 → `logger.error(msg, extra?)` 교정)

## 파이프라인
```
태스크 분석 → Codex exec 병렬 디스패치 → 완료 대기 → codex-postfix.sh → typecheck → 리뷰 → 커밋
```

## 역할 분담
- **Claude Code**: 설계, 태스크 분배, 리뷰, typecheck, 커밋, 리팩터링
- **Codex CLI**: 구현 (80%), Bash background 실행

## Commands
```bash
pnpm dev          # 3001
pnpm typecheck    # 필수 게이트
pnpm test         # Vitest
pnpm build        # 빌드
```

## Phase 8 디스패치 (엔터만 누르면 실행)
```
# T-401 + T-402 (Admin, 병렬)
codex exec --full-auto -C /mnt/c/Users/sihu2/ujuz-api "TASK T-401: Admin 대시보드. FILES: src/app/(app)/admin/page.tsx (기존 수정), src/app/api/v1/admin/metrics/route.ts (신규). SPEC: 카드 6개(오늘 결제/매출, 결제 실패율, 리포트 SLA 48h초과, 푸시 실패율, 지도 호출 추정, SMS비용). 기간 필터(7d/30d). GET /api/v1/admin/metrics?range=7d → { cards: [...] }. SLA 초과 클릭→상세 리스트. DB: orders/payments/push_logs 컬렉션. Analytics: admin_dashboard_view."

codex exec --full-auto -C /mnt/c/Users/sihu2/ujuz-api "TASK T-402: Admin 푸시 모니터링. FILES: src/app/(app)/admin/push/page.tsx (신규), src/app/api/v1/admin/push-metrics/route.ts (신규). SPEC: 24h/7d 집계 sent/delivered/failed. 실패 Top3 테이블. 토큰 정리 수 표시. GET /api/v1/admin/push-metrics?range=24h → { summary, failures_top3, tokens_cleaned }. DB: push_logs 컬렉션. Analytics: admin_push_view."
```
- 2개 병렬 실행
- 완료 후: `bash scripts/codex-postfix.sh`

## Key Paths
```
src/app/api/v1/               # REST API
src/lib/server/               # 서버 (db, auth, errors, collections, apiHelpers)
src/lib/client/hooks/         # 클라이언트 훅
src/components/               # UI (shadcn/ui)
mobile/src/app/               # Expo 라우트
mobile/src/lib/api.ts         # 모바일 API (getJson/postJson/deleteJson/patchJson)
mobile/src/components/states/ # 공통 상태 UI 6종
docs/                         # 정본 문서
scripts/codex-postfix.sh      # 후처리 자동화
```

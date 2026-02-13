# Opus ↔ Codex-Spark 협업 워크플로우 메모리

## 현재 세팅 (2026-02-14)
- Claude Opus = 설계/리뷰/아키텍처 (20%)
- Codex-Spark (gpt-5.3-codex-spark) = 구현 (80%)
- MCP 연동: `.mcp.json` → `codex` / `codex-reply` 도구
- approval_policy: on-failure (이중 승인 방지)

## 검증된 패턴
1. **단일 태스크 위임**: Codex에 자기완결형 프롬프트 전달 → 파일 경로, 요구사항, 금지사항 명시
2. **병렬 실행**: Codex MCP + Claude Task agents 동시 투입 가능
3. **Codex 강점**: 파일 생성, 보일러플레이트, 설정 파일, 컴포넌트 구현, CRUD API
4. **Codex 약점**: 기존 코드 깊은 분석 필요한 작업, 스트리밍 아키텍처, 보안 설계

## 실행 중 발견한 개선점
- Codex에 "Do NOT run any commands. Only create files." 명시 필요 (sandbox에서 npm install 시도 방지)
- 파일 경로를 절대경로로 명시하면 정확도 높음
- 한 세션에 관련 파일 묶어서 보내면 일관성 유지 (예: Expo 전체 세팅을 한 번에)
- CHANGELOG 같은 문서 작업도 Codex가 잘 처리함

## 병렬화 전략
- Codex MCP: 큰 덩어리 구현 (새 프로젝트 세팅, 대량 파일 생성)
- Claude Task agents: 기존 파일 수정, 코드 리뷰가 필요한 작업
- 둘 다 background로 돌리고 결과 취합

## 작업 로그
- [2026-02-14] Expo + NativeWind 프로젝트 세팅: Codex 1회 → 22개 파일 생성 ✅
- [2026-02-14] CHANGELOG.md: Codex 1회 → 완료 ✅
- [2026-02-14] CI workflow: Claude agent → 완료 ✅
- [2026-02-14] Privacy/Terms: Claude agent → 완료 ✅
- [2026-02-14] AI disclaimer: Claude agent → 완료 ✅
- [2026-02-14] EvidenceLabel + DisclaimerBanner: Codex → 완료 ✅
- [2026-02-14] 기술 조합 결정 (ADR 12건): Opus 분석 → PROJECT-DIRECTION.md v2 ✅
- [2026-02-14] 사업 보고서 2차 분석 (네이티브 확장 전략): 반영 완료 ✅

## codex-reply 상호 추론 패턴 (2026-02-14 발견)
- `codex` (단발) 후 에러 발견 시 `codex-reply`(threadId)로 수정 지시
- Codex가 자체 실수를 인식하고 정확하게 수정함 (테스트 기대값 6건 수정 성공)
- 활용 시나리오: 테스트 실패 피드백, import 누락, 타입 에러 수정
- 주의: Codex가 tsconfig.json/vitest.config.ts 같은 설정 파일을 임의로 수정할 수 있음 → 사전에 "Do NOT modify tsconfig.json or vitest.config.ts" 명시 필요

## Phase 1 완료 현황 (2026-02-14)
- ✅ CI/CD (GitHub Actions)
- ✅ 개인정보/면책 (/privacy, /terms, AI 면책)
- ✅ EvidenceLabel + DisclaimerBanner 컴포넌트 생성
- ✅ CHANGELOG + Expo 스캐폴드 (22개 파일)
- ✅ 인메모리 LRU 캐시 (lruCache.ts + admissionEngineV2 통합)
- ✅ 입소 엔진 테스트 60+ (comprehensive test, 전부 통과)
- ✅ EvidenceLabel/DisclaimerBanner UI 통합 (4개 컴포넌트)
- ✅ API 에러 포맷 표준화 (apiError.ts + 30개 라우트)
- ✅ AUTH_BYPASS 프로덕션 안전 검증 (이중 게이트 확인)
- ✅ Expo 푸시/지도 PoC (notifications.ts + map.tsx + push API)

## 다음 단계 (Phase 2 준비)
- Expo 실기기 빌드 + 푸시 테스트 (EAS Build)
- TO 감지 스케줄러 (cron)
- Kakao Local API 백엔드 프록시
- 레거시 데드 코드 정리 (limits.ts, tier.ts, time.ts)

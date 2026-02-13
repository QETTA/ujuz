# 워크플로우 컨벤션 (v2, 2026-02-14)

## 협업 모델 (8:2)
- **Codex-Spark (80%)**: 컴포넌트, API 라우트, UI 페이지, 모바일 스크린, CRUD
- **Claude Opus (20%)**: 스트리밍 파이프라인, 아키텍처, 보안 설계, 크로스-파일 통합

## MCP 연동
- `.mcp.json`: codex-spark (gpt-5.3-codex-spark, on-failure)
- 도구: `mcp__codex-spark__codex` (신규), `mcp__codex-spark__codex-reply` (이어하기)

## Codex 대형 배치 실행 체크리스트
1. [ ] 10개 독립 태스크 설계 (파일 겹침 0)
2. [ ] 프롬프트에 금지 파일 규칙 포함
3. [ ] 병렬 발사 (단일 메시지에 10개)
4. [ ] 완료 후: `git checkout -- tsconfig.json vitest.config.ts package.json .env.example .gitignore`
5. [ ] 정크 삭제: `rm -rf dist/ index.ts src/api/ tsconfig.build.json`
6. [ ] 로거 포맷 수정 (pino → project)
7. [ ] 크로스-파일 통합 (featureFlags, collections, env.ts)
8. [ ] `pnpm typecheck` → Phase-specific 에러 수정
9. [ ] `git add` (개별 파일 지정) → commit → push

## Git 컨벤션
- Phase 커밋: `feat: Phase N {제목} — 10개 Codex-Spark 병렬 + Opus 통합`
- Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
- NEVER force push, NEVER amend published commits

## 품질 게이트
- `pnpm typecheck` 필수 (모든 변경 후)
- Hook: TaskCompleted → typecheck, PreToolUse → rm -rf 차단
- PostToolUse → Write/Edit 파일 로깅

## 환경변수 관리
- `.env.local`: 로컬 개발 (git 추적 X)
- `.env.example`: 템플릿 (git 추적 O)
- `src/lib/server/env.ts`: Zod 스키마 검증
- 새 env 추가 시: env.ts에 스키마 + .env.local에 값 + .env.example에 빈 키

## 로거 포맷 (중요!)
```typescript
logger.error('메시지 문자열', { extra: '객체' })   // ✅ 올바름
logger.error({ extra: '객체' }, '메시지 문자열')   // ❌ Codex 스타일 (수정 필요)
```

## pre-existing 타입 에러 (무시)
- `Cannot find module 'next/server'` — 환경 의존성 문제
- `Cannot find module 'react'` — 같은 원인
- `JSX element implicitly has type 'any'` — 같은 원인
- `CardProps` / `BadgeProps` className 미지원 — UI 컴포넌트 이슈
- `src/lib/store.ts` implicit any — Zustand 스토어 이슈

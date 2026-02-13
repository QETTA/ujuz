# Opus ↔ Codex-Spark 협업 워크플로우 (v2, 2026-02-14)

## 세팅
- Claude Opus 4.6 = 설계/리뷰/통합 (20%)
- Codex-Spark (gpt-5.3-codex-spark) = 구현 (80%)
- MCP: `.mcp.json` → `codex` / `codex-reply` 도구, approval_policy: on-failure

## 검증된 대형 작업 패턴 (Phase 2~4에서 30+ 태스크 실행)

### 실행 플로우
1. Opus가 10개 독립 태스크 설계 (파일 겹침 0 보장)
2. 10개 `mcp__codex-spark__codex` 병렬 발사 (단일 메시지)
3. 전부 완료 후 Opus 후처리:
   - `git checkout -- tsconfig.json vitest.config.ts package.json .env.example .gitignore`
   - `rm -rf dist/ index.ts src/api/ tsconfig.build.json` 정크 삭제
   - 로거 포맷 수정 (pino-style → project-style)
   - 크로스-파일 통합 (featureFlags, collections, env.ts, stream route 등)
   - `pnpm typecheck` → Phase-specific 에러만 수정

### Codex 프롬프트 필수 포함 문구
```
Do NOT modify tsconfig.json, vitest.config.ts, package.json, .env.example, .gitignore, README.md.
Do NOT create index.ts, dist/, src/api/, tsconfig.build.json.
Only create the specified new files.
```

### Codex 반복 실수 (매 배치 발생)
1. **금지 파일 수정** (~50% 확률): package.json, tsconfig.json → git checkout 복원
2. **로거 포맷**: `logger.error({ obj }, 'msg')` (pino) → `logger.error('msg', { obj })` (프로젝트)
3. **정크 파일**: dist/, index.ts, src/api/, tsconfig.build.json → rm
4. **env.ts 무시**: `process.env.X` 직접 사용 → `env.X`로 통합 필요
5. **Filter 타입 캐스팅**: `as Filter<CustomType>` → 제거 (untyped collection 사용)

### Codex 강점
- 새 파일 생성, 보일러플레이트, CRUD API, UI 페이지, 모바일 스크린
- 한 프롬프트에 여러 파일 요청 시 일관된 구현

### codex-reply 패턴
- `codex` 후 에러 발견 시 `codex-reply(threadId)` 로 수정 지시
- 자체 실수 인식 + 정확 수정 (테스트 기대값, import 누락, 타입 에러)

## 작업 이력

| Phase | Codex 배치 | 파일 | 줄수 |
|-------|-----------|------|------|
| 1 | 개별 + Agent | 16 | +2,100 |
| 2 | 10개 병렬 | 16 | +2,371 |
| 3 | 10개 병렬 | 22 | +1,666 |
| 4 | 10개 병렬 | 13 | +3,287 |
| **합계** | **30+ 태스크** | **67** | **+9,424** |

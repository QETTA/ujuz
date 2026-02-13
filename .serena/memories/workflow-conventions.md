# 워크플로우 컨벤션 메모리

## 협업 모델 (8:2 분담)
- **Codex-Spark (80%)**: 컴포넌트 구현, CSS, 데이터 바인딩, API 라우트, 리팩토링, 테스트 작성, 핫픽스
- **Claude Opus (20%)**: 스트리밍 파이프라인, 상태 아키텍처, 보안 설계, 코드 리뷰

## MCP 연동
- `.mcp.json`에서 codex-spark MCP 서버 설정 (개인 세팅, .gitignore 처리)
- 모델: gpt-5.3-codex-spark, approval_policy: on-failure
- Claude Code에서 codex / codex-reply 도구로 직접 호출

## Git 커밋 컨벤션
- Codex 배치: `[CODEX-N]` 접두사
- Claude 작업: Co-Authored-By 태그
- PR: .github/PULL_REQUEST_TEMPLATE.md 형식

## 품질 게이트
- 모든 변경 후 `pnpm typecheck` 필수
- Claude Code hook: TaskCompleted → pnpm typecheck
- PreToolUse hook: rm -rf 차단

## 환경 변수 (필수)
- MONGODB_URI, MONGODB_DB_NAME
- AUTH_SECRET, ANTHROPIC_API_KEY
- AUTH_BYPASS (dev only)

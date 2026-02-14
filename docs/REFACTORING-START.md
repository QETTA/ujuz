# Refactoring Start Guide

Use this flow when beginning a new refactoring branch.

## 1) Create a branch

```bash
git checkout -b codex/<short-refactor-name>
```

## 2) Run baseline checks

```bash
pnpm refactor:start
```

This command validates required tools, ensures dependencies are available, and runs:

- `pnpm typecheck`
- `pnpm test`

## 3) Capture current risk surface

Run targeted checks before and after each refactor chunk:

```bash
pnpm typecheck
pnpm test
```

## 4) Keep commits small

- Commit by concern (validation, API route, utility extraction, etc.)
- Avoid mixing behavior changes and pure code movement in one commit.
- Use explicit commit messages (`refactor:`, `test:`, `chore:`).

## 5) Final sanity before PR

```bash
git status
pnpm typecheck
pnpm test
```

## 6) Codex CLI로 전체 리팩토링 실행

```bash
pnpm codex:refactor:all
```

요구사항을 추가하려면 인자를 붙여 실행합니다.

```bash
pnpm codex:refactor:all -- "API 라우트 레이어 우선으로 리팩토링"
```

# Full-Scope Refactoring Plan

- Generated at: 2026-02-14 16:38:33 UTC
- Workers: 4
- Target files: 358

## Worker Shards
- worker-1: 90 files (`docs/refactoring/plans/worker-1.txt`)
- worker-2: 90 files (`docs/refactoring/plans/worker-2.txt`)
- worker-3: 89 files (`docs/refactoring/plans/worker-3.txt`)
- worker-4: 89 files (`docs/refactoring/plans/worker-4.txt`)

## Recommended Execution
```bash
# Worker 1
bash scripts/refactor-toolkit.sh run --worker 1 -- "<your-command> {file}"
# Worker 2
bash scripts/refactor-toolkit.sh run --worker 2 -- "<your-command> {file}"
# Worker 3
bash scripts/refactor-toolkit.sh run --worker 3 -- "<your-command> {file}"
# Worker 4
bash scripts/refactor-toolkit.sh run --worker 4 -- "<your-command> {file}"

# All workers in parallel
bash scripts/refactor-toolkit.sh run-all --workers 4 -- "<your-command> {file}"
```

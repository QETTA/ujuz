#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/refactor-toolkit.sh changed
  bash scripts/refactor-toolkit.sh verify [--with-test]
  bash scripts/refactor-toolkit.sh track [--out <path>]
  bash scripts/refactor-toolkit.sh plan --workers <n> [--out-dir <path>]
  bash scripts/refactor-toolkit.sh run --worker <n> [--plan-dir <path>] [--keep-going] [--max-files <n>] -- <command-template>
  bash scripts/refactor-toolkit.sh run-all --workers <n> [--plan-dir <path>] [--fail-fast] [--keep-going] [--max-files <n>] -- <command-template>
  bash scripts/refactor-toolkit.sh polish --workers <n> [--plan-dir <path>] [--keep-going] [--max-files <n>] -- <command-template>
  bash scripts/refactor-toolkit.sh doctor [--with-test]

Commands:
  changed      Print git status + changed files summary
  verify       Run typecheck, and optionally tests
  track        Snapshot current refactoring progress to a markdown file
  plan         Split full-scope refactoring targets into worker shards
  run          Execute a command template for each file in one worker shard
  run-all      Execute worker shards in parallel using `run`
  polish       Full pipeline: plan -> run-all -> track -> doctor
  doctor       Run repo stability checks with clear preflight validation

Template behavior:
  - Use {file} placeholder to inject current file path.
  - If {file} is missing, file path is appended as the last argument.
USAGE
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

require_git_repo() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "This script must run inside a git repository." >&2
    exit 1
  fi
}

validate_positive_int() {
  local label="$1"
  local value="$2"
  if ! [[ "$value" =~ ^[1-9][0-9]*$ ]]; then
    echo "$label must be a positive integer" >&2
    exit 1
  fi
}

list_refactor_targets() {
  rg --files src docs scripts \
    -g '!**/*.md' \
    -g '!**/*.snap' \
    -g '!**/*.png' \
    -g '!**/*.jpg' \
    -g '!**/*.jpeg' \
    -g '!**/*.svg' \
    -g '!**/*.webp' \
    -g '!**/*.json' \
    -g '!**/*.lock' \
    -g '!**/*.map' \
    -g '!docs/refactoring/current-status.md' \
    -g '!docs/refactoring/plans/**' \
    -g '!docs/refactoring/logs/**'
}

ensure_plan_file() {
  local plan_file="$1"
  if [[ ! -f "$plan_file" ]]; then
    echo "Missing plan shard: $plan_file" >&2
    echo "Run: bash scripts/refactor-toolkit.sh plan --workers <n>" >&2
    exit 1
  fi
}

run_template_for_file() {
  local template="$1"
  local file="$2"
  local escaped_file
  printf -v escaped_file '%q' "$file"

  if [[ "$template" == *"{file}"* ]]; then
    local cmd_line="${template//\{file\}/$escaped_file}"
    bash -lc "$cmd_line"
  else
    bash -lc "$template \"$file\""
  fi
}

run_worker_shard() {
  local worker="$1"
  local plan_dir="$2"
  local template="$3"
  local keep_going="$4"
  local max_files="$5"

  local plan_file="${plan_dir}/worker-${worker}.txt"
  ensure_plan_file "$plan_file"

  mkdir -p docs/refactoring/logs
  local fail_log="docs/refactoring/logs/worker-${worker}.failed.txt"
  : >| "$fail_log"

  local total
  total="$(wc -l < "$plan_file" | tr -d ' ')"
  echo "== worker ${worker} start (${total} files) =="

  local i=0
  local failures=0
  while IFS= read -r file || [[ -n "$file" ]]; do
    [[ -z "$file" ]] && continue

    if [[ "$max_files" -gt 0 && "$i" -ge "$max_files" ]]; then
      break
    fi

    i=$((i + 1))
    echo "[worker ${worker}] (${i}/${total}) ${file}"
    if ! run_template_for_file "$template" "$file"; then
      failures=$((failures + 1))
      echo "$file" >> "$fail_log"
      if [[ "$keep_going" -eq 0 ]]; then
        echo "[worker ${worker}] failed: ${file}" >&2
        return 1
      fi
    fi
  done < "$plan_file"

  echo "== worker ${worker} done (processed=${i}, failures=${failures}) =="
  if [[ "$failures" -gt 0 ]]; then
    echo "failure log: $fail_log" >&2
    return 1
  fi
  return 0
}

cmd="${1:-}"
shift || true

require_command git
require_git_repo

case "$cmd" in
  changed)
    echo "== git status =="
    git status --short
    echo
    echo "== changed files =="
    git diff --name-only
    ;;
  verify)
    require_command pnpm
    with_test=0
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --with-test) with_test=1 ;;
        *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
      esac
      shift
    done

    echo "== pnpm typecheck =="
    pnpm typecheck

    if [[ "$with_test" -eq 1 ]]; then
      echo "== pnpm test =="
      pnpm test
    fi
    ;;
  track)
    out="docs/refactoring/current-status.md"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --out) shift; out="${1:-}"; [[ -n "$out" ]] || { echo "--out requires a file path" >&2; exit 1; } ;;
        *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
      esac
      shift
    done

    mkdir -p "$(dirname "$out")"
    branch="$(git rev-parse --abbrev-ref HEAD)"
    now="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"

    {
      echo "# Refactoring Progress Snapshot"
      echo
      echo "- Generated at: ${now}"
      echo "- Branch: ${branch}"
      echo
      echo "## Working Tree"
      echo '```text'
      git status --short
      echo '```'
      echo
      echo "## Changed Files"
      echo '```text'
      git diff --name-only
      echo '```'
      echo
      echo "## Diff Stat"
      echo '```text'
      git diff --stat
      echo '```'
      echo
      echo "## Recent Commits"
      echo '```text'
      git log --oneline -n 10
      echo '```'
    } > "$out"

    echo "wrote snapshot: $out"
    ;;
  plan)
    require_command rg
    workers=0
    out_dir="docs/refactoring/plans"

    while [[ $# -gt 0 ]]; do
      case "$1" in
        --workers) shift; workers="${1:-0}" ;;
        --out-dir) shift; out_dir="${1:-}"; [[ -n "$out_dir" ]] || { echo "--out-dir requires a path" >&2; exit 1; } ;;
        *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
      esac
      shift
    done

    validate_positive_int "--workers" "$workers"

    mapfile -t files < <(list_refactor_targets)
    total="${#files[@]}"
    if [[ "$total" -eq 0 ]]; then
      echo "No refactoring targets found under src/docs/scripts." >&2
      exit 1
    fi

    mkdir -p "$out_dir"
    for i in $(seq 1 "$workers"); do
      : >| "${out_dir}/worker-${i}.txt"
    done

    index=0
    for file in "${files[@]}"; do
      worker=$(( (index % workers) + 1 ))
      echo "$file" >> "${out_dir}/worker-${worker}.txt"
      index=$((index + 1))
    done

    summary="${out_dir}/README.md"
    now="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    {
      echo "# Full-Scope Refactoring Plan"
      echo
      echo "- Generated at: ${now}"
      echo "- Workers: ${workers}"
      echo "- Target files: ${total}"
      echo
      echo "## Worker Shards"
      for i in $(seq 1 "$workers"); do
        count="$(wc -l < "${out_dir}/worker-${i}.txt" | tr -d ' ')"
        echo "- worker-${i}: ${count} files (\`${out_dir}/worker-${i}.txt\`)"
      done
      echo
      echo "## Recommended Execution"
      echo '```bash'
      for i in $(seq 1 "$workers"); do
        echo "# Worker ${i}"
        echo "bash scripts/refactor-toolkit.sh run --worker ${i} -- \"<your-command> {file}\""
      done
      echo
      echo '# All workers in parallel'
      echo "bash scripts/refactor-toolkit.sh run-all --workers ${workers} -- \"<your-command> {file}\""
      echo '```'
    } > "$summary"

    echo "wrote plan: $summary"
    ;;
  run)
    worker=0
    plan_dir="docs/refactoring/plans"
    keep_going=0
    max_files=0

    while [[ $# -gt 0 ]]; do
      case "$1" in
        --worker) shift; worker="${1:-0}" ;;
        --plan-dir) shift; plan_dir="${1:-}" ;;
        --keep-going) keep_going=1 ;;
        --max-files) shift; max_files="${1:-0}" ;;
        --) shift; break ;;
        *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
      esac
      shift
    done

    template="$*"
    validate_positive_int "--worker" "$worker"
    if [[ "$max_files" -ne 0 ]]; then
      validate_positive_int "--max-files" "$max_files"
    fi
    [[ -n "$template" ]] || { echo "run requires a command template after --" >&2; exit 1; }

    run_worker_shard "$worker" "$plan_dir" "$template" "$keep_going" "$max_files"
    ;;
  run-all)
    workers=0
    plan_dir="docs/refactoring/plans"
    fail_fast=0
    keep_going=0
    max_files=0

    while [[ $# -gt 0 ]]; do
      case "$1" in
        --workers) shift; workers="${1:-0}" ;;
        --plan-dir) shift; plan_dir="${1:-}" ;;
        --fail-fast) fail_fast=1 ;;
        --keep-going) keep_going=1 ;;
        --max-files) shift; max_files="${1:-0}" ;;
        --) shift; break ;;
        *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
      esac
      shift
    done

    template="$*"
    validate_positive_int "--workers" "$workers"
    if [[ "$max_files" -ne 0 ]]; then
      validate_positive_int "--max-files" "$max_files"
    fi
    [[ -n "$template" ]] || { echo "run-all requires a command template after --" >&2; exit 1; }

    if [[ "$fail_fast" -eq 1 ]]; then
      for i in $(seq 1 "$workers"); do
        run_worker_shard "$i" "$plan_dir" "$template" "$keep_going" "$max_files"
      done
    else
      pids=()
      for i in $(seq 1 "$workers"); do
        (run_worker_shard "$i" "$plan_dir" "$template" "$keep_going" "$max_files") &
        pids+=("$!")
      done

      exit_code=0
      for pid in "${pids[@]}"; do
        if ! wait "$pid"; then
          exit_code=1
        fi
      done
      exit "$exit_code"
    fi
    ;;
  polish)
    workers=0
    plan_dir="docs/refactoring/plans"
    keep_going=0
    max_files=0

    while [[ $# -gt 0 ]]; do
      case "$1" in
        --workers) shift; workers="${1:-0}" ;;
        --plan-dir) shift; plan_dir="${1:-}" ;;
        --keep-going) keep_going=1 ;;
        --max-files) shift; max_files="${1:-0}" ;;
        --) shift; break ;;
        *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
      esac
      shift
    done

    template="$*"
    validate_positive_int "--workers" "$workers"
    if [[ "$max_files" -ne 0 ]]; then
      validate_positive_int "--max-files" "$max_files"
    fi
    [[ -n "$template" ]] || { echo "polish requires a command template after --" >&2; exit 1; }

    bash scripts/refactor-toolkit.sh plan --workers "$workers" --out-dir "$plan_dir"

    run_all_cmd=(bash scripts/refactor-toolkit.sh run-all --workers "$workers" --plan-dir "$plan_dir")
    if [[ "$keep_going" -eq 1 ]]; then
      run_all_cmd+=(--keep-going)
    fi
    if [[ "$max_files" -gt 0 ]]; then
      run_all_cmd+=(--max-files "$max_files")
    fi
    run_all_cmd+=(-- "$template")
    "${run_all_cmd[@]}"

    bash scripts/refactor-toolkit.sh track
    bash scripts/refactor-toolkit.sh doctor
    ;;
  doctor)
    require_command pnpm
    with_test=0
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --with-test) with_test=1 ;;
        *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
      esac
      shift
    done

    echo "== preflight =="
    echo "branch: $(git rev-parse --abbrev-ref HEAD)"
    echo "commit: $(git rev-parse --short HEAD)"

    echo "== pnpm typecheck =="
    pnpm typecheck

    if [[ "$with_test" -eq 1 ]]; then
      echo "== pnpm test =="
      pnpm test
    fi

    echo "== git status --short =="
    git status --short
    ;;
  *)
    usage
    exit 1
    ;;
esac

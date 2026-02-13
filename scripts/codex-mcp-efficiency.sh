#!/usr/bin/env bash
# Usage:
#   bash scripts/codex-mcp-efficiency.sh [LOG_PATH] [TOP_N]
set -euo pipefail

LOG_PATH="${1:-$HOME/.codex/log/codex-tui.log}"
TOP_N="${2:-12}"

if [[ ! -f "$LOG_PATH" ]]; then
  echo "로그 파일을 찾을 수 없습니다: $LOG_PATH"
  exit 1
fi

if command -v codex >/dev/null 2>&1; then
  echo "### 1) Codex CLI 확인"
  codex --version
  echo
else
  echo "### 1) Codex CLI 확인: codex 실행 파일이 PATH에 없음"
fi

python3 - "$LOG_PATH" "$TOP_N" <<'PY'
import json
import re
import sys
from collections import Counter, defaultdict

log_path = sys.argv[1]
top_n = int(sys.argv[2])

line_count = 0
tool_calls = 0
error_count = 0
warn_count = 0
tool_counter = Counter()
thread_counter = Counter()
thread_errors = Counter()
thread_warnings = Counter()
thread_failure_errors = Counter()
thread_notify_warnings = Counter()
thread_first_ts = {}
thread_last_ts = {}
thread_tool_counter = defaultdict(Counter)
tool_lines = defaultdict(int)
thread_messages = defaultdict(list)
thread_first_seen = {}
thread_last_seen = {}
thread_last_tool = {}
command_counter = Counter()
tool_combo_counter = Counter()

failure_patterns = [
    "failed", "failure", "timed out", "timeout", "permission denied",
    "forbidden", "unauthorized", "denied", "exception", "traceback",
    "error code", "cannot", "could not", "not found", "no such file"
]
thread_id_regex = re.compile(r"\bthread_id=([a-f0-9-]{8,40})", re.IGNORECASE)
tool_call_regex = re.compile(r"\bToolCall:\s*([A-Za-z0-9_]+)\b")
json_tool_name_regex = re.compile(r'"tool[_ ]?name"\s*:\s*"([^"]+)"', re.IGNORECASE)
json_thread_regex = re.compile(r'"thread[_ ]?id"\s*:\s*"([a-f0-9-]{8,40})"', re.IGNORECASE)
json_level_regex = re.compile(r'"level"\s*:\s*"([^"]+)"', re.IGNORECASE)
json_message_regex = re.compile(r'"message"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"', re.IGNORECASE)
json_command_regex = re.compile(r'"command"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"', re.IGNORECASE)
json_cmd_key_regex = re.compile(r'"cmd"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"', re.IGNORECASE)
log_level_regex = re.compile(r"\s(INFO|WARN(?:ING)?|ERROR|ERR|TRACE|DEBUG)\s")

def is_failure_like(text: str) -> bool:
    t = text.lower()
    return any(p in t for p in failure_patterns)

def get_field(obj, names):
    if isinstance(obj, dict):
        for name in names:
            if name in obj and obj[name] is not None:
                return obj[name]
        for value in obj.values():
            if isinstance(value, (dict, list)):
                result = get_field(value, names)
                if result is not None:
                    return result
    elif isinstance(obj, list):
        for value in obj:
            if isinstance(value, (dict, list)):
                result = get_field(value, names)
                if result is not None:
                    return result
    return None

def normalize_cmd(cmd: str) -> str:
    if not cmd:
        return ""
    cmd = cmd.strip()
    return cmd.split()[0]

def line_timestamp(line):
    return line[:30].strip()

thread_order = []

with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        line_count += 1
        line = line.strip("\n")
        level = ""
        thread_id = ""
        tool_name = ""
        message = ""
        command = ""

        payload = None
        try:
            payload = json.loads(line)
        except Exception:
            payload = None

        if payload is not None:
            thread_id = str(get_field(payload, ["thread_id", "threadId", "session_id"]) or "")
            level = str(get_field(payload, ["level"]) or "").lower()
            message = str(get_field(payload, ["message"]) or "")
            tool_name = str(get_field(payload, ["tool_name"]) or get_field(payload, ["name"]) or "")
            command = get_field(payload, ["command"]) or ""
            ts = get_field(payload, ["ts", "timestamp", "time", "created_at"]) or line_timestamp(line)
        else:
            m = thread_id_regex.search(line)
            if m:
                thread_id = m.group(1)
            if not thread_id:
                m = json_thread_regex.search(line)
                if m:
                    thread_id = m.group(1)
            m = log_level_regex.search(line)
            if m:
                level = m.group(1).lower()
            if not level:
                m = json_level_regex.search(line)
                if m:
                    level = m.group(1).lower()
            m = json_message_regex.search(line)
            if m:
                try:
                    message = json.loads(f'"{m.group(1)}"')
                except Exception:
                    message = m.group(1)
            m = tool_call_regex.search(line)
            if m:
                tool_name = m.group(1)
            if not tool_name:
                m = json_tool_name_regex.search(line)
                if m:
                    tool_name = m.group(1)
            if not tool_name:
                m = re.search(r'"name"\s*:\s*"([^"]+)"', line)
                if m:
                    tool_name = m.group(1)
            m = json_command_regex.search(line)
            if m:
                try:
                    command = json.loads(f'"{m.group(1)}"')
                except Exception:
                    command = m.group(1)
            m = json_cmd_key_regex.search(line)
            if not m:
                m = re.search(r'"command"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"', line)
            if m and not command:
                try:
                    command = json.loads(f'"{m.group(1)}"')
                except Exception:
                    command = m.group(1)
            m = re.search(r'Bash\\(([^)]*)\\)', line)
            if m and not command:
                command = m.group(1)
            ts = line_timestamp(line)

        if not thread_id:
            thread_id = "unknown"

        if thread_id not in thread_first_seen:
            thread_first_seen[thread_id] = ts
            thread_order.append(thread_id)
        thread_last_seen[thread_id] = ts

        if "write_stdin" in tool_name or "exec_command" in tool_name or "apply_patch" in tool_name:
            tool_calls += 1

        if tool_name:
            tool_counter[tool_name] += 1
            thread_counter[thread_id] += 1
            thread_tool_counter[thread_id][tool_name] += 1

        if level:
            if "warn" in level:
                warn_count += 1
                thread_warnings[thread_id] += 1
                if is_failure_like(message):
                    thread_failure_errors[thread_id] += 1
                else:
                    thread_notify_warnings[thread_id] += 1
            if "err" in level:
                error_count += 1
                thread_errors[thread_id] += 1
                thread_failure_errors[thread_id] += 1

        lowmsg = (message or "").lower()
        if "codex-spark" in lowmsg:
            tool_lines["codex-spark_mentions"] += 1
        if "approval_policy" in lowmsg:
            tool_lines["approval_policy_mentions"] += 1
        if "on-request" in lowmsg:
            tool_lines["on_request_mentions"] += 1

        raw_command = normalize_cmd(str(command) if command else "")
        if raw_command:
            command_counter[raw_command] += 1

        if tool_name and thread_last_tool.get(thread_id):
            last_tool = thread_last_tool[thread_id]
            prev_cmd = thread_last_tool.get(f"{thread_id}::cmd", "")
            combo = f"{last_tool}({prev_cmd}) -> {tool_name}({raw_command})"
            tool_combo_counter[combo] += 1

            if last_tool == "mcp__filesystem__read_text_file" and tool_name == "mcp__filesystem__list_directory":
                thread_messages[thread_id].append("read/list sequence")
            if raw_command in {"read", "rg", "grep"} and prev_cmd in {"read", "find", "ls"}:
                thread_messages[thread_id].append("read-grep candidate")

        thread_last_tool[thread_id] = tool_name
        thread_last_tool[f"{thread_id}::cmd"] = raw_command

        if thread_id not in thread_first_ts:
            thread_first_ts[thread_id] = ts
        thread_last_ts[thread_id] = ts

        if "thread_id" in line and (thread_id and len(thread_id) > 8):
            if thread_id not in thread_order:
                thread_order.append(thread_id)

if not thread_counter:
    print("유효한 thread_id 수집이 없어 요약할 수 없습니다.")
    sys.exit(0)

print("=== Codex MCP 효율 리포트 ===")
print(f"log file: {log_path}")
print(f"총 라인 수: {line_count:,}")
print(f"총 tool 호출 추정치: {tool_calls:,}")
print(f"총 error: {error_count:,}")
print(f"총 warning: {warn_count:,}")
print(f"실패성 warning: {sum(thread_failure_errors.values()):,}")
print(f"알림성 warning: {sum(thread_notify_warnings.values()):,}")
print(f"codex-spark mentions: {tool_lines['codex-spark_mentions']}")
print(f"approval_policy mentions: {tool_lines['approval_policy_mentions']}")
print(f"on-request mentions: {tool_lines['on_request_mentions']}")
print()

print("=== Tool Top 10 ===")
for t, c in tool_counter.most_common(10):
    print(f"- {t}: {c}")
print()

print("=== 주요 command Top 10 ===")
for cmd, c in command_counter.most_common(10):
    print(f"- {cmd}: {c}")
print()

print("=== Thread Top 10 (메시지/호출량) ===")
for thread, c in sorted(thread_counter.items(), key=lambda kv: kv[1], reverse=True)[:10]:
    fail = thread_failure_errors.get(thread, 0)
    warn = thread_warnings.get(thread, 0)
    print(f"- {thread}: calls={c}, warning={warn}, fail_error={fail}")
print()

top_thread = max(thread_counter.items(), key=lambda kv: kv[1])[0]
dur = "unknown"
if top_thread in thread_first_ts and top_thread in thread_last_ts:
    if thread_first_ts[top_thread] and thread_last_ts[top_thread]:
        dur = f"{thread_first_ts[top_thread]} -> {thread_last_ts[top_thread]}"

fail_total = thread_failure_errors[top_thread]
warn_total = thread_warnings[top_thread]
call_total = max(thread_counter[top_thread], 1)
completion_ratio = ((call_total - fail_total) / call_total) * 100
notify_ratio = (thread_notify_warnings[top_thread] / max(warn_total, 1)) * 100 if warn_total else 0.0

print("=== 세션 종료 요약(자동 템플릿) ===")
print(f"- thread_id: {top_thread}")
print(f"- 기간: {dur}")
print(f"- tool_calls: {call_total}")
print(f"- errors: {thread_errors.get(top_thread, 0)}")
print(f"- warnings: {warn_total}")
print(f"- fail성 warning: {fail_total}")
print(f"- notify성 warning: {thread_notify_warnings.get(top_thread, 0)}")
print(f"- completion 추정: {completion_ratio:.1f}%")
print(f"- warning에서 실제 실패 비율: {notify_ratio:.1f}%")
print("- next_action: 핵심 실패 원인 1개, 조치 1개, 다음 블록 계획 1개 기록")
print()

print("=== 단기 루프 후보(반복 패턴) ===")
for combo, c in tool_combo_counter.most_common(top_n):
    if c >= 2:
        print(f"- {combo} : {c}")
print()

print("=== 권장 운영 체크리스트 ===")
print("1) 단일 세션에서 read/list/rg를 각각 분리 실행하지 말고, read+filter를 한 번에 묶어 실행")
print("2) 경고는 '실패성(warn+failure 키워드)'과 '알림성'을 구분해 누적 임계치 관리")
print("3) 작업 전 settings.local + .mcp.json approval_policy 동기화")
print("4) 작업 종료 후, 위 템플릿을 그대로 붙여 남기기(완료율/실패 원인/완료 여부)")
PY

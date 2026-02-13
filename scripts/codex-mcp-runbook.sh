#!/usr/bin/env bash
set -euo pipefail

LOG_PATH="${1:-$HOME/.codex/log/codex-tui.log}"
TOP_N="${2:-15}"

echo "### 0) CLI 환경 검증"
codex --version
echo

echo "### 1) Settings 동기화 검증"
python3 - "$HOME" "$PWD" <<'PY'
import json
import sys
from pathlib import Path

home = Path(sys.argv[1])
cwd = Path(sys.argv[2])

issues = []

def pick_existing(paths):
  for p in paths:
    if p.exists():
      return p
  return None

settings_candidates = [
  cwd / ".claude" / "settings.local.json",
  cwd / ".codex" / "settings.local.json",
  cwd / "settings.local.json",
  home / ".claude" / "settings.local.json",
  home / ".codex" / "settings.local.json",
]
mcp_candidates = [
  cwd / ".mcp.json",
  cwd / ".codex" / ".mcp.json",
  cwd / ".claude" / ".mcp.json",
  home / ".claude" / ".mcp.json",
  home / ".codex" / ".mcp.json",
]

settings_path = pick_existing(settings_candidates)
mcp_path = pick_existing(mcp_candidates)

if settings_path is None:
  issues.append("settings.local.json not found in candidate paths")
  settings = {}
else:
  try:
    with open(settings_path, "r", encoding="utf-8") as f:
      settings = json.load(f)
  except Exception as e:
    issues.append(f"settings.local.json read error: {e}")
    settings = {}

permissions = []
if isinstance(settings, dict):
  perm_obj = settings.get("permissions", {})
  if isinstance(perm_obj, dict):
    permissions = perm_obj.get("allow", [])
  elif isinstance(perm_obj, list):
    permissions = perm_obj

required = {
  "Read",
  "Write",
  "Edit",
  "Bash(codex exec*)",
  "Bash(pnpm dev:*)",
  "Bash(pnpm test:*)",
  "Bash(pnpm typecheck:*)",
  "Bash(pnpm build:*)",
  "Bash(pnpm install:*)",
  "Bash(pnpm exec*)",
  "Bash(pnpm lint:*)",
  "Bash(grep:*)",
  "Bash(ls:*)",
  "Bash(git status:*)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
  "mcp__codex-spark__codex",
  "mcp__codex-spark__codex-reply",
}
missing = sorted(required - set(permissions)) if isinstance(permissions, list) else sorted(required)
if missing:
  issues.append(f"settings.local missing permissions: {', '.join(missing)}")

if mcp_path is None:
  issues.append(".mcp.json not found in candidate paths")
  mcp = {}
else:
  try:
    with open(mcp_path, "r", encoding="utf-8") as f:
      mcp = json.load(f)
  except Exception as e:
    issues.append(f".mcp.json read error: {e}")
    mcp = {}

policy = None
if isinstance(mcp, dict):
  servers = mcp.get("mcpServers", {})
  if isinstance(servers, dict):
    for server_name, server_cfg in servers.items():
      args = server_cfg.get("args", []) if isinstance(server_cfg, dict) else []
      if isinstance(args, list):
        for i in range(len(args)):
          token = str(args[i]).strip()
          if token.startswith("approval_policy"):
            if "=" in token:
              policy = token.split("=", 1)[1].strip().strip('"')
              break
          elif token == "-c" and i + 1 < len(args):
            next_token = str(args[i + 1]).strip()
            if next_token.startswith("approval_policy") and "=" in next_token:
              policy = next_token.split("=", 1)[1].strip().strip('"')
              break
        if policy is not None:
          break

if policy != "on-request":
  issues.append(f"approval_policy mismatch: {policy!r} (expected 'on-request')")

if issues:
  print("[FAIL]")
  for i in issues:
    print(f"- {i}")
  raise SystemExit(1)

print("[PASS] Codex MCP sync ok")
print(f"  settings.local.json: {settings_path}")
print(f"  .mcp.json: {mcp_path}")
PY

echo
echo "### 2) MCP 효율 리포트"
bash "$(dirname "$0")/codex-mcp-efficiency.sh" "$LOG_PATH" "$TOP_N"

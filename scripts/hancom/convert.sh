#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF' >&2
Usage:
  bash scripts/hancom/convert.sh pdf  <in.hwp|in.hwpx> <out.pdf>
  bash scripts/hancom/convert.sh text <in.hwp|in.hwpx> <out.txt>

Env:
  HANCOM_BIN_WIN  Windows Hancom bin directory.
                 Default: C:\Progra~2\HNC\OFFICE~2\HOffice130\Bin
EOF
}

cmd="${1:-}"
in_path="${2:-}"
out_path="${3:-}"

if [[ -z "${cmd}" || -z "${in_path}" || -z "${out_path}" ]]; then
  usage
  exit 2
fi

hancom_bin_win="${HANCOM_BIN_WIN:-C:\\Progra~2\\HNC\\OFFICE~2\\HOffice130\\Bin}"
hancom_pdf_exe_win="${hancom_bin_win}\\HpdfHwpConverter.exe"
hancom_pdf_driver_setup_win="C:\\Progra~2\\HNC\\OFFICE~2\\HncUtils\\HancomPDF\\SetupDriver.exe"

to_win_path() {
  local p="$1"
  if [[ "$p" =~ ^[A-Za-z]:\\ ]]; then
    printf '%s' "$p"
    return 0
  fi
  if [[ "$p" =~ ^\\\\\\\\ ]]; then
    printf '%s' "$p"
    return 0
  fi
  wslpath -w "$p"
}

ensure_pdftotext() {
  if command -v pdftotext >/dev/null 2>&1; then
    return 0
  fi
  cat <<'EOF' >&2
[ERROR] pdftotext not found (needed for HWP -> text fallback).

Install in WSL:
  sudo apt-get update
  sudo apt-get install -y poppler-utils
EOF
  return 2
}

check_hancom_pdf_printer() {
  # Hancom PDF converter commonly relies on the Hancom PDF virtual printer/driver.
  # If missing, conversions often "succeed" but produce 0-byte output.
  local printers
  printers="$(powershell.exe -NoProfile -Command 'Get-Printer | Select-Object -ExpandProperty Name' 2>/dev/null || true)"
  if echo "$printers" | rg -q "(?i)hancom\\s*pdf|한컴\\s*pdf"; then
    return 0
  fi

  cat <<EOF >&2
[ERROR] Hancom PDF printer/driver not detected.

Install the Hancom PDF driver (run as Administrator in Windows):
  ${hancom_pdf_driver_setup_win}

After installing, re-run:
  bash scripts/hancom/convert.sh pdf "<input>" "<output.pdf>"
EOF
  return 2
}

convert_pdf() {
  local in_linux="$1"
  local out_linux="$2"

  local in_win
  local out_win
  in_win="$(to_win_path "$in_linux")"
  out_win="$(to_win_path "$out_linux")"

  mkdir -p "$(dirname "$out_linux")"
  check_hancom_pdf_printer
  cmd.exe /c "$hancom_pdf_exe_win" "$in_win" "$out_win" >/dev/null 2>&1 || true

  if [[ ! -f "$out_linux" ]]; then
    echo "[ERROR] PDF was not created: $out_linux" >&2
    echo "  Tried: $hancom_pdf_exe_win" >&2
    exit 2
  fi

  local size
  size="$(wc -c <"$out_linux" | tr -d ' ')"
  if [[ "$size" -le 0 ]]; then
    echo "[ERROR] PDF is empty (0 bytes): $out_linux" >&2
    echo "  This usually means the Hancom converter failed silently." >&2
    echo "  Check that the Hancom PDF driver is installed: $hancom_pdf_driver_setup_win" >&2
    rm -f "$out_linux" || true
    exit 2
  fi
}

case "$cmd" in
  pdf)
    convert_pdf "$in_path" "$out_path"
    ;;
  text)
    ext="${in_path##*.}"
    ext="${ext,,}"
    if [[ "$ext" == "hwpx" ]]; then
      python3 scripts/hancom/hwpx_to_text.py --in "$in_path" --out "$out_path"
      exit 0
    fi

    tmp_pdf="$(mktemp -u).pdf"
    convert_pdf "$in_path" "$tmp_pdf"

    ensure_pdftotext
    mkdir -p "$(dirname "$out_path")"
    pdftotext "$tmp_pdf" "$out_path"
    rm -f "$tmp_pdf"
    ;;
  *)
    usage
    exit 2
    ;;
esac

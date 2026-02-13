# Automation Runbook (Local)

## Hancom (HWP/HWPX) Convert

Goal: convert HWP/HWPX to PDF and plain text using the locally installed Hancom Office engine on Windows.

### Prerequisites

- Hancom Office installed (this PC has it under `C:\Program Files (x86)\HNC\Office 2024\...`)
- Hancom PDF driver installed (Administrator required):
  - `C:\Program Files (x86)\HNC\Office 2024\HncUtils\HancomPDF\SetupDriver.exe`
- For text extraction from PDFs in WSL:
  - `sudo apt-get update && sudo apt-get install -y poppler-utils`

### Usage (WSL)

- PDF:
  - `bash scripts/hancom/convert.sh pdf ./input.hwp ./output.pdf`
  - `bash scripts/hancom/convert.sh pdf ./input.hwpx ./output.pdf`
- Text:
  - `bash scripts/hancom/convert.sh text ./input.hwpx ./output.txt`
  - `bash scripts/hancom/convert.sh text ./input.hwp ./output.txt`

### Troubleshooting

- Output PDF is `0 bytes`:
  - Usually means Hancom PDF driver is missing or broken.
  - Install/repair: `...\HancomPDF\SetupDriver.exe` (run as Administrator).
- Converter exit code is always `0`:
  - Treat as unreliable; verify output file size (the wrapper script does this).

References:

- `scripts/hancom/README.md`
- `scripts/hancom/convert.sh`

## Emulator (API)

- Start emulator (auto port selection if `PORT` is occupied):
  - `PORT=4000 pnpm emulator`
- Force exact port (fail if occupied):
  - `EMULATOR_FORCE_PORT=1 PORT=4000 pnpm emulator`

What it does:

- Loads `.env.local` if present
- Attempts `docker-compose up -d` in WSL
- If WSL Docker is not connected, falls back to Windows `docker-compose.exe`
- Starts API via `pnpm dev:api`

Reference:

- `scripts/run-emulator.sh`

## Codex/Claude (Ops)

- MCP sync + efficiency report:
  - `bash scripts/codex-mcp-runbook.sh ~/.codex/log/codex-tui.log 15`

Reference:

- `scripts/codex-mcp-runbook.sh`
- `scripts/codex-mcp-efficiency.sh`

## Grants (예비창업자 지원사업 크롤링)

Primary source: Bizinfo (기업마당) OpenAPI.

### Prerequisites

- Bizinfo OpenAPI service key (`crtfcKey`).
- Set one env var (either works): `BIZINFO_CRTFC_KEY=...` or `BIZINFO_API_KEY=...`.

### Usage (WSL)

Quick crawl (pre-startup only, JSON + Markdown digest):

```bash
BIZINFO_CRTFC_KEY=... pnpm grants:prestartup
```

Full crawl (also downloads attachments + best-effort text extraction):

```bash
BIZINFO_CRTFC_KEY=... pnpm grants:prestartup:full
```

Custom run (pass flags through pnpm with `--`):

```bash
BIZINFO_CRTFC_KEY=... pnpm grants:bizinfo -- --pre-startup-only 1 --maxPages 10 --sleepMs 200 --out docs/generated/grants/custom.json --md docs/generated/grants/custom.md
```

Key options (see `--help` for full list):

- `--maxPages <n>`: fetch multiple pages (deduped by `pblancId`).
- `--downloadDir <path>`: download Bizinfo attachment candidates (`printFlpthNm` + `printFileNm`) into per-item folders.
- `--extractText <0|1>`: extract `.hwpx` / `.pdf` / `.hwp` to `.txt` (best-effort).
- `--sleepMs <n>`: delay between page fetches.
- `--include-closed <0|1>`: include already-closed programs (default: `0` = exclude closed).

Notes on text extraction:

- `.pdf` extraction requires `pdftotext` in WSL (`poppler-utils`).
- `.hwp` extraction requires Hancom PDF driver installed on Windows (Administrator required). See Hancom section above.

Optional filters:

- Startup category: `--searchLclasId 06`
- Hashtags: `--hashtags "창업,서울"`

Reference:

- `scripts/grants/crawl-bizinfo.ts`

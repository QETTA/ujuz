import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

type Json = Record<string, unknown>;

interface BizinfoItem {
  pblancId?: string;
  pblancNm?: string;
  pblancUrl?: string;
  jrsdInsttNm?: string;
  trgetNm?: string;
  bsnsSumryCn?: string;
  reqstBeginEndDe?: string;
  reqstMthPapersCn?: string;
  inqcnt?: string;
  printFlpthNm?: string;
  printFileNm?: string;
}

interface Attachment {
  kind: 'print';
  url: string;
  filename: string;
  downloaded_path: string | null;
  bytes: number | null;
  text_path: string | null;
  error: string | null;
}

interface NormalizedProgram {
  source: 'bizinfo';
  source_id: string;
  title: string;
  url: string;
  agency: string | null;
  target_text: string | null;
  summary: string | null;
  apply_start: string | null; // YYYY-MM-DD
  apply_end: string | null; // YYYY-MM-DD
  raw_apply_period: string | null;
  pre_startup: boolean;
  match: { score: number; reasons: string[] };
  attachments: Attachment[];
}

interface CrawlResult {
  meta: {
    source: 'bizinfo';
    fetched_at: string;
    query: Record<string, string | number | boolean | null>;
  };
  items: NormalizedProgram[];
}

function usage(): never {
  // Keep this short; this is a script, not a CLI framework.
  console.error(
    [
      'Usage:',
      '  pnpm exec tsx scripts/grants/crawl-bizinfo.ts --key <BIZINFO_CRTFC_KEY> [options]',
      '',
      'Options:',
      '  --key <key>                 Bizinfo OpenAPI service key (or env BIZINFO_CRTFC_KEY / BIZINFO_API_KEY)',
      '  --pageUnit <n>              Page size (default: 50)',
      '  --pageIndex <n>             Page index (default: 1)',
      '  --maxPages <n>              Max pages to fetch (default: 1)',
      '  --searchLclasId <id>        Field category (default: 06 (startup))',
      '  --hashtags <csv>            Optional hashtag filter (e.g. "창업,서울")',
      '  --pre-startup-only <0|1>    Filter to pre-startup eligible only (default: 1)',
      '  --include-closed <0|1>      Include closed programs (default: 0)',
      '  --downloadDir <path>        Download attachments into this dir (optional)',
      '  --extractText <0|1>         Extract text for downloaded files (default: 0)',
      '  --sleepMs <n>               Sleep between pages (default: 0)',
      '  --out <path>                Write JSON output to file (default: stdout)',
      '  --md <path>                 Write Markdown digest to file (optional)',
    ].join('\n'),
  );
  process.exit(2);
}

function readFlag(argv: string[], name: string): string | null {
  const idx = argv.indexOf(name);
  if (idx === -1) return null;
  const val = argv[idx + 1];
  if (!val || val.startsWith('--')) return '';
  return val;
}

function readBoolFlag(argv: string[], name: string, def: boolean): boolean {
  const raw = readFlag(argv, name);
  if (raw === null) return def;
  if (raw === '' || raw === '1' || raw.toLowerCase() === 'true') return true;
  if (raw === '0' || raw.toLowerCase() === 'false') return false;
  return def;
}

function delay(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeDirName(input: string): string {
  const s = input.trim();
  if (!s) return 'unknown';
  return s.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 96) || 'unknown';
}

function urlJoin(base: string, path: string): string {
  if (!base.endsWith('/') && !path.startsWith('/')) return `${base}/${path}`;
  if (base.endsWith('/') && path.startsWith('/')) return `${base}${path.slice(1)}`;
  return `${base}${path}`;
}

function buildAttachmentUrl(printFlpthNm?: string, printFileNm?: string): { url: string; filename: string } | null {
  const rawPath = (printFlpthNm ?? '').trim();
  const rawName = (printFileNm ?? '').trim();
  if (!rawPath && !rawName) return null;

  let url = rawPath;
  if (!url) return null;

  if (url.startsWith('//')) url = `https:${url}`;
  if (!/^https?:\/\//i.test(url)) {
    url = url.startsWith('/') ? `https://www.bizinfo.go.kr${url}` : `https://www.bizinfo.go.kr/${url}`;
  }

  if (rawName) {
    const lowerUrl = url.toLowerCase();
    const lowerName = rawName.toLowerCase();
    if (!lowerUrl.endsWith(lowerName)) {
      url = urlJoin(url, encodeURIComponent(rawName));
    }
  }

  const filenameFromName = rawName || '';
  const filenameFromUrl = (() => {
    try {
      const u = new URL(url);
      const last = u.pathname.split('/').filter(Boolean).slice(-1)[0] ?? '';
      return decodeURIComponent(last);
    } catch {
      return '';
    }
  })();

  const filename = (filenameFromName || filenameFromUrl || 'attachment').replace(/[\\/:*?"<>|]/g, '_');
  return { url, filename };
}

async function downloadFile(url: string, outPath: string): Promise<{ bytes: number }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'ujuz-grants/0.1 (local)',
      Accept: '*/*',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, buf);
  return { bytes: buf.byteLength };
}

async function run(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return await new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += String(d)));
    child.stderr.on('data', (d) => (stderr += String(d)));
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function toYmd(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // YYYY.MM.DD
  const dot = s.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (dot) return `${dot[1]}-${dot[2]}-${dot[3]}`;

  return null;
}

function parseApplyPeriod(period: string | undefined): {
  start: string | null;
  end: string | null;
  raw: string | null;
} {
  if (!period) return { start: null, end: null, raw: null };
  const raw = period.trim();
  if (!raw) return { start: null, end: null, raw: null };

  // Examples seen in Bizinfo: "20190705 ~ 20190808"
  const matches = raw.match(/\d{8}|\d{4}-\d{2}-\d{2}|\d{4}\.\d{2}\.\d{2}/g) ?? [];
  const start = matches[0] ? toYmd(matches[0]) : null;
  const end = matches[1] ? toYmd(matches[1]) : null;
  return { start, end, raw };
}

function todayYmdInKst(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const map = new Map(parts.map((p) => [p.type, p.value]));
  const y = map.get('year') ?? '1970';
  const m = map.get('month') ?? '01';
  const d = map.get('day') ?? '01';
  return `${y}-${m}-${d}`;
}

function isClosedProgram(item: NormalizedProgram, todayYmdKst: string): boolean {
  // Primary: end date strictly before "today" in Asia/Seoul means closed.
  if (item.apply_end && item.apply_end < todayYmdKst) return true;

  // Fallback for missing/unknown dates.
  const raw = (item.raw_apply_period ?? '').replace(/\s+/g, '');
  if (raw && /(상시|수시|예산소진)/.test(raw)) return false;

  const title = item.title.replace(/\s+/g, '');
  const combined = `${title} ${raw}`;
  const looksClosed =
    /(\[마감\]|\(마감\)|접수마감|모집마감|접수종료|모집종료|공고종료|종료)\b?/.test(combined) &&
    !/임박/.test(combined);
  return Boolean(looksClosed);
}

function compactText(value: string | undefined): string {
  const s = (value ?? '').replace(/\s+/g, ' ').trim();
  return s;
}

function matchPreStartup(text: string): { preStartup: boolean; score: number; reasons: string[] } {
  const hay = text;
  const reasons: string[] = [];
  let score = 0;
  let explicitPositive = false;
  let strongNegative = false;

  const rules: Array<{ re: RegExp; add: number; reason: string }> = [
    { re: /예비\s*창업자/g, add: 4, reason: 'contains "예비창업자"' },
    { re: /예비\s*창업/gi, add: 3, reason: 'contains "예비창업"' },
    { re: /창업\s*예정(자)?/g, add: 2, reason: 'mentions "창업 예정(자)"' },
    { re: /사업자\s*등록\s*(전|이전|미등록)/g, add: 3, reason: 'mentions "사업자등록 전/이전/미등록"' },
    { re: /사업자\s*(등록|등록을)\s*(하지\s*)?않/g, add: 2, reason: 'mentions "사업자등록을 하지 않"' },
    { re: /창업\s*경험\s*없/g, add: 2, reason: 'mentions "창업 경험 없음"' },
    { re: /미\s*창업자/g, add: 2, reason: 'mentions "미창업자"' },
  ];

  for (const r of rules) {
    if (r.re.test(hay)) {
      score += r.add;
      reasons.push(r.reason);
      explicitPositive = true;
    }
  }

  // Strong negatives: if these exist, exclude from "pre-startup eligible" even when positive terms exist.
  const strongNegatives: Array<{ re: RegExp; sub: number; reason: string }> = [
    { re: /사업자\s*등록\s*(필수|완료|후|이후)/g, sub: 5, reason: 'mentions "사업자등록 필수/완료/후/이후"' },
    { re: /사업자\s*등록증/g, sub: 4, reason: 'mentions "사업자등록증"' },
    { re: /기\s*창업자/g, sub: 4, reason: 'mentions "기창업자"' },
    { re: /창업\s*기업/g, sub: 3, reason: 'mentions "창업기업"' },
    { re: /업력\s*\d+\s*(년|개월)/g, sub: 3, reason: 'mentions "업력 N년/개월"' },
    { re: /매출\s*액|매출액/g, sub: 2, reason: 'mentions "매출액"' },
    { re: /재무\s*제표|부가세|4대\s*보험|고용\s*보험/g, sub: 2, reason: 'mentions "재무/세무/보험 서류" (existing business)' },
  ];
  for (const n of strongNegatives) {
    if (n.re.test(hay)) {
      score -= n.sub;
      reasons.push(n.reason);
      strongNegative = true;
    }
  }

  // Weak negatives: informational; does not disqualify by itself (pre-startup may be included together).
  const weakNegatives: Array<{ re: RegExp; sub: number; reason: string }> = [
    { re: /창업\s*\d+\s*년\s*이내/g, sub: 1, reason: 'mentions "창업 N년 이내" (startup, may include pre-startup as well)' },
  ];
  for (const n of weakNegatives) {
    if (n.re.test(hay)) {
      score -= n.sub;
      reasons.push(n.reason);
    }
  }

  if (score < 0) score = 0;

  // Strict classification: require explicit positive signals and no strong-negative signals.
  const preStartup = explicitPositive && !strongNegative;
  return { preStartup, score, reasons: Array.from(new Set(reasons)) };
}

function normalizeBizinfoItem(item: BizinfoItem): NormalizedProgram | null {
  const title = compactText(item.pblancNm);
  const url = compactText(item.pblancUrl);
  if (!title || !url) return null;

  const sourceId = compactText(item.pblancId) || url;
  const agency = compactText(item.jrsdInsttNm) || null;
  const targetText = compactText(item.trgetNm) || null;
  const summary = compactText(item.bsnsSumryCn) || null;
  const apply = parseApplyPeriod(item.reqstBeginEndDe);
  const printAttachment = buildAttachmentUrl(item.printFlpthNm, item.printFileNm);
  const attachments: Attachment[] = printAttachment
    ? [
        {
          kind: 'print',
          url: printAttachment.url,
          filename: printAttachment.filename,
          downloaded_path: null,
          bytes: null,
          text_path: null,
          error: null,
        },
      ]
    : [];

  const classifierText = [
    title,
    agency ?? '',
    targetText ?? '',
    summary ?? '',
    compactText(item.reqstMthPapersCn),
  ]
    .join(' ')
    .trim();
  const match = matchPreStartup(classifierText);

  return {
    source: 'bizinfo',
    source_id: sourceId,
    title,
    url,
    agency,
    target_text: targetText,
    summary,
    apply_start: apply.start,
    apply_end: apply.end,
    raw_apply_period: apply.raw,
    pre_startup: match.preStartup,
    match: { score: match.score, reasons: match.reasons },
    attachments,
  };
}

function toArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  return [value as T];
}

function buildBizinfoUrl(params: Record<string, string>): string {
  const base = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do';
  const usp = new URLSearchParams(params);
  return `${base}?${usp.toString()}`;
}

function writeFile(path: string, content: string): void {
  const abs = resolve(path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf-8');
}

function renderMarkdownDigest(result: CrawlResult): string {
  const lines: string[] = [];
  lines.push(`# 지원사업 크롤링 (예비창업자)`);
  lines.push('');
  lines.push(`- Source: \`${result.meta.source}\``);
  lines.push(`- Fetched at: \`${result.meta.fetched_at}\``);
  lines.push(`- Items: \`${result.items.length}\``);
  lines.push('');
  lines.push('## Items');
  lines.push('');

  for (const item of result.items) {
    const computedPeriod = [item.apply_start, item.apply_end].filter(Boolean).join(' ~ ');
    const period = item.raw_apply_period ?? (computedPeriod || 'N/A');
    lines.push(`- ${item.title}`);
    lines.push(`  - Agency: ${item.agency ?? 'N/A'}`);
    lines.push(`  - Period: ${period}`);
    if (item.target_text) lines.push(`  - Target: ${item.target_text}`);
    if (item.summary) lines.push(`  - Summary: ${item.summary}`);
    lines.push(`  - URL: ${item.url}`);
  }

  lines.push('');
  return lines.join('\n');
}

async function fetchBizinfoPage(params: Record<string, string>): Promise<BizinfoItem[]> {
  const url = buildBizinfoUrl(params);
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bizinfo API HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as Json;
  const jsonArray = (json.jsonArray ?? {}) as Json;
  const itemsRaw = toArray<BizinfoItem>(jsonArray.item);
  return itemsRaw;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) usage();

  const key = readFlag(argv, '--key') || process.env.BIZINFO_CRTFC_KEY || process.env.BIZINFO_API_KEY;
  if (!key) {
    console.error('[ERROR] Missing API key. Use --key or env BIZINFO_CRTFC_KEY / BIZINFO_API_KEY.');
    usage();
  }

  const pageUnit = Number(readFlag(argv, '--pageUnit') ?? '50');
  const pageIndex = Number(readFlag(argv, '--pageIndex') ?? '1');
  const maxPages = Number(readFlag(argv, '--maxPages') ?? '1');
  const searchLclasId = readFlag(argv, '--searchLclasId') ?? '06';
  const hashtags = readFlag(argv, '--hashtags') ?? '';
  const preStartupOnly = readBoolFlag(argv, '--pre-startup-only', true);
  const includeClosed = readBoolFlag(argv, '--include-closed', false);
  const downloadDir = readFlag(argv, '--downloadDir') ?? '';
  const extractText = readBoolFlag(argv, '--extractText', false);
  const sleepMs = Number(readFlag(argv, '--sleepMs') ?? '0');
  const outPath = readFlag(argv, '--out');
  const mdPath = readFlag(argv, '--md');

  const queryParams: Record<string, string> = {
    crtfcKey: key,
    dataType: 'json',
    pageUnit: String(Number.isFinite(pageUnit) && pageUnit > 0 ? pageUnit : 50),
    pageIndex: String(Number.isFinite(pageIndex) && pageIndex > 0 ? pageIndex : 1),
  };
  if (searchLclasId) queryParams.searchLclasId = searchLclasId;
  if (hashtags) queryParams.hashtags = hashtags;

  const itemsRaw: BizinfoItem[] = [];
  const startPage = Number.isFinite(pageIndex) && pageIndex > 0 ? pageIndex : 1;
  const pages = Number.isFinite(maxPages) && maxPages > 0 ? Math.floor(maxPages) : 1;

  for (let i = 0; i < pages; i++) {
    queryParams.pageIndex = String(startPage + i);
    const pageItems = await fetchBizinfoPage(queryParams);
    if (pageItems.length === 0) break;
    itemsRaw.push(...pageItems);
    if (i < pages - 1) await delay(sleepMs);
  }

  const normalized: NormalizedProgram[] = [];
  const todayKst = todayYmdInKst();
  for (const raw of itemsRaw) {
    const item = normalizeBizinfoItem(raw);
    if (!item) continue;
    if (!includeClosed && isClosedProgram(item, todayKst)) continue;
    if (preStartupOnly && !item.pre_startup) continue;
    normalized.push(item);
  }

  // Deduplicate by source_id.
  const byId = new Map<string, NormalizedProgram>();
  for (const item of normalized) {
    if (!byId.has(item.source_id)) byId.set(item.source_id, item);
  }
  const deduped = Array.from(byId.values());

  if (downloadDir) {
    for (const item of deduped) {
      if (item.attachments.length === 0) continue;
      const itemDir = resolve(downloadDir, item.source, safeDirName(item.source_id));
      mkdirSync(itemDir, { recursive: true });

      for (let i = 0; i < item.attachments.length; i++) {
        const att = item.attachments[i];
        const outFile = resolve(itemDir, att.filename || `attachment_${i + 1}`);
        try {
          const { bytes } = await downloadFile(att.url, outFile);
          att.downloaded_path = outFile;
          att.bytes = bytes;

          if (extractText) {
            const ext = extname(outFile).toLowerCase();
            const outTxt = outFile.replace(/\.[^.]+$/, '') + '.txt';
            if (ext === '.hwpx') {
              const r = await run('python3', ['scripts/hancom/hwpx_to_text.py', '--in', outFile, '--out', outTxt]);
              if (r.code !== 0) throw new Error(r.stderr.trim() || r.stdout.trim() || `exit ${r.code}`);
              att.text_path = outTxt;
            } else if (ext === '.pdf') {
              const r = await run('pdftotext', [outFile, outTxt]);
              if (r.code !== 0) throw new Error(r.stderr.trim() || r.stdout.trim() || `exit ${r.code}`);
              att.text_path = outTxt;
            } else if (ext === '.hwp') {
              const r = await run('bash', ['scripts/hancom/convert.sh', 'text', outFile, outTxt]);
              if (r.code !== 0) throw new Error(r.stderr.trim() || r.stdout.trim() || `exit ${r.code}`);
              att.text_path = outTxt;
            }
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          att.error = msg.slice(0, 400);
        }
      }
    }
  }

  const result: CrawlResult = {
    meta: {
      source: 'bizinfo',
      fetched_at: new Date().toISOString(),
      query: {
        pageUnit,
        pageIndex,
        maxPages: pages,
        searchLclasId,
        hashtags: hashtags || null,
        preStartupOnly,
        includeClosed,
        todayKst,
        downloadDir: downloadDir || null,
        extractText,
        sleepMs: Number.isFinite(sleepMs) ? sleepMs : 0,
      },
    },
    items: deduped,
  };

  const outJson = JSON.stringify(result, null, 2);
  if (outPath) writeFile(outPath, outJson);
  else process.stdout.write(outJson + '\n');

  if (mdPath) {
    const md = renderMarkdownDigest(result);
    writeFile(mdPath, md);
  }
}

void main().catch((error) => {
  console.error('[crawl-bizinfo] failed:', error);
  process.exit(1);
});

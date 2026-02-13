import { logger } from './logger';

// ── Input Sanitization ──────────────────────────────────

/** Known prompt injection patterns */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/i,
  /you\s+are\s+now\s+(a|an|the)\s+/i,
  /system\s*:\s*/i,
  /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/i,
  /do\s+not\s+follow\s+(any|the)\s+(previous|above)/i,
  /forget\s+(everything|all|your)/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+(if|though)\s+you/i,
  /override\s+(your|the|all)\s+(instructions?|rules?|guidelines?)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
];

/** Characters that could break prompt structure */
const DANGEROUS_CHARS = /[<>{}[\]`]/g;

/**
 * Sanitize user input: detect prompt injection and strip dangerous characters.
 * Returns { safe: boolean, sanitized: string, reason?: string }
 */
export function sanitizeInput(input: string): { safe: boolean; sanitized: string; reason?: string } {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      logger.warn('Prompt injection detected', { pattern: pattern.source });
      return { safe: false, sanitized: '', reason: 'prompt_injection_detected' };
    }
  }

  const sanitized = input.replace(DANGEROUS_CHARS, '');
  return { safe: true, sanitized };
}

// ── Output Sanitization ──────────────────────────────────

/** Patterns that should never appear in output */
const OUTPUT_BLOCKLIST: RegExp[] = [
  /sk-ant-api[0-9a-zA-Z_-]+/i,       // Anthropic API keys
  /sk-[a-zA-Z0-9]{20,}/i,             // OpenAI-style keys
  /ANTHROPIC_API_KEY\s*[:=]/i,
  /process\.env\./i,
  /system\s+prompt\s*[:=]/i,
  /\b(password|secret_key|api_key)\s*[:=]\s*\S+/i,
];

/**
 * Check output for leaked secrets or system information.
 * Returns { safe: boolean, cleaned: string }
 */
export function checkOutput(output: string): { safe: boolean; cleaned: string } {
  let cleaned = output;
  let hasLeak = false;

  for (const pattern of OUTPUT_BLOCKLIST) {
    if (pattern.test(cleaned)) {
      hasLeak = true;
      cleaned = cleaned.replace(pattern, '[REDACTED]');
    }
  }

  if (hasLeak) {
    logger.warn('Output contained sensitive data — redacted');
  }

  return { safe: !hasLeak, cleaned };
}

// ── Off-Topic Detection ──────────────────────────────────

const ALLOWED_TOPICS = [
  /어린이집|유치원|보육|육아|아이|아기|유아|아동/,
  /입소|입학|대기|순위|TO|티오/,
  /추천|비교|평가|리뷰/,
  /점수|확률|예측/,
  /지역|시설|원비|비용/,
  /구독|요금|플랜|결제/,
  /알림|푸시|설정/,
  /도움|사용법|기능/,
];

/**
 * Check if the query is within UjuZ's scope (childcare/daycare domain).
 */
export function isOffTopic(query: string): boolean {
  return !ALLOWED_TOPICS.some((pattern) => pattern.test(query));
}

/**
 * Standard off-topic response.
 */
export function offTopicResponse(): string {
  return '죄송합니다. 저는 어린이집·유치원 입소 및 보육 관련 질문에 특화된 AI 어시스턴트입니다. 보육 관련 궁금한 점이 있으시면 편하게 물어봐 주세요!';
}

// ── Limit Exceeded Message ──────────────────────────────

/**
 * User-friendly message when feature usage limit is reached.
 */
export function formatLimitExceededMessage(feature: string, tier: string): string {
  const featureNames: Record<string, string> = {
    admission_calc: '입학 점수 계산',
    explain: 'AI 상담',
    to_alerts_slots: 'TO 알림 시설',
    community_write: '커뮤니티 글쓰기',
  };

  const name = featureNames[feature] ?? feature;

  if (tier === 'free') {
    return `무료 플랜의 ${name} 이용 한도에 도달했습니다. 더 많은 기능을 이용하려면 베이직 플랜으로 업그레이드해 주세요!`;
  }

  return `${name} 이용 한도에 도달했습니다. 한도 초기화 후 다시 이용해 주세요. 프리미엄 플랜에서는 더 넉넉한 한도를 제공합니다.`;
}

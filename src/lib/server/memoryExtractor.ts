/**
 * UJUz - Rule-based Memory Extractor
 * 정규식으로 사용자 메시지에서 핵심 정보를 추출한다.
 * 순수 함수 — 네트워크/DB 의존 없음.
 */

import { REGION_DEFS } from './regions';

// ── Types ────────────────────────────────────────────────

export interface ExtractedMemory {
  memoryKey: string;
  value: string;
  tags: string[];
}

// ── Pattern definitions ──────────────────────────────────

const CHILD_AGE_YEARS_RE = /(?:아이|아기|애|우리\s*아이|둘째|첫째|막내)(?:가|는|이)?\s*(?:지금|현재|올해)?\s*(\d{1,2})\s*살/;
const CHILD_AGE_MONTHS_RE = /(\d{1,3})\s*개월\s*(?:된|짜리|아이|아기)?/;
const PRIORITY_TYPES: { pattern: RegExp; value: string }[] = [
  { pattern: /맞벌이/, value: '맞벌이' },
  { pattern: /한부모/, value: '한부모' },
  { pattern: /다자녀/, value: '다자녀' },
  { pattern: /다문화/, value: '다문화' },
  { pattern: /장애\s*(?:아|아동|아이|영유아)/, value: '장애아' },
  { pattern: /국가유공/, value: '국가유공자' },
];
const FACILITY_NAME_RE = /([가-힣]{2,10}(?:어린이집|유치원))/;
const DESIRED_TIMING_RE = /(\d{1,2})\s*월\s*(?:에?\s*)?(?:입소|입학|등원)/;
const GENERAL_REGION_RE = /([가-힣]{1,4}(?:구|시|동))(?:에|에서|으로)?\s*(?:살|거주|이사|있|찾)/;

// ── Extraction logic ─────────────────────────────────────

export function extractMemoriesFromMessage(message: string): ExtractedMemory[] {
  const results: ExtractedMemory[] = [];
  const TAG = 'chat_extracted';

  // 아이 나이 (살)
  const ageYearsMatch = message.match(CHILD_AGE_YEARS_RE);
  if (ageYearsMatch) {
    const age = parseInt(ageYearsMatch[1], 10);
    if (age >= 0 && age <= 13) {
      results.push({
        memoryKey: 'chat_child_age',
        value: `${age}살`,
        tags: [TAG],
      });
    }
  }

  // 아이 나이 (개월)
  const ageMonthsMatch = message.match(CHILD_AGE_MONTHS_RE);
  if (ageMonthsMatch) {
    const months = parseInt(ageMonthsMatch[1], 10);
    if (months >= 1 && months <= 84) {
      results.push({
        memoryKey: 'chat_child_age_months',
        value: `${months}개월`,
        tags: [TAG],
      });
    }
  }

  // 우선순위 유형
  for (const pt of PRIORITY_TYPES) {
    if (pt.pattern.test(message)) {
      results.push({
        memoryKey: 'chat_priority_type',
        value: pt.value,
        tags: [TAG],
      });
      break;
    }
  }

  // 시설명
  const facilityMatch = message.match(FACILITY_NAME_RE);
  if (facilityMatch) {
    results.push({
      memoryKey: 'chat_facility_interest',
      value: facilityMatch[1],
      tags: [TAG],
    });
  }

  // 입소 시기
  const timingMatch = message.match(DESIRED_TIMING_RE);
  if (timingMatch) {
    const month = parseInt(timingMatch[1], 10);
    if (month >= 1 && month <= 12) {
      results.push({
        memoryKey: 'chat_desired_timing',
        value: `${month}월 입소`,
        tags: [TAG],
      });
    }
  }

  // 지역 — REGION_DEFS 키워드 우선
  let regionFound = false;
  for (const regionDef of REGION_DEFS) {
    for (const kw of regionDef.keywords) {
      if (message.includes(kw)) {
        results.push({
          memoryKey: 'chat_region',
          value: regionDef.label,
          tags: [TAG],
        });
        regionFound = true;
        break;
      }
    }
    if (regionFound) break;
  }

  // 지역 — 일반 패턴 (구/시/동) fallback
  if (!regionFound) {
    const regionMatch = message.match(GENERAL_REGION_RE);
    if (regionMatch) {
      results.push({
        memoryKey: 'chat_region',
        value: regionMatch[1],
        tags: [TAG],
      });
    }
  }

  return results;
}

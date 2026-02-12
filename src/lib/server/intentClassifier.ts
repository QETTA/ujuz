/**
 * UjuZ - Intent Classification
 * Weighted keyword scoring for bot queries.
 * Higher-priority intents use more specific keywords to avoid greedy overlap.
 */

interface IntentEntry {
  keywords: string[];
  /** Higher priority intents are checked first when scores tie */
  priority: number;
}

export const INTENT_KEYWORDS: Record<string, string[]> = {
  ROUTE_STRATEGY: ['3루트', '입소 전략', '경로 비교', '루트', '전략'],
  WORKPLACE_ELIGIBILITY: ['직장어린이집', '회사 어린이집', '공동직장'],
  ADMISSION_INQUIRY: ['입소', '입학', '점수', '대기', '순번', '가능성'],
  TO_ALERT: ['TO', '빈자리', '알림'],
  COST_INQUIRY: ['비용', '보육료', '금액', '얼마', '가격', '요금'],
  REVIEW_INQUIRY: ['후기', '리뷰', '평가', '어때'],
  COMPARISON: ['비교', 'vs', '어디가', '뭐가 나아'],
  RECOMMENDATION: ['추천', '괜찮은'],
  SUBSCRIPTION: ['구독', '프리미엄', '결제', '요금제'],
  FACILITY_INFO: ['어린이집', '유치원', '시설', '정보'],
};

const INTENT_CONFIG: Record<string, IntentEntry> = {
  ROUTE_STRATEGY: { keywords: INTENT_KEYWORDS.ROUTE_STRATEGY, priority: 10 },
  WORKPLACE_ELIGIBILITY: { keywords: INTENT_KEYWORDS.WORKPLACE_ELIGIBILITY, priority: 9 },
  ADMISSION_INQUIRY: { keywords: INTENT_KEYWORDS.ADMISSION_INQUIRY, priority: 8 },
  TO_ALERT: { keywords: INTENT_KEYWORDS.TO_ALERT, priority: 7 },
  COST_INQUIRY: { keywords: INTENT_KEYWORDS.COST_INQUIRY, priority: 6 },
  REVIEW_INQUIRY: { keywords: INTENT_KEYWORDS.REVIEW_INQUIRY, priority: 5 },
  COMPARISON: { keywords: INTENT_KEYWORDS.COMPARISON, priority: 4 },
  RECOMMENDATION: { keywords: INTENT_KEYWORDS.RECOMMENDATION, priority: 3 },
  SUBSCRIPTION: { keywords: INTENT_KEYWORDS.SUBSCRIPTION, priority: 2 },
  FACILITY_INFO: { keywords: INTENT_KEYWORDS.FACILITY_INFO, priority: 1 },
};

export function classifyIntent(message: string): string {
  const lower = message.toLowerCase();

  let bestIntent = 'GENERAL';
  let bestScore = 0;
  let bestPriority = -1;

  for (const [intent, config] of Object.entries(INTENT_CONFIG)) {
    const matchCount = config.keywords.filter((kw) => lower.includes(kw)).length;
    if (matchCount === 0) continue;

    // Weighted score: match count + keyword specificity bonus (longer keywords = more specific)
    const specificityBonus = config.keywords
      .filter((kw) => lower.includes(kw))
      .reduce((sum, kw) => sum + kw.length, 0) / 10;
    const score = matchCount + specificityBonus;

    if (score > bestScore || (score === bestScore && config.priority > bestPriority)) {
      bestIntent = intent;
      bestScore = score;
      bestPriority = config.priority;
    }
  }

  return bestIntent;
}

export function generateSuggestions(intent: string): string[] {
  const suggestions: Record<string, string[]> = {
    FACILITY_INFO: ['근처 어린이집 추천해줘', '이 어린이집 입소 점수는?', '보육료 얼마야?'],
    ADMISSION_INQUIRY: ['입소 점수 계산해줘', 'TO 알림 설정하고 싶어', '다른 시설도 비교해줘'],
    ROUTE_STRATEGY: ['3루트 분석해줘', '직장어린이집 자격 확인', '입소 점수 알아보기'],
    WORKPLACE_ELIGIBILITY: ['직장어린이집 자격 확인해줘', '공동직장 어린이집 검색', '근처 어린이집 추천해줘'],
    COST_INQUIRY: ['정부 지원금 알려줘', '추가 비용은 뭐가 있어?', '비용 비교해줘'],
    REVIEW_INQUIRY: ['후기 더 보기', '입소 점수 확인해줘', '다른 시설 비교해줘'],
    TO_ALERT: ['TO 알림 설정해줘', '입소 점수 확인해줘', '추천 시설 알려줘'],
    COMPARISON: ['비교할 시설 추가하기', '입소 점수 비교해줘', 'TO 알림 설정하기'],
    RECOMMENDATION: ['추천 시설 더보기', '입소 점수 확인해줘', 'TO 알림 설정해줘'],
    SUBSCRIPTION: ['프리미엄 혜택 보기', '무료 체험 시작', '입소 점수 알아보기'],
    GENERAL: ['어린이집 추천해줘', '입소 점수 알아보기', 'TO 알림 설정', '프리미엄 안내'],
  };

  return suggestions[intent] ?? suggestions.GENERAL;
}

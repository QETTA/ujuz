import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/server/env';
import { getUserId, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { getCostManager, ensureCostLoaded } from '@/lib/server/costManager';
import { checkLimit, incrementFeatureUsage } from '@/lib/server/subscriptionService';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

const EXPLAIN_PROMPT = `당신은 어린이집 입소 전문 상담사입니다. 아래 입학 분석 결과를 학부모가 쉽게 이해할 수 있도록 3~4문장으로 설명해 주세요.

규칙:
- 반말 금지, 존댓말 사용
- 핵심 수치(확률, 대기 기간)를 먼저 언급
- 확률이 높으면 긍정적으로, 낮으면 대안이나 팁을 제시
- 신뢰도가 낮으면 "아직 데이터가 부족해서 참고용"임을 언급
- 마크다운 사용 금지, 순수 텍스트만
- 200자 이내`;

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  let userId: string;
  try {
    userId = await getUserId(req);
  } catch {
    logRequest(req, 401, start, traceId);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check tier limit
  const limitCheck = await checkLimit(userId, 'explain');
  if (!limitCheck.allowed) {
    logRequest(req, 403, start, traceId);
    return NextResponse.json({
      error: 'AI 해석 횟수 한도에 도달했습니다',
      code: 'limit_exceeded',
      remaining: limitCheck.remaining,
      resetAt: limitCheck.resetAt,
      upgradeNeeded: limitCheck.upgradeNeeded,
    }, { status: 403 });
  }

  // No API key → return null (client shows fallback text)
  if (!env.ANTHROPIC_API_KEY) {
    logRequest(req, 200, start, traceId);
    return NextResponse.json({ explanation: null, fallback: true });
  }

  let body: { result?: Record<string, unknown>; facilityName?: string };
  try {
    body = await req.json();
  } catch {
    logRequest(req, 400, start, traceId);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { result, facilityName } = body;
  if (!result) {
    logRequest(req, 400, start, traceId);
    return NextResponse.json({ error: 'result is required' }, { status: 400 });
  }

  const probabilityPct = Math.round((Number(result.probability) || 0) * 100);
  const confidencePct = Math.round((Number(result.confidence) || 0) * 100);

  const dataPrompt = `시설: ${facilityName ?? result.facilityName ?? '어린이집'}
연령: 만 ${result.ageBand ?? 0}세
대기 순번: ${result.waiting ?? 0}번 → 실질 대기: ${result.effectiveWaiting ?? 0}번
6개월 내 입학 확률: ${probabilityPct}%
등급: ${result.grade}
신뢰도: ${confidencePct}%
예상 대기: 중간값 ${result.waitMonthsMedian ?? 0}개월, 80% ${result.waitMonthsP80 ?? 0}개월
우선순위: ${result.priorityType ?? '일반'}`;

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const model = 'claude-sonnet-4-5-20250929';

    const response = await client.messages.create({
      model,
      max_tokens: 256,
      system: EXPLAIN_PROMPT,
      messages: [{ role: 'user', content: dataPrompt }],
    });

    // Track cost
    try {
      const costManager = getCostManager(env.COST_DAILY_BUDGET_USD, env.COST_MONTHLY_BUDGET_USD);
      await ensureCostLoaded();
      costManager.recordUsage({
        model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        taskType: 'summary',
      });
      costManager.syncToDb().catch(() => {});
    } catch {
      // Cost tracking is non-fatal
    }

    const text = response.content.find((b) => b.type === 'text');
    await incrementFeatureUsage(userId, 'explain');
    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      explanation: text?.text ?? null,
      summary: text?.text ?? null,
      next_actions: [],
      caveats: [],
    });
  } catch (err) {
    logger.warn('Claude explain failed, returning fallback', {
      error: err instanceof Error ? err.message : String(err),
    });
    logRequest(req, 200, start, traceId);
    return NextResponse.json({ explanation: null, fallback: true });
  }
}

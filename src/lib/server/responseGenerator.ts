/**
 * UjuZ - Response Generator
 * Generates bot responses via Claude API or fallback.
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from './env';
import { calculateAdmissionScoreV2, formatBotResponseV2 } from './admissionEngineV2';
import { getCostManager, ensureCostLoaded } from './costManager';
import { composeContext } from './userMemoryService';
import { logger } from './logger';
import type { ChatMessage, ResponseContext, BotDataBlock } from './botTypes';

// ── Constants ─────────────────────────────────────────────
const MAX_HISTORY_MESSAGES = 10;
export const MAX_TOKENS = 1024;
const TASK_TYPE = 'chat' as const;

/** Disclaimer appended to all bot responses */
export const AI_DISCLAIMER = '\n\n---\n*본 정보는 통계적 추정 및 AI 생성 정보로, 실제 입소 결과와 다를 수 있습니다. 정확한 정보는 해당 시설 또는 관할 지자체에 문의하세요.*';

// ── Claude API Client (lazy init) ───────────────────────
let anthropicClient: Anthropic | null = null;
let apiKeyWarned = false;

/** Sanitize user-provided strings before inserting into system prompts */
function sanitizeForPrompt(value: string): string {
  return value.replace(/[\n\r]/g, ' ').replace(/[<>{}[\]]/g, '').slice(0, 200);
}

function getAnthropicClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) {
    if (!apiKeyWarned) {
      logger.warn('ANTHROPIC_API_KEY not set — bot will use fallback responses');
      apiKeyWarned = true;
    }
    return null;
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

const SYSTEM_PROMPT = `당신은 "우쥬봇"입니다. 대한민국 어린이집 입소를 돕는 AI 상담사입니다.

역할:
- 어린이집/유치원 정보 안내 (위치, 시설, 보육료)
- 입소 점수 계산 및 예측 설명
- TO(충원) 알림 서비스 안내
- 보육 정책 및 지원금 안내
- 시설 비교 및 추천

규칙:
- 한국어로 답변하세요
- 친절하고 간결하게 답변하세요 (300자 이내 권장)
- 확실하지 않은 정보는 확인이 필요하다고 안내하세요
- 어린이집/보육 관련 질문이 아닌 경우 정중히 안내 범위를 설명하세요
- 개인정보(주민번호, 카드번호 등)는 절대 요청하지 마세요
- 모든 답변의 마지막에 반드시 다음 면책 문구를 추가하세요:
---
*본 정보는 통계적 추정 및 AI 생성 정보로, 실제 입소 결과와 다를 수 있습니다. 정확한 정보는 해당 시설 또는 관할 지자체에 문의하세요.*`;

/**
 * Prepare Claude API parameters without calling the API.
 * Returns null when admission V2 engine handles the intent (caller should use non-streaming fallback).
 */
export async function prepareClaudeParams(
  intent: string,
  message: string,
  dataBlocks: BotDataBlock[],
  context?: ResponseContext,
  conversationHistory?: ChatMessage[],
  userId?: string,
): Promise<{ systemPrompt: string; messages: ChatMessage[]; model: string } | null> {
  // V2 Admission Engine handles this intent directly — no streaming needed
  if (intent === 'ADMISSION_INQUIRY' && context?.facility_id && context?.child_age_band) {
    return null;
  }

  const systemPrompt = await composeSystemPrompt(intent, dataBlocks, context, userId);
  const messages = buildClaudeMessages(message, conversationHistory);

  const costManager = getCostManager(env.COST_DAILY_BUDGET_USD, env.COST_MONTHLY_BUDGET_USD);
  await ensureCostLoaded();
  const model = costManager.selectModelWithBudget(TASK_TYPE);

  return { systemPrompt, messages, model };
}

export async function generateResponse(
  intent: string,
  message: string,
  dataBlocks: BotDataBlock[],
  context?: ResponseContext,
  conversationHistory?: ChatMessage[],
  userId?: string,
): Promise<string> {
  // V2 Admission Engine Integration
  if (intent === 'ADMISSION_INQUIRY' && context?.facility_id && context?.child_age_band) {
    try {
      const result = await calculateAdmissionScoreV2({
        facility_id: context.facility_id,
        child_age_band: context.child_age_band,
        waiting_position: context.waiting_position,
        priority_type: context.priority_type ?? 'general',
      });
      return formatBotResponseV2(result) + AI_DISCLAIMER;
    } catch (err) {
      logger.warn('Admission engine failed, falling back', { error: err instanceof Error ? err.message : String(err) });
    }
  }

  const client = getAnthropicClient();
  if (client) {
    try {
      return await callClaude(client, intent, message, dataBlocks, context, conversationHistory, userId);
    } catch (err) {
      logger.error('Claude API failed, using fallback', { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return generateFallback(intent, dataBlocks);
}

async function callClaude(
  client: Anthropic,
  intent: string,
  message: string,
  dataBlocks: BotDataBlock[],
  context?: ResponseContext,
  conversationHistory?: ChatMessage[],
  userId?: string,
): Promise<string> {
  const params = await prepareClaudeParams(intent, message, dataBlocks, context, conversationHistory, userId);
  if (!params) {
    return generateFallback(intent, dataBlocks);
  }

  const { systemPrompt, messages, model } = params;
  const response = await requestClaudeResponse(client, model, systemPrompt, messages);

  const costManager = getCostManager(env.COST_DAILY_BUDGET_USD, env.COST_MONTHLY_BUDGET_USD);
  await syncClaudeCost(costManager, model, TASK_TYPE, response.usage.input_tokens, response.usage.output_tokens);

  const textBlock = response.content.find((block) => block.type === 'text');
  const text = textBlock?.text ?? generateFallback(intent, dataBlocks);
  // Append disclaimer if not already present (Claude may include it from system prompt)
  return text.includes('본 정보는 통계적 추정') ? text : text + AI_DISCLAIMER;
}

async function composeSystemPrompt(
  intent: string,
  dataBlocks: BotDataBlock[],
  context?: ResponseContext,
  userId?: string,
): Promise<string> {
  let systemPrompt = SYSTEM_PROMPT;

  if (dataBlocks.length > 0) {
    const blockContext = dataBlocks
      .map((b) => `[${b.type}] ${b.title}: ${b.content} (신뢰도: ${(b.confidence * 100).toFixed(0)}%)`)
      .join('\n');
    systemPrompt += `\n\n참고 데이터:\n${blockContext}`;
  }

  if (context?.facility_id) {
    systemPrompt += `\n\n현재 컨텍스트: 시설 ID ${sanitizeForPrompt(context.facility_id)}`;
  }

  const memoryContext = await buildMemoryContext(userId);
  if (memoryContext) {
    systemPrompt += `\n\n${memoryContext}`;
  }

  systemPrompt += `\n\n분류된 의도: ${sanitizeForPrompt(intent)}`;
  return systemPrompt;
}

async function buildMemoryContext(userId?: string): Promise<string | null> {
  if (!env.MEMORY_ENABLED || !userId) return null;

  try {
    return await composeContext(userId);
  } catch (err) {
    logger.warn('Memory service failed', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

function buildClaudeMessages(message: string, conversationHistory?: ChatMessage[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  if (conversationHistory && conversationHistory.length > 0) {
    messages.push(...conversationHistory.slice(-MAX_HISTORY_MESSAGES));
  }
  messages.push({ role: 'user', content: message });
  return messages;
}

async function requestClaudeResponse(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
) {
  return client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });
}

export async function syncClaudeCost(
  costManager: ReturnType<typeof getCostManager>,
  model: string,
  taskType: 'chat',
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  costManager.recordUsage({
    model,
    inputTokens,
    outputTokens,
    taskType,
  });

  try {
    await costManager.syncToDb();
  } catch (err: unknown) {
    logger.error('Cost sync failed — billing integrity may be affected', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function generateFallback(
  intent: string,
  dataBlocks: BotDataBlock[],
): string {
  const blockSummary = dataBlocks.length > 0
    ? `\n\n참고 데이터:\n${dataBlocks.map((b) => `- ${b.title}: ${b.content}`).join('\n')}`
    : '';

  const responses: Record<string, string> = {
    FACILITY_INFO: `어린이집 정보를 찾아보겠습니다. 검색어나 지역을 알려주시면 더 정확한 정보를 드릴 수 있어요.${blockSummary}`,
    ADMISSION_INQUIRY: `입소 점수를 확인해 보겠습니다. '입소 점수 예측' 기능에서 자녀 정보와 희망 시설을 입력하시면 상세한 분석 결과를 받으실 수 있어요.${blockSummary}`,
    COST_INQUIRY: `보육료 정보를 안내해 드리겠습니다. 정부 지원금과 추가 비용을 포함한 상세 안내가 필요하시면 시설명을 알려주세요.${blockSummary}`,
    REVIEW_INQUIRY: `시설 후기를 찾아보겠습니다. 특정 시설의 리뷰가 궁금하시면 시설명을 알려주세요.${blockSummary}`,
    TO_ALERT: `TO 알림 서비스를 안내해 드리겠습니다. 관심 시설의 TO 알림을 설정하면 자리가 나는 즉시 알려드려요.${blockSummary}`,
    COMPARISON: `시설 비교를 도와드리겠습니다. 비교하고 싶은 시설들의 이름을 알려주세요.${blockSummary}`,
    RECOMMENDATION: `맞춤 추천을 해드리겠습니다. 자녀의 나이와 원하시는 지역을 알려주시면 최적의 시설을 추천해 드릴게요.${blockSummary}`,
    SUBSCRIPTION: `프리미엄 요금제를 안내해 드리겠습니다.\n\n무료: 입학 점수 1회/월, TO 알림 1개, AI 상담 5회/일\n기본 (5,900원/월): 입학 점수 5회, TO 5개, AI 30회\n프리미엄 (9,900원/월): 무제한 이용`,
    GENERAL: `안녕하세요! 우쥬봇이에요. 어린이집 관련 궁금한 점이 있으시면 무엇이든 물어보세요.${blockSummary}`,
  };

  return (responses[intent] ?? responses.GENERAL) + AI_DISCLAIMER;
}

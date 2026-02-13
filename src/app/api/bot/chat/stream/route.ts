/**
 * Streaming chat endpoint using Vercel AI SDK v6.
 * POST /api/bot/chat/stream
 *
 * Receives UIMessage[] from the AI SDK client and streams back
 * via toUIMessageStreamResponse().
 */

import { type NextRequest } from 'next/server';
import { streamText, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { ObjectId } from 'mongodb';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { checkRateLimit } from '@/lib/server/rateLimit';
import { classifyIntent, generateSuggestions } from '@/lib/server/intentClassifier';
import { prepareClaudeParams, syncClaudeCost, generateFallback, MAX_TOKENS } from '@/lib/server/responseGenerator';
import { calculateAdmissionScoreV2, formatBotResponseV2 } from '@/lib/server/admissionEngineV2';
import { getCostManager, ensureCostLoaded } from '@/lib/server/costManager';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { env } from '@/lib/server/env';
import { logger } from '@/lib/server/logger';
import { extractMemoriesFromMessage } from '@/lib/server/memoryExtractor';
import { upsertMemory } from '@/lib/server/userMemoryService';
import type { ConversationDoc, DataBlockDoc, BotMessageDoc } from '@/lib/server/dbTypes';
import type { BotContext, BotDataBlock, ConversationHistoryMessage } from '@/lib/server/botTypes';

export const runtime = 'nodejs';

const MAX_DATA_BLOCKS = 5;
const MAX_CONVERSATION_HISTORY = 10;

// ── Helpers ──────────────────────────────────────────────

function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

async function fetchRelevantDataBlocks(intent: string, context?: BotContext): Promise<BotDataBlock[]> {
  try {
    const db = await getDbOrThrow();
    const query: Record<string, unknown> = { isActive: true };

    if (context?.facility_id) {
      query.targetId = context.facility_id;
    }

    const blockTypeMap: Record<string, string> = {
      FACILITY_INFO: 'facility_insight',
      ADMISSION_INQUIRY: 'admission_data',
      COST_INQUIRY: 'cost_data',
      REVIEW_INQUIRY: 'review_summary',
      TO_ALERT: 'to_pattern',
    };

    if (blockTypeMap[intent]) {
      query.blockType = blockTypeMap[intent];
    }

    const blocks = await db.collection<DataBlockDoc>(U.DATA_BLOCKS)
      .find(query)
      .sort({ confidence: -1 })
      .limit(MAX_DATA_BLOCKS)
      .toArray();

    return blocks.map((b) => ({
      type: b.blockType,
      title: b.title,
      content: b.content,
      confidence: b.confidence ?? 0.7,
      source: b.source,
    }));
  } catch (err) {
    logger.warn('Failed to fetch data blocks', { error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

async function loadConversationHistory(conversationId?: string): Promise<ConversationHistoryMessage[]> {
  if (!conversationId || !isValidObjectId(conversationId)) return [];

  try {
    const db = await getDbOrThrow();
    const doc = await db.collection<ConversationDoc>(U.CONVERSATIONS).findOne(
      { _id: new ObjectId(conversationId) },
      { projection: { messages: { $slice: -MAX_CONVERSATION_HISTORY } } },
    );
    if (!doc?.messages) return [];
    return doc.messages.map((m) => ({ role: m.role, content: m.content }));
  } catch (err) {
    logger.warn('Conversation load failed', { error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

async function saveConversationMessages(params: {
  userId: string;
  conversationId?: string;
  userMessage: BotMessageDoc;
  assistantMessage: BotMessageDoc;
  titleSeed: string;
}): Promise<string> {
  const db = await getDbOrThrow();

  if (params.conversationId && isValidObjectId(params.conversationId)) {
    await db.collection<ConversationDoc>(U.CONVERSATIONS).updateOne(
      { _id: new ObjectId(params.conversationId) },
      {
        $push: { messages: { $each: [params.userMessage, params.assistantMessage] } },
        $set: { updated_at: new Date() },
      },
    );
    return params.conversationId;
  }

  const newId = new ObjectId();
  const now = new Date();
  await db.collection<ConversationDoc>(U.CONVERSATIONS).insertOne({
    _id: newId,
    user_id: params.userId,
    title: params.titleSeed.slice(0, 50),
    messages: [params.userMessage, params.assistantMessage],
    created_at: now,
    updated_at: now,
  });
  return newId.toString();
}

async function extractAndSaveMemories(userId: string, message: string): Promise<void> {
  try {
    const memories = extractMemoriesFromMessage(message);
    if (memories.length === 0) return;
    await Promise.allSettled(
      memories.map((m) =>
        upsertMemory({ userId, memoryKey: m.memoryKey, value: m.value, tags: m.tags }),
      ),
    );
  } catch (err) {
    logger.warn('Memory extraction failed', { error: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * Extract text content from a UIMessage parts array.
 * AI SDK v6 uses parts: [{type:'text', text:'...'}, ...] instead of content string.
 */
function extractTextFromParts(parts: { type: string; text?: string }[]): string {
  return parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text!)
    .join('');
}

// ── POST Handler ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);

    const { allowed } = await checkRateLimit(`chat:${userId}`, 20, 60_000);
    if (!allowed) {
      logRequest(req, 429, start, traceId);
      return new Response(JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      logRequest(req, 400, start, traceId);
      return new Response(JSON.stringify({ error: '잘못된 요청 형식입니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = rawBody as {
      messages?: { id: string; role: string; parts?: { type: string; text?: string }[] }[];
      conversation_id?: string;
      context?: BotContext;
    };

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      logRequest(req, 400, start, traceId);
      return new Response(JSON.stringify({ error: '메시지가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Find the last user message — AI SDK v6 sends UIMessage with parts
    const lastUserMsg = [...body.messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) {
      return new Response(JSON.stringify({ error: '사용자 메시지가 필요합니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract text content from parts
    const userText = lastUserMsg.parts
      ? extractTextFromParts(lastUserMsg.parts)
      : '';
    if (!userText || userText.length > 2000) {
      return new Response(JSON.stringify({ error: '메시지를 입력해 주세요 (2000자 이내)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const intent = classifyIntent(userText);
    const conversationId = body.conversation_id;
    const history = await loadConversationHistory(conversationId);
    const dataBlocks = await fetchRelevantDataBlocks(intent, body.context);
    const suggestions = generateSuggestions(intent);

    // Prepare Claude params (returns null for admission V2)
    const claudeParams = await prepareClaudeParams(
      intent, userText, dataBlocks, body.context, history, userId,
    );

    // ── Admission V2 fallback (non-streaming) ────────────
    if (!claudeParams) {
      let content: string;
      try {
        const admissionResult = await calculateAdmissionScoreV2({
          facility_id: body.context!.facility_id!,
          child_age_band: body.context!.child_age_band!,
          waiting_position: body.context?.waiting_position,
          priority_type: body.context?.priority_type ?? 'general',
        });
        content = formatBotResponseV2(admissionResult);
      } catch {
        content = generateFallback(intent, dataBlocks);
      }

      const convId = await saveAfterResponse(userId, conversationId, userText, content, intent, dataBlocks);
      logRequest(req, 200, start, traceId);

      return createNonStreamingResponse(content, convId, suggestions);
    }

    // ── No API key fallback ──────────────────────────────
    if (!env.ANTHROPIC_API_KEY) {
      const fallbackContent = generateFallback(intent, dataBlocks);
      const convId = await saveAfterResponse(userId, conversationId, userText, fallbackContent, intent, dataBlocks);
      logRequest(req, 200, start, traceId);
      return createNonStreamingResponse(fallbackContent, convId, suggestions);
    }

    // ── Streaming path ───────────────────────────────────
    const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        let resolveOnFinish: () => void;
        const onFinishPromise = new Promise<void>((resolve) => { resolveOnFinish = resolve; });

        const result = streamText({
          model: anthropic(claudeParams.model),
          system: claudeParams.systemPrompt,
          messages: claudeParams.messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          maxOutputTokens: MAX_TOKENS,
          onFinish: async ({ text, usage }) => {
            try {
              // Cost tracking
              const costManager = getCostManager(env.COST_DAILY_BUDGET_USD, env.COST_MONTHLY_BUDGET_USD);
              await ensureCostLoaded();
              await syncClaudeCost(
                costManager,
                claudeParams.model,
                'chat',
                usage.inputTokens ?? 0,
                usage.outputTokens ?? 0,
              );

              // Save conversation → get conversation_id
              const convId = await saveAfterResponse(userId, conversationId, userText, text, intent, dataBlocks);

              // Send metadata to client
              writer.write({
                type: 'message-metadata',
                messageMetadata: { conversation_id: convId, suggestions },
              });

              // Memory extraction (fire-and-forget)
              if (env.MEMORY_ENABLED) {
                extractAndSaveMemories(userId, userText).catch(() => {});
              }
            } catch (err) {
              logger.error('Stream onFinish failed', { error: err instanceof Error ? err.message : String(err) });
            } finally {
              resolveOnFinish!();
            }
          },
        });

        writer.merge(result.toUIMessageStream());
        await onFinishPromise;
      },
    });

    logRequest(req, 200, start, traceId);

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

// ── Post-response helpers ────────────────────────────────

async function saveAfterResponse(
  userId: string,
  conversationId: string | undefined,
  userText: string,
  assistantContent: string,
  intent: string,
  dataBlocks: BotDataBlock[],
): Promise<string> {
  const userMessage: BotMessageDoc = {
    id: new ObjectId().toString(),
    role: 'user',
    content: userText,
    intent,
    created_at: new Date().toISOString(),
  };

  const assistantMessage: BotMessageDoc = {
    id: new ObjectId().toString(),
    role: 'assistant',
    content: assistantContent,
    intent,
    data_blocks: dataBlocks,
    created_at: new Date().toISOString(),
  };

  return saveConversationMessages({
    userId,
    conversationId,
    userMessage,
    assistantMessage,
    titleSeed: userText,
  });
}

/**
 * For non-streaming responses (admission V2, fallback), wrap the content
 * as a UIMessageStream SSE response so the client can parse it uniformly.
 */
function createNonStreamingResponse(
  content: string,
  conversationId: string,
  suggestions: string[],
): Response {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'text-start', id: 'msg-0' });
      writer.write({ type: 'text-delta', id: 'msg-0', delta: content });
      writer.write({ type: 'text-end', id: 'msg-0' });
      writer.write({
        type: 'message-metadata',
        messageMetadata: { conversation_id: conversationId, suggestions },
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

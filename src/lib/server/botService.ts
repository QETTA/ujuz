/**
 * UJUz - Bot Service (우주봇)
 * Orchestrates intent classification, response generation, and conversation management.
 */

import { ObjectId, type Filter, type UpdateFilter } from 'mongodb';
import { getDbOrThrow } from './db';
import { U } from './collections';
import { classifyIntent, generateSuggestions } from './intentClassifier';
import { generateResponse } from './responseGenerator';
import { logger } from './logger';
import type { ConversationDoc, DataBlockDoc, BotMessageDoc } from './dbTypes';
import type { BotContext, BotDataBlock, ConversationHistoryMessage } from './botTypes';

type BotMessage = BotMessageDoc;

// ── Constants ───────────────────────────────────────────
const MAX_DATA_BLOCKS = 5;
const MAX_CONVERSATION_HISTORY = 10;
const MAX_CONVERSATIONS_LIST = 20;

// ── Types ───────────────────────────────────────────────

interface BotQueryInput {
  user_id: string;
  message: string;
  conversation_id?: string;
  context?: BotContext;
}

function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// ── Data Blocks ─────────────────────────────────────────

function classifyUserIntent(message: string): string {
  return classifyIntent(message);
}

async function fetchRelevantDataBlocks(intent: string, context?: BotContext): Promise<BotDataBlock[]> {
  try {
    const db = await getDbOrThrow();
    const query: Filter<DataBlockDoc> = { isActive: true };

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
  if (!conversationId) return [];
  if (!isValidObjectId(conversationId)) {
    logger.warn('Invalid conversation ID format', { conversationId });
    return [];
  }

  try {
    const db = await getDbOrThrow();
    const existingConv = await db.collection<ConversationDoc>(U.CONVERSATIONS).findOne(
      { _id: new ObjectId(conversationId) },
      { projection: { messages: { $slice: -MAX_CONVERSATION_HISTORY } } },
    );

    if (!existingConv?.messages) return [];

    return existingConv.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  } catch (err) {
    logger.warn('Conversation load failed', {
      conversationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

async function generateModelResponse(params: {
  intent: string;
  message: string;
  dataBlocks: BotDataBlock[];
  context?: BotContext;
  history: ConversationHistoryMessage[];
  userId: string;
}): Promise<string> {
  return generateResponse(
    params.intent,
    params.message,
    params.dataBlocks,
    params.context,
    params.history,
    params.userId,
  );
}

async function saveConversationMessages(params: {
  userId: string;
  conversationId?: string;
  userMessage: BotMessage;
  assistantMessage: BotMessage;
  titleSeed: string;
}): Promise<string> {
  const db = await getDbOrThrow();

  if (params.conversationId && isValidObjectId(params.conversationId)) {
    const update: UpdateFilter<ConversationDoc> = {
      $push: { messages: { $each: [params.userMessage, params.assistantMessage] } },
      $set: { updated_at: new Date() },
    };

    await db.collection<ConversationDoc>(U.CONVERSATIONS).updateOne(
      { _id: new ObjectId(params.conversationId) },
      update,
    );

    return params.conversationId;
  }

  const now = new Date();
  const newConversationId = new ObjectId();
  const newConversation: ConversationDoc = {
    _id: newConversationId,
    user_id: params.userId,
    title: params.titleSeed.slice(0, 50),
    messages: [params.userMessage, params.assistantMessage],
    created_at: now,
    updated_at: now,
  };
  await db.collection<ConversationDoc>(U.CONVERSATIONS).insertOne(newConversation);

  return newConversationId.toString();
}

// ── Query Processing ────────────────────────────────────

export async function processQuery(input: BotQueryInput): Promise<{
  conversation_id: string;
  message: BotMessage;
  suggestions: string[];
}> {
  const intent = classifyUserIntent(input.message);
  const conversationHistory = await loadConversationHistory(input.conversation_id);
  const dataBlocks = await fetchRelevantDataBlocks(intent, input.context);
  let responseContent: string;
  try {
    responseContent = await generateModelResponse({
      intent,
      message: input.message,
      dataBlocks,
      context: input.context,
      history: conversationHistory,
      userId: input.user_id,
    });
  } catch (err) {
    logger.error('Response generation failed', { error: err instanceof Error ? err.message : String(err) });
    responseContent = '죄송합니다, 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }
  const suggestions = generateSuggestions(intent);

  const userMessage: BotMessage = {
    id: new ObjectId().toString(),
    role: 'user',
    content: input.message,
    intent,
    created_at: new Date().toISOString(),
  };

  const assistantMessage: BotMessage = {
    id: new ObjectId().toString(),
    role: 'assistant',
    content: responseContent,
    intent,
    data_blocks: dataBlocks,
    created_at: new Date().toISOString(),
  };

  const conversationId = await saveConversationMessages({
    userId: input.user_id,
    conversationId: input.conversation_id,
    userMessage,
    assistantMessage,
    titleSeed: input.message,
  });

  return {
    conversation_id: conversationId,
    message: assistantMessage,
    suggestions,
  };
}

// ── Conversation CRUD ───────────────────────────────────

export async function getConversations(userId: string) {
  const db = await getDbOrThrow();
  const docs = await db.collection<ConversationDoc>(U.CONVERSATIONS)
    .find({ user_id: userId })
    .sort({ updated_at: -1 })
    .limit(MAX_CONVERSATIONS_LIST)
    .project({ messages: { $slice: -1 }, title: 1, created_at: 1, updated_at: 1 })
    .toArray();

  return {
    conversations: docs.map((doc) => ({
      id: doc._id.toString(),
      title: doc.title,
      last_message: doc.messages?.[0]?.content ?? '',
      created_at: doc.created_at.toISOString(),
      updated_at: doc.updated_at.toISOString(),
    })),
  };
}

export async function getConversation(conversationId: string) {
  if (!isValidObjectId(conversationId)) return null;
  const db = await getDbOrThrow();
  const doc = await db.collection<ConversationDoc>(U.CONVERSATIONS).findOne({
    _id: new ObjectId(conversationId),
  });

  if (!doc) return null;

  return {
    id: doc._id.toString(),
    user_id: doc.user_id,
    title: doc.title,
    messages: doc.messages,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString(),
  };
}

export async function deleteConversation(conversationId: string, userId: string) {
  if (!isValidObjectId(conversationId)) return;
  const db = await getDbOrThrow();
  await db.collection<ConversationDoc>(U.CONVERSATIONS).deleteOne({
    _id: new ObjectId(conversationId),
    user_id: userId,
  });
}

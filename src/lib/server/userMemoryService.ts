/**
 * UJUz - User Memory Service
 * 사용자별 기억 저장/검색 + 이벤트 추적 + 컨텍스트 조합
 * PII 자동 정제 포함
 */

import { getDbOrThrow } from './db';
import { U } from './collections';
import type { UserMemoryDoc, UserEventDoc } from './dbTypes';
import type { Filter } from 'mongodb';
import { logger } from './logger';

// ─── PII Sanitization ───────────────────────────────────────

const PII_PATTERNS = [
  { regex: /\d{6}[-\s]?[1-4]\d{6}/g, replacement: 'XXXXXX-XXXXXXX' },
  { regex: /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g, replacement: '010-XXXX-XXXX' },
  { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  { regex: /(?:4\d{3}|5[1-5]\d{2}|6\d{3}|9\d{3})[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g, replacement: '[CARD]' },
];

function sanitizePii(text: string): string {
  let result = text;
  for (const pattern of PII_PATTERNS) {
    pattern.regex.lastIndex = 0;
    result = result.replace(pattern.regex, pattern.replacement);
  }
  return result;
}

// ─── Types ──────────────────────────────────────────────────

export interface UserMemory {
  userId: string;
  memoryKey: string;
  value: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserEvent {
  userId: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
  expireAt: Date;
}

// ─── Helpers ────────────────────────────────────────────────


const MAX_MEMORY_VALUE_LENGTH = 400;
const MAX_CONTEXT_MEMORIES = 5;
const DEFAULT_EVENT_TTL_DAYS = 365;

function mapMemoryDoc(doc: UserMemoryDoc): UserMemory {
  return {
    userId: doc.userId,
    memoryKey: doc.memoryKey,
    value: doc.value,
    tags: doc.tags ?? [],
    isActive: doc.isActive ?? true,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ─── CRUD ───────────────────────────────────────────────────

export async function upsertMemory(params: {
  userId: string;
  memoryKey: string;
  value: string;
  tags?: string[];
}): Promise<{ truncated: boolean }> {
  const db = await getDbOrThrow();
  const sanitized = sanitizePii(params.value);
  const truncated = sanitized.length > MAX_MEMORY_VALUE_LENGTH;
  if (truncated) {
    logger.info('Memory value truncated', {
      userId: params.userId,
      memoryKey: params.memoryKey,
      originalLength: sanitized.length,
    });
  }
  const sanitizedValue = sanitized.slice(0, MAX_MEMORY_VALUE_LENGTH);

  await db.collection<UserMemoryDoc>(U.USER_MEMORIES).updateOne(
    { userId: params.userId, memoryKey: params.memoryKey },
    {
      $set: {
        value: sanitizedValue,
        tags: params.tags ?? [],
        isActive: true,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        userId: params.userId,
        memoryKey: params.memoryKey,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  return { truncated };
}

export async function getMemory(
  userId: string,
  memoryKey: string,
): Promise<UserMemory | null> {
  const db = await getDbOrThrow();
  const doc = await db.collection<UserMemoryDoc>(U.USER_MEMORIES).findOne({
    userId,
    memoryKey,
    isActive: true,
  });

  if (!doc) return null;

  return mapMemoryDoc(doc);
}

export async function searchMemories(
  userId: string,
  options?: { tags?: string[]; limit?: number },
): Promise<UserMemory[]> {
  const db = await getDbOrThrow();
  const query: Filter<UserMemoryDoc> = { userId, isActive: true };

  if (options?.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags };
  }

  const docs = await db.collection<UserMemoryDoc>(U.USER_MEMORIES)
    .find(query)
    .sort({ updatedAt: -1 })
    .limit(options?.limit ?? 20)
    .toArray();

  return docs.map(mapMemoryDoc);
}

export async function deleteMemory(
  userId: string,
  memoryKey: string,
): Promise<boolean> {
  const db = await getDbOrThrow();
  const result = await db.collection<UserMemoryDoc>(U.USER_MEMORIES).updateOne(
    { userId, memoryKey },
    { $set: { isActive: false, updatedAt: new Date() } },
  );
  return result.modifiedCount > 0;
}

// ─── Events ─────────────────────────────────────────────────

const ALLOWED_EVENT_DATA_TYPES = new Set(['string', 'number', 'boolean']);

function validateEventData(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    if (ALLOWED_EVENT_DATA_TYPES.has(typeof value)) {
      cleaned[key] = value;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.filter((v) => ALLOWED_EVENT_DATA_TYPES.has(typeof v));
    }
    // Skip complex objects to prevent unbounded data injection
  }
  return cleaned;
}

export async function appendEvent(params: {
  userId: string;
  type: string;
  data: Record<string, unknown>;
  ttlDays?: number;
}): Promise<void> {
  const db = await getDbOrThrow();
  const ttlDays = params.ttlDays ?? DEFAULT_EVENT_TTL_DAYS;
  const expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + ttlDays);

  const validatedData = validateEventData(params.data);

  await db.collection(U.USER_EVENTS).insertOne({
    userId: params.userId,
    type: params.type,
    data: validatedData,
    createdAt: new Date(),
    expireAt,
  });
}

// ─── Context Composition (tag-priority based) ───────────────

interface TagBucket {
  tag: string;
  max: number;
  label: string;
}

const TAG_PRIORITY: TagBucket[] = [
  { tag: 'child_profile', max: 3, label: '아이 프로필' },
  { tag: 'chat_extracted', max: 3, label: '대화에서 파악한 정보' },
  { tag: 'followed_facility', max: 2, label: '관심 시설' },
  { tag: 'settings', max: 1, label: '설정' },
];

export async function composeContext(userId: string): Promise<string> {
  try {
    const db = await getDbOrThrow();
    const sections: string[] = [];

    for (const bucket of TAG_PRIORITY) {
      const docs = await db.collection<UserMemoryDoc>(U.USER_MEMORIES)
        .find({ userId, isActive: true, tags: bucket.tag })
        .sort({ updatedAt: -1 })
        .limit(bucket.max)
        .toArray();

      if (docs.length === 0) continue;

      const lines = docs.map(mapMemoryDoc).map((m) => {
        const value = m.value.slice(0, MAX_MEMORY_VALUE_LENGTH);
        return `- ${m.memoryKey}: ${value}`;
      });
      sections.push(`[${bucket.label}]\n${lines.join('\n')}`);
    }

    if (sections.length === 0) return '';

    return `사용자 기억:\n${sections.join('\n\n')}`;
  } catch {
    return '';
  }
}

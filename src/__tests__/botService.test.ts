import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// ── Mocks ───────────────────────────────────────────────

function makeFindChain() {
  const chain: Record<string, unknown> = {};
  chain.sort = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.project = vi.fn(() => chain);
  chain.toArray = vi.fn(() => Promise.resolve([]));
  return chain;
}

const mockCollection = {
  findOne: vi.fn(),
  find: vi.fn(() => makeFindChain()),
  insertOne: vi.fn(() => Promise.resolve({ insertedId: new ObjectId() })),
  updateOne: vi.fn(() => Promise.resolve({ matchedCount: 1 })),
  deleteOne: vi.fn(() => Promise.resolve({ deletedCount: 1 })),
};

const mockDb = {
  collection: vi.fn(() => mockCollection),
};

vi.mock('../lib/server/env', () => ({
  env: { MONGODB_URI: 'mongodb://test', MONGODB_DB_NAME: 'test', AUTH_SECRET: 'test' },
}));

vi.mock('../lib/server/db', () => ({
  getDbOrThrow: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock('../lib/server/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../lib/server/collections', () => ({
  U: {
    CONVERSATIONS: 'conversations',
    DATA_BLOCKS: 'dataBlocks',
  },
}));

vi.mock('../lib/server/intentClassifier', () => ({
  classifyIntent: vi.fn(() => 'GENERAL'),
  generateSuggestions: vi.fn(() => ['어린이집 추천해 주세요', '입소 확률이 궁금해요']),
}));

vi.mock('../lib/server/responseGenerator', () => ({
  generateResponse: vi.fn(() => Promise.resolve('안녕하세요! 무엇을 도와드릴까요?')),
}));

import { processQuery, getConversations, getConversation, deleteConversation } from '../lib/server/botService';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── processQuery ────────────────────────────────────────

describe('processQuery', () => {
  it('returns conversation_id, message, and suggestions', async () => {
    mockCollection.find.mockReturnValueOnce(makeFindChain());

    const result = await processQuery({
      user_id: 'user1',
      message: '안녕하세요',
    });

    expect(result.conversation_id).toBeDefined();
    expect(result.message.role).toBe('assistant');
    expect(result.message.content).toBe('안녕하세요! 무엇을 도와드릴까요?');
    expect(result.suggestions).toHaveLength(2);
  });

  it('appends to existing conversation when conversation_id provided', async () => {
    const convId = new ObjectId();

    mockCollection.find.mockReturnValueOnce(makeFindChain());

    // Conversation history find
    mockCollection.findOne.mockResolvedValueOnce({
      _id: convId,
      messages: [{ role: 'user', content: '이전 메시지' }],
    });

    const result = await processQuery({
      user_id: 'user1',
      message: '후속 질문',
      conversation_id: convId.toString(),
    });

    expect(result.conversation_id).toBe(convId.toString());
    expect(mockCollection.updateOne).toHaveBeenCalledTimes(1);
  });

  it('gracefully handles response generation failure', async () => {
    const { generateResponse } = await import('../lib/server/responseGenerator');
    vi.mocked(generateResponse).mockRejectedValueOnce(new Error('API error'));

    mockCollection.find.mockReturnValueOnce(makeFindChain());

    const result = await processQuery({
      user_id: 'user1',
      message: '테스트',
    });

    expect(result.message.content).toContain('일시적인 오류');
  });
});

// ── Conversation CRUD ───────────────────────────────────

describe('getConversations', () => {
  it('returns empty list when no conversations', async () => {
    mockCollection.find.mockReturnValueOnce(makeFindChain());

    const result = await getConversations('user1');
    expect(result.conversations).toEqual([]);
  });
});

describe('getConversation', () => {
  it('returns null for invalid ObjectId', async () => {
    const result = await getConversation('not-valid-id');
    expect(result).toBeNull();
  });

  it('returns null when not found', async () => {
    mockCollection.findOne.mockResolvedValueOnce(null);
    const result = await getConversation(new ObjectId().toString());
    expect(result).toBeNull();
  });
});

describe('deleteConversation', () => {
  it('calls deleteOne with user_id ownership check', async () => {
    const convId = new ObjectId().toString();
    await deleteConversation(convId, 'user1');

    expect(mockCollection.deleteOne).toHaveBeenCalledWith({
      _id: expect.any(ObjectId),
      user_id: 'user1',
    });
  });

  it('skips delete for invalid id', async () => {
    await deleteConversation('bad', 'user1');
    expect(mockCollection.deleteOne).not.toHaveBeenCalled();
  });
});

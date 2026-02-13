import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { TOAlertDoc } from '../lib/server/dbTypes';

// ── Module-level mock state (safe for hoisting) ─────────

const mockSendMail = vi.fn(() => Promise.resolve());
const mockClose = vi.fn();

vi.mock('../lib/server/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: mockSendMail,
    close: mockClose,
  })),
}));

// Default env mock — tests override per case
let mockEnv = {
  SMTP_HOST: '',
  SMTP_USER: '',
  SMTP_PORT: 587,
  SMTP_PASS: '',
  SMTP_FROM: 'test@test.com',
};

vi.mock('../lib/server/env', () => ({
  get env() { return mockEnv; },
}));

// ── Helpers ─────────────────────────────────────────────

function makeAlert(overrides: Partial<TOAlertDoc> = {}): TOAlertDoc {
  return {
    _id: new ObjectId(),
    user_id: 'user1',
    subscription_id: 'sub1',
    facility_id: 'fac1',
    facility_name: '해피어린이집',
    age_class: 'age_2',
    detected_at: new Date(),
    estimated_slots: 2,
    confidence: 0.8,
    is_read: false,
    source: 'auto_detection',
    ...overrides,
  };
}

function smtpConfigured() {
  mockEnv = {
    SMTP_HOST: 'smtp.test',
    SMTP_PORT: 587,
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'test@test.com',
  };
}

import { sendToAlertEmails } from '../lib/server/emailService';

// ── Tests ───────────────────────────────────────────────

describe('sendToAlertEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to unconfigured
    mockEnv = { SMTP_HOST: '', SMTP_USER: '', SMTP_PORT: 587, SMTP_PASS: '', SMTP_FROM: 'test@test.com' };
  });

  it('returns 0 when SMTP is not configured', async () => {
    const mockDb = { collection: vi.fn() } as unknown as import('mongodb').Db;

    const result = await sendToAlertEmails(mockDb, [makeAlert()]);
    expect(result).toBe(0);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('groups alerts by user_id and sends one email per user', async () => {
    smtpConfigured();

    const mockFindOne = vi.fn()
      .mockResolvedValueOnce({ email: 'user1@test.com' })
      .mockResolvedValueOnce({ email: 'user2@test.com' });

    const mockDb = {
      collection: vi.fn(() => ({ findOne: mockFindOne })),
    } as unknown as import('mongodb').Db;

    const alerts = [
      makeAlert({ user_id: 'user1', facility_name: 'A어린이집' }),
      makeAlert({ user_id: 'user1', facility_name: 'B어린이집' }),
      makeAlert({ user_id: 'user2', facility_name: 'C어린이집' }),
    ];

    const sent = await sendToAlertEmails(mockDb, alerts);
    expect(sent).toBe(2);
    expect(mockSendMail).toHaveBeenCalledTimes(2);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('skips users without email', async () => {
    smtpConfigured();

    const mockDb = {
      collection: vi.fn(() => ({
        findOne: vi.fn().mockResolvedValueOnce(null),
      })),
    } as unknown as import('mongodb').Db;

    const sent = await sendToAlertEmails(mockDb, [makeAlert()]);
    expect(sent).toBe(0);
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});

describe('HTML escape in email content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('escapes special characters in facility names', async () => {
    smtpConfigured();

    let capturedHtml = '';
    mockSendMail.mockImplementationOnce((...args: unknown[]) => {
      const mail = args[0] as Record<string, unknown>;
      capturedHtml = mail.html as string;
      return Promise.resolve();
    });

    const mockDb = {
      collection: vi.fn(() => ({
        findOne: vi.fn().mockResolvedValueOnce({ email: 'x@test.com' }),
      })),
    } as unknown as import('mongodb').Db;

    await sendToAlertEmails(mockDb, [
      makeAlert({ facility_name: '<script>alert("xss")</script>' }),
    ]);

    expect(capturedHtml).not.toContain('<script>');
    expect(capturedHtml).toContain('&lt;script&gt;');
  });
});

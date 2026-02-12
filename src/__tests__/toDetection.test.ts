import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// ─── Mocks ──────────────────────────────────────────────

vi.mock('../lib/server/env', () => ({
  env: {
    MONGODB_URI: 'mongodb://test',
    MONGODB_DB_NAME: 'test',
    AUTH_SECRET: 'test-secret',
    TO_DETECTION_LOOKBACK_HOURS: 6,
    TO_DETECTION_DEDUP_HOURS: 24,
    SMTP_HOST: '',
    SMTP_PORT: 587,
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: 'test@test.com',
  },
}));

vi.mock('../lib/server/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../lib/server/emailService', () => ({
  sendToAlertEmails: vi.fn(() => Promise.resolve(0)),
}));

// ─── Helpers ────────────────────────────────────────────

function createMockDb(data: {
  snapshots?: Record<string, unknown>[];
  subscriptions?: Record<string, unknown>[];
  existingAlerts?: Record<string, unknown>[];
}) {
  const insertedAlerts: Record<string, unknown>[] = [];

  const collections: Record<string, unknown> = {
    waitlist_snapshots: {
      find: vi.fn(() => ({
        toArray: vi.fn(() => Promise.resolve(data.snapshots ?? [])),
      })),
    },
    to_subscriptions: {
      find: vi.fn(() => ({
        toArray: vi.fn(() => Promise.resolve(data.subscriptions ?? [])),
      })),
    },
    to_alerts: {
      find: vi.fn(() => ({
        project: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve(data.existingAlerts ?? [])),
        })),
        toArray: vi.fn(() => Promise.resolve(data.existingAlerts ?? [])),
      })),
      findOne: vi.fn(() => Promise.resolve(
        data.existingAlerts?.length ? data.existingAlerts[0] : null,
      )),
      insertMany: vi.fn((docs: Record<string, unknown>[]) => {
        insertedAlerts.push(...docs);
        return Promise.resolve({ insertedCount: docs.length });
      }),
      countDocuments: vi.fn(() => Promise.resolve(0)),
    },
  };

  const db = {
    collection: vi.fn((name: string) => collections[name]),
    _inserted: insertedAlerts,
  };

  return db;
}

const NOW = new Date('2026-02-12T08:00:00.000Z');

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    _id: new ObjectId(),
    facility_id: 'FAC001',
    snapshot_date: new Date(NOW.getTime() - 60 * 60 * 1000), // 1 hour ago
    waitlist_by_class: { '만2세': 5, '만3세': 3 },
    change: { to_detected: true, enrolled_delta: -2 },
    ...overrides,
  };
}

function makeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    _id: new ObjectId(),
    user_id: 'user-001',
    facility_id: 'FAC001',
    facility_name: '해피어린이집',
    target_classes: [],
    is_active: true,
    notification_preferences: { push: true, sms: false, email: false },
    created_at: new Date('2026-01-01'),
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────

describe('detectToEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it('returns zero counts when no snapshots have TO signals', async () => {
    const db = createMockDb({ snapshots: [] });
    const { detectToEvents } = await import('../lib/server/toDetectionService');

    const result = await detectToEvents(db as never);

    expect(result).toEqual({ scanned: 0, alerts_created: 0, emails_queued: 0 });
  });

  it('returns zero alerts when no subscriptions match', async () => {
    const db = createMockDb({
      snapshots: [makeSnapshot()],
      subscriptions: [],
    });
    const { detectToEvents } = await import('../lib/server/toDetectionService');

    const result = await detectToEvents(db as never);

    expect(result.scanned).toBe(1);
    expect(result.alerts_created).toBe(0);
  });

  it('creates alerts for matching subscriptions × age classes', async () => {
    const db = createMockDb({
      snapshots: [makeSnapshot()],
      subscriptions: [makeSubscription()], // empty target_classes = all
      existingAlerts: [], // no dedup hit
    });
    // Override findOne to always return null (no dedup)
    (db.collection('to_alerts') as { findOne: ReturnType<typeof vi.fn> }).findOne = vi.fn(() => Promise.resolve(null));

    const { detectToEvents } = await import('../lib/server/toDetectionService');
    const result = await detectToEvents(db as never);

    // snapshot has 2 age classes (만2세, 만3세) × 1 subscription = 2 alerts
    expect(result.alerts_created).toBe(2);
    expect(db._inserted).toHaveLength(2);

    const alert = db._inserted[0] as Record<string, unknown>;
    expect(alert).toMatchObject({
      user_id: 'user-001',
      facility_id: 'FAC001',
      facility_name: '해피어린이집',
      is_read: false,
      source: 'auto_detection',
    });
  });

  it('filters by target_classes when subscription specifies them', async () => {
    const db = createMockDb({
      snapshots: [makeSnapshot()],
      subscriptions: [makeSubscription({ target_classes: ['만2세'] })],
    });
    (db.collection('to_alerts') as { findOne: ReturnType<typeof vi.fn> }).findOne = vi.fn(() => Promise.resolve(null));

    const { detectToEvents } = await import('../lib/server/toDetectionService');
    const result = await detectToEvents(db as never);

    // Only 만2세 matched, not 만3세
    expect(result.alerts_created).toBe(1);
    expect((db._inserted[0] as Record<string, unknown>).age_class).toBe('만2세');
  });

  it('deduplicates: skips alert if one already exists within dedup window', async () => {
    const existingAlert = {
      _id: new ObjectId(),
      facility_id: 'FAC001',
      age_class: '만2세',
      user_id: 'user-001',
      detected_at: new Date(),
    };
    const db = createMockDb({
      snapshots: [makeSnapshot()],
      subscriptions: [makeSubscription({ target_classes: ['만2세'] })],
      existingAlerts: [existingAlert],
    });

    const { detectToEvents } = await import('../lib/server/toDetectionService');
    const result = await detectToEvents(db as never);

    expect(result.alerts_created).toBe(0);
    expect(db._inserted).toHaveLength(0);
  });

  it('uses enrolled_delta for estimated_slots', async () => {
    const db = createMockDb({
      snapshots: [makeSnapshot({
        waitlist_by_class: { '만1세': 2 },
        change: { to_detected: false, enrolled_delta: -3 },
      })],
      subscriptions: [makeSubscription({ target_classes: [] })],
    });
    (db.collection('to_alerts') as { findOne: ReturnType<typeof vi.fn> }).findOne = vi.fn(() => Promise.resolve(null));

    const { detectToEvents } = await import('../lib/server/toDetectionService');
    await detectToEvents(db as never);

    expect((db._inserted[0] as Record<string, unknown>).estimated_slots).toBe(3);
  });

  it('sets higher confidence when to_detected is true', async () => {
    const db = createMockDb({
      snapshots: [makeSnapshot({
        waitlist_by_class: { '만0세': 1 },
        change: { to_detected: true, enrolled_delta: -1 },
      })],
      subscriptions: [makeSubscription({ target_classes: [] })],
    });
    (db.collection('to_alerts') as { findOne: ReturnType<typeof vi.fn> }).findOne = vi.fn(() => Promise.resolve(null));

    const { detectToEvents } = await import('../lib/server/toDetectionService');
    await detectToEvents(db as never);

    expect((db._inserted[0] as Record<string, unknown>).confidence).toBe(0.85);
  });

  it('sets lower confidence when only enrolled_delta (no to_detected)', async () => {
    const db = createMockDb({
      snapshots: [makeSnapshot({
        waitlist_by_class: { '만0세': 1 },
        change: { to_detected: false, enrolled_delta: -1 },
      })],
      subscriptions: [makeSubscription({ target_classes: [] })],
    });
    (db.collection('to_alerts') as { findOne: ReturnType<typeof vi.fn> }).findOne = vi.fn(() => Promise.resolve(null));

    const { detectToEvents } = await import('../lib/server/toDetectionService');
    await detectToEvents(db as never);

    expect((db._inserted[0] as Record<string, unknown>).confidence).toBe(0.6);
  });

  it('falls back to "unknown" age class when no waitlist_by_class', async () => {
    const db = createMockDb({
      snapshots: [makeSnapshot({ waitlist_by_class: undefined })],
      subscriptions: [makeSubscription({ target_classes: [] })],
    });
    (db.collection('to_alerts') as { findOne: ReturnType<typeof vi.fn> }).findOne = vi.fn(() => Promise.resolve(null));

    const { detectToEvents } = await import('../lib/server/toDetectionService');
    await detectToEvents(db as never);

    expect(db._inserted).toHaveLength(1);
    expect((db._inserted[0] as Record<string, unknown>).age_class).toBe('unknown');
  });

  it('handles multiple facilities × multiple subscriptions', async () => {
    const db = createMockDb({
      snapshots: [
        makeSnapshot({ facility_id: 'FAC001', waitlist_by_class: { '만2세': 3 } }),
        makeSnapshot({ facility_id: 'FAC002', waitlist_by_class: { '만3세': 2 } }),
      ],
      subscriptions: [
        makeSubscription({ user_id: 'user-001', facility_id: 'FAC001', target_classes: [] }),
        makeSubscription({ user_id: 'user-002', facility_id: 'FAC001', target_classes: ['만2세'] }),
        makeSubscription({ user_id: 'user-003', facility_id: 'FAC002', facility_name: '별빛어린이집', target_classes: [] }),
      ],
    });
    (db.collection('to_alerts') as { findOne: ReturnType<typeof vi.fn> }).findOne = vi.fn(() => Promise.resolve(null));

    const { detectToEvents } = await import('../lib/server/toDetectionService');
    const result = await detectToEvents(db as never);

    // FAC001: user-001 gets 만2세(1), user-002 gets 만2세(1) = 2
    // FAC002: user-003 gets 만3세(1) = 1
    // Total = 3
    expect(result.alerts_created).toBe(3);
  });
});

// ─── detectToForFacility ────────────────────────────────

describe('detectToForFacility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it('scans only snapshots for the given facility', async () => {
    const db = createMockDb({
      snapshots: [makeSnapshot({ facility_id: 'FAC001' })],
      subscriptions: [makeSubscription({ facility_id: 'FAC001', target_classes: [] })],
    });
    (db.collection('to_alerts') as { findOne: ReturnType<typeof vi.fn> }).findOne = vi.fn(() => Promise.resolve(null));

    const { detectToForFacility } = await import('../lib/server/toDetectionService');
    const result = await detectToForFacility(db as never, 'FAC001');

    expect(result.scanned).toBe(1);
    expect(result.alerts_created).toBe(2); // 만2세 + 만3세

    // Verify the waitlist_snapshots query filtered by facility_id
    const findCall = (db.collection('waitlist_snapshots') as { find: ReturnType<typeof vi.fn> }).find;
    expect(findCall).toHaveBeenCalledWith(
      expect.objectContaining({ facility_id: 'FAC001' }),
    );
  });

  it('returns zeros when facility has no TO snapshots', async () => {
    const db = createMockDb({ snapshots: [], subscriptions: [] });

    const { detectToForFacility } = await import('../lib/server/toDetectionService');
    const result = await detectToForFacility(db as never, 'FAC999');

    expect(result).toEqual({ scanned: 0, alerts_created: 0, emails_queued: 0 });
  });
});

// ─── markAlertsReadSchema validation ────────────────────

describe('markAlertsReadSchema', () => {
  it('accepts valid ObjectId strings', async () => {
    const { markAlertsReadSchema } = await import('../lib/server/validation');
    const result = markAlertsReadSchema.safeParse({
      alert_ids: ['65a1f3d1f8b88c4b5e5f1001', '65a1f3d1f8b88c4b5e5f1002'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty array', async () => {
    const { markAlertsReadSchema } = await import('../lib/server/validation');
    const result = markAlertsReadSchema.safeParse({ alert_ids: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid ObjectId format', async () => {
    const { markAlertsReadSchema } = await import('../lib/server/validation');
    const result = markAlertsReadSchema.safeParse({ alert_ids: ['not-valid'] });
    expect(result.success).toBe(false);
  });

  it('rejects missing alert_ids', async () => {
    const { markAlertsReadSchema } = await import('../lib/server/validation');
    const result = markAlertsReadSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

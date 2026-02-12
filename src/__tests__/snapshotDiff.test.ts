import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// ─── Mocks ──────────────────────────────────────────────

vi.mock('../lib/server/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ─── Helpers ────────────────────────────────────────────

const facilityObjectId = new ObjectId();

function createMockDb(opts: {
  previousSnapshot?: { capacity_current?: number; snapshot_date: Date };
}) {
  const insertedDocs: Record<string, unknown>[] = [];

  const collections: Record<string, unknown> = {
    facility_snapshots: {
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          skip: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn(() =>
                Promise.resolve(
                  opts.previousSnapshot
                    ? [{
                        _id: new ObjectId(),
                        facility_id: facilityObjectId,
                        ...opts.previousSnapshot,
                      }]
                    : [],
                ),
              ),
            })),
          })),
        })),
      })),
    },
    waitlist_snapshots: {
      insertOne: vi.fn((doc: Record<string, unknown>) => {
        insertedDocs.push(doc);
        return Promise.resolve({ insertedId: new ObjectId() });
      }),
    },
  };

  const db = {
    collection: vi.fn((name: string) => collections[name]),
  };

  return { db, insertedDocs };
}

function makeNormalized(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'data_go_kr' as const,
    provider_id: 'FAC001',
    name: 'Test Facility',
    type: 'national_public' as const,
    status: 'active' as const,
    address: { full: '서울시 강남구', sido: '서울시', sigungu: '강남구' },
    location: { type: 'Point' as const, coordinates: [127.0, 37.5] as [number, number] },
    capacity_total: 50,
    capacity_current: 30,
    capacity_by_age: { age_0: 5, age_1: 10, age_2: 15 },
    raw_hash: 'abc123',
    ...overrides,
  };
}

function makeFacilityDoc() {
  return { _id: facilityObjectId } as { _id: ObjectId };
}

// ─── Tests ──────────────────────────────────────────────

describe('generateWaitlistSnapshot', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('first snapshot (no previous) → enrolled_delta=0, to_detected=null', async () => {
    const { generateWaitlistSnapshot } = await import(
      '../lib/server/facility/snapshotDiffService'
    );
    const { db, insertedDocs } = createMockDb({ previousSnapshot: undefined });

    await generateWaitlistSnapshot(db as never, makeNormalized(), makeFacilityDoc() as never);

    expect(insertedDocs).toHaveLength(1);
    expect(insertedDocs[0]).toMatchObject({
      facility_id: 'FAC001',
      change: { enrolled_delta: 0, to_detected: null },
    });
  });

  it('capacity decrease (30→28) → enrolled_delta=-2, to_detected=true', async () => {
    const { generateWaitlistSnapshot } = await import(
      '../lib/server/facility/snapshotDiffService'
    );
    const { db, insertedDocs } = createMockDb({
      previousSnapshot: { capacity_current: 30, snapshot_date: new Date('2025-01-01') },
    });

    await generateWaitlistSnapshot(
      db as never,
      makeNormalized({ capacity_current: 28 }),
      makeFacilityDoc() as never,
    );

    expect(insertedDocs).toHaveLength(1);
    expect(insertedDocs[0]).toMatchObject({
      change: { enrolled_delta: -2, to_detected: true },
    });
  });

  it('capacity increase (28→30) → enrolled_delta=+2, to_detected=false', async () => {
    const { generateWaitlistSnapshot } = await import(
      '../lib/server/facility/snapshotDiffService'
    );
    const { db, insertedDocs } = createMockDb({
      previousSnapshot: { capacity_current: 28, snapshot_date: new Date('2025-01-01') },
    });

    await generateWaitlistSnapshot(
      db as never,
      makeNormalized({ capacity_current: 30 }),
      makeFacilityDoc() as never,
    );

    expect(insertedDocs).toHaveLength(1);
    expect(insertedDocs[0]).toMatchObject({
      change: { enrolled_delta: 2, to_detected: false },
    });
  });

  it('capacity unchanged → enrolled_delta=0, to_detected=false', async () => {
    const { generateWaitlistSnapshot } = await import(
      '../lib/server/facility/snapshotDiffService'
    );
    const { db, insertedDocs } = createMockDb({
      previousSnapshot: { capacity_current: 30, snapshot_date: new Date('2025-01-01') },
    });

    await generateWaitlistSnapshot(
      db as never,
      makeNormalized({ capacity_current: 30 }),
      makeFacilityDoc() as never,
    );

    expect(insertedDocs).toHaveLength(1);
    expect(insertedDocs[0]).toMatchObject({
      change: { enrolled_delta: 0, to_detected: false },
    });
  });

  it('capacity_by_age → waitlist_by_class mapping', async () => {
    const { generateWaitlistSnapshot } = await import(
      '../lib/server/facility/snapshotDiffService'
    );
    const { db, insertedDocs } = createMockDb({ previousSnapshot: undefined });

    await generateWaitlistSnapshot(
      db as never,
      makeNormalized({
        capacity_by_age: { age_0: 3, age_1: 8, age_2: 12, age_5_plus: 2 },
      }),
      makeFacilityDoc() as never,
    );

    expect(insertedDocs).toHaveLength(1);
    expect(insertedDocs[0]).toMatchObject({
      waitlist_by_class: {
        '만0세': 3,
        '만1세': 8,
        '만2세': 12,
        '만5세이상': 2,
      },
    });
    // age_3, age_4 not present → should not appear
    const wbc = insertedDocs[0].waitlist_by_class as Record<string, number>;
    expect(wbc).not.toHaveProperty('만3세');
    expect(wbc).not.toHaveProperty('만4세');
  });

  it('no capacity_current → skips entirely', async () => {
    const { generateWaitlistSnapshot } = await import(
      '../lib/server/facility/snapshotDiffService'
    );
    const { db, insertedDocs } = createMockDb({ previousSnapshot: undefined });

    await generateWaitlistSnapshot(
      db as never,
      makeNormalized({ capacity_current: undefined }),
      makeFacilityDoc() as never,
    );

    expect(insertedDocs).toHaveLength(0);
  });
});

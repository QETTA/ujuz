/**
 * E2E test: TO detection pipeline
 *
 * Verifies the full flow:
 *   ingestBatch (mock data) → facility_snapshots + waitlist_snapshots
 *   → detectToEvents → to_alerts
 *
 * Usage: npx tsx scripts/e2e-to-pipeline.ts
 * Requires: MONGODB_URI in .env.local
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'kidsmap';

if (!MONGODB_URI) {
  console.error('MONGODB_URI not set in .env.local');
  process.exit(1);
}

// Collection names (mirroring U constants)
const COL = {
  FACILITY_SOURCES: 'facility_sources',
  FACILITIES: 'facilities',
  FACILITY_SNAPSHOTS: 'facility_snapshots',
  WAITLIST_SNAPSHOTS: 'waitlist_snapshots',
  TO_SUBSCRIPTIONS: 'to_subscriptions',
  TO_ALERTS: 'to_alerts',
};

// E2E test facility data
const TEST_PROVIDER_ID = `e2e-test-${Date.now()}`;
const TEST_USER_ID = `e2e-user-${Date.now()}`;

function makeRawFacility(capacityCurrent: string) {
  return {
    stcode: TEST_PROVIDER_ID,
    crname: 'E2E 테스트 어린이집',
    crstatusname: '정상',
    crtypename: '국공립',
    craddr: '서울시 강남구 테스트로 1',
    la: '37.5000',
    lo: '127.0000',
    crcapat: '50',
    crcapa: capacityCurrent,
    siession: '서울특별시',
    siession2: '강남구',
    child0_cnt: '5',
    child1_cnt: '10',
    child2_cnt: '15',
  };
}

async function main() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Connected to ${DB_NAME}\n`);

    // ── Cleanup previous test data ──
    for (const col of Object.values(COL)) {
      await db.collection(col).deleteMany({
        $or: [
          { provider_id: TEST_PROVIDER_ID },
          { facility_id: TEST_PROVIDER_ID },
          { user_id: TEST_USER_ID },
        ],
      });
    }
    // Also clean facilities collection by provider_id
    await db.collection(COL.FACILITIES).deleteMany({ provider_id: TEST_PROVIDER_ID });

    // ── Dynamic import to pick up env ──
    const { ingestBatch } = await import('../src/lib/server/facility/ingestService');
    const { detectToForFacility } = await import('../src/lib/server/toDetectionService');

    // ────────────────────────────────────────────────
    // Step 1: First ingest (capacity=30) — baseline
    // ────────────────────────────────────────────────
    console.log('═══ Step 1: First ingest (capacity=30) ═══');
    const result1 = await ingestBatch(db, [makeRawFacility('30') as never]);
    console.log('  ingest result:', result1);

    const snap1 = await db.collection(COL.FACILITY_SNAPSHOTS)
      .find({ facility_id: { $exists: true } })
      .sort({ snapshot_date: -1 })
      .limit(1)
      .toArray();

    const wsnap1 = await db.collection(COL.WAITLIST_SNAPSHOTS)
      .find({ facility_id: TEST_PROVIDER_ID })
      .sort({ snapshot_date: -1 })
      .limit(1)
      .toArray();

    console.log('  facility_snapshot created:', snap1.length > 0 ? '✓' : '✗');
    console.log('  waitlist_snapshot created:', wsnap1.length > 0 ? '✓' : '✗');

    if (wsnap1.length > 0) {
      console.log('  enrolled_delta:', wsnap1[0].change?.enrolled_delta);
      console.log('  to_detected:', wsnap1[0].change?.to_detected);
      console.log('  waitlist_by_class:', JSON.stringify(wsnap1[0].waitlist_by_class));
    }

    // Verify first snapshot: enrolled_delta=0, to_detected=null
    const firstOk = wsnap1.length > 0
      && wsnap1[0].change?.enrolled_delta === 0
      && wsnap1[0].change?.to_detected === null;
    console.log(`  → First snapshot assertion: ${firstOk ? 'PASS ✓' : 'FAIL ✗'}\n`);

    // ────────────────────────────────────────────────
    // Step 2: Second ingest (capacity=28) — TO signal
    // ────────────────────────────────────────────────
    // Need to change raw_hash so it's not skipped
    console.log('═══ Step 2: Second ingest (capacity=28, delta=-2) ═══');
    const raw2 = makeRawFacility('28');
    (raw2 as Record<string, string>)['_e2e_ts'] = String(Date.now()); // force hash change
    const result2 = await ingestBatch(db, [raw2 as never]);
    console.log('  ingest result:', result2);

    const wsnap2 = await db.collection(COL.WAITLIST_SNAPSHOTS)
      .find({ facility_id: TEST_PROVIDER_ID })
      .sort({ snapshot_date: -1 })
      .limit(1)
      .toArray();

    if (wsnap2.length > 0) {
      console.log('  enrolled_delta:', wsnap2[0].change?.enrolled_delta);
      console.log('  to_detected:', wsnap2[0].change?.to_detected);
    }

    const toOk = wsnap2.length > 0
      && wsnap2[0].change?.enrolled_delta === -2
      && wsnap2[0].change?.to_detected === true;
    console.log(`  → TO signal assertion: ${toOk ? 'PASS ✓' : 'FAIL ✗'}\n`);

    // ────────────────────────────────────────────────
    // Step 3: Create subscription + run detect
    // ────────────────────────────────────────────────
    console.log('═══ Step 3: TO detection with subscription ═══');
    await db.collection(COL.TO_SUBSCRIPTIONS).insertOne({
      _id: new ObjectId(),
      user_id: TEST_USER_ID,
      facility_id: TEST_PROVIDER_ID,
      facility_name: 'E2E 테스트 어린이집',
      target_classes: [],
      is_active: true,
      created_at: new Date(),
    });
    console.log('  subscription created: ✓');

    const detectResult = await detectToForFacility(db, TEST_PROVIDER_ID);
    console.log('  detection result:', detectResult);

    const alertOk = detectResult.alerts_created > 0;
    console.log(`  → Alert creation assertion: ${alertOk ? 'PASS ✓' : 'FAIL ✗'}\n`);

    // Verify alert contents
    const alerts = await db.collection(COL.TO_ALERTS)
      .find({ facility_id: TEST_PROVIDER_ID, user_id: TEST_USER_ID })
      .toArray();

    if (alerts.length > 0) {
      console.log('  alert facility_id:', alerts[0].facility_id);
      console.log('  alert estimated_slots:', alerts[0].estimated_slots);
      console.log('  alert confidence:', alerts[0].confidence);
      console.log('  alert source:', alerts[0].source);
    }

    // ────────────────────────────────────────────────
    // Step 4: Third ingest (capacity=30, increase) — no TO
    // ────────────────────────────────────────────────
    console.log('\n═══ Step 4: Third ingest (capacity=30, increase, no TO) ═══');
    const raw3 = makeRawFacility('30');
    (raw3 as Record<string, string>)['_e2e_ts'] = String(Date.now());
    const result3 = await ingestBatch(db, [raw3 as never]);
    console.log('  ingest result:', result3);

    const wsnap3 = await db.collection(COL.WAITLIST_SNAPSHOTS)
      .find({ facility_id: TEST_PROVIDER_ID })
      .sort({ snapshot_date: -1 })
      .limit(1)
      .toArray();

    if (wsnap3.length > 0) {
      console.log('  enrolled_delta:', wsnap3[0].change?.enrolled_delta);
      console.log('  to_detected:', wsnap3[0].change?.to_detected);
    }

    const noToOk = wsnap3.length > 0
      && wsnap3[0].change?.enrolled_delta === 2
      && wsnap3[0].change?.to_detected === false;
    console.log(`  → No-TO assertion: ${noToOk ? 'PASS ✓' : 'FAIL ✗'}\n`);

    // ────────────────────────────────────────────────
    // Summary
    // ────────────────────────────────────────────────
    const totalSnapshots = await db.collection(COL.WAITLIST_SNAPSHOTS)
      .countDocuments({ facility_id: TEST_PROVIDER_ID });

    console.log('═══ Summary ═══');
    console.log(`  waitlist_snapshots total: ${totalSnapshots}`);
    console.log(`  to_alerts total: ${alerts.length}`);

    const allPassed = firstOk && toOk && alertOk && noToOk;
    console.log(`\n  ${allPassed ? '🎉 ALL E2E TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    // ── Cleanup ──
    for (const col of Object.values(COL)) {
      await db.collection(col).deleteMany({
        $or: [
          { provider_id: TEST_PROVIDER_ID },
          { facility_id: TEST_PROVIDER_ID },
          { user_id: TEST_USER_ID },
        ],
      });
    }
    await db.collection(COL.FACILITIES).deleteMany({ provider_id: TEST_PROVIDER_ID });
    console.log('  cleanup: ✓');

    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('E2E test failed with error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();

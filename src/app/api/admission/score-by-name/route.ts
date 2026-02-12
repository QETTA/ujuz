import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { env } from '@/lib/server/env';
import { calculateAdmissionScoreV2, toAgeBandStr } from '@/lib/server/admissionEngineV2';
import { mapEngineToFrontend } from '@/lib/server/mappers';
import { errorResponse, getUserId, parseJson, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { extractRegionFromAddress } from '@/lib/server/extractRegion';
import { escapeRegex, REGION_SEARCH_MAP } from '@/lib/server/searchUtils';
import { checkRateLimit } from '@/lib/server/rateLimit';
import { admissionScoreByNameSchema, parseBody } from '@/lib/server/validation';
import { checkLimit, incrementFeatureUsage } from '@/lib/server/subscriptionService';
import { U } from '@/lib/server/collections';
import { mapLegacyEvidence, buildActionsCard } from '@/lib/server/admissionTypes';
import { ENGINE_VERSION } from '@/lib/server/admissionMath';
import type { PlaceDoc, AdmissionRequestDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

/** Save admission request history for analytics/explain linking */
async function saveAdmissionRequest(
  db: Awaited<ReturnType<typeof getDbOrThrow>>,
  userId: string,
  regionKey: string,
  ageBand: string,
  waitPos: number | undefined,
  priorityType: string,
  facilityIds: string[],
  engineResult: Awaited<ReturnType<typeof calculateAdmissionScoreV2>>,
) {
  try {
    const standardCards = engineResult.evidenceCards.map(mapLegacyEvidence);
    standardCards.push(buildActionsCard(engineResult.grade));

    await db.collection<Omit<AdmissionRequestDoc, '_id'>>(U.ADMISSION_REQUESTS).insertOne({
      anon_id: userId,
      region: regionKey,
      child_age_class: ageBand,
      wait_rank: waitPos,
      bonuses: [priorityType],
      facility_ids: facilityIds,
      grade: engineResult.grade,
      probability_6m: engineResult.probability,
      eta_range: { p50: engineResult.waitMonths.median, p90: engineResult.waitMonths.p80 },
      evidence_cards: standardCards,
      model_version: ENGINE_VERSION,
      created_at: new Date(),
    } as AdmissionRequestDoc);
  } catch {
    // Non-fatal: don't block the response
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);
    const { allowed } = await checkRateLimit(`admission:${userId}`, 10, 60_000);
    if (!allowed) {
      logRequest(req, 429, start, traceId);
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 });
    }

    // Check tier limit
    const limitCheck = await checkLimit(userId, 'admission_calc');
    if (!limitCheck.allowed) {
      logRequest(req, 403, start, traceId);
      return NextResponse.json({
        error: '입학 계산 횟수 한도에 도달했습니다',
        code: 'limit_exceeded',
        remaining: limitCheck.remaining,
        resetAt: limitCheck.resetAt,
        upgradeNeeded: limitCheck.upgradeNeeded,
      }, { status: 403 });
    }

    const body = await parseJson(req);
    const parsed = parseBody(admissionScoreByNameSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const data = parsed.data;

    const db = await getDbOrThrow();
    const col = db.collection<PlaceDoc>(env.MONGODB_PLACES_COLLECTION);

    // Step 1: Search with region filter
    const nameQuery: Record<string, unknown> = {
      name: { $regex: escapeRegex(data.facility_name), $options: 'i' },
    };

    if (data.region && REGION_SEARCH_MAP[data.region]) {
      const regionKeywords = REGION_SEARCH_MAP[data.region];
      nameQuery.address = { $regex: regionKeywords.join('|'), $options: 'i' };
    }

    let facility = await col.findOne(
      nameQuery as Partial<PlaceDoc>,
      { projection: { placeId: 1, facility_id: 1, name: 1, address: 1 } },
    );

    // Step 2: Retry without region filter if not found
    if (!facility && nameQuery.address) {
      const nameOnly: Record<string, unknown> = {
        name: { $regex: escapeRegex(data.facility_name), $options: 'i' },
      };
      facility = await col.findOne(
        nameOnly as Partial<PlaceDoc>,
        { projection: { placeId: 1, facility_id: 1, name: 1, address: 1 } },
      );
    }

    // Step 3: Use heuristic if facility not in DB (calculate with regional defaults)
    if (!facility) {
      const ageBandStr = toAgeBandStr(data.child_age_band);
      const syntheticId = `heuristic:${data.facility_name}`;

      const result = await calculateAdmissionScoreV2({
        facility_id: syntheticId,
        child_age_band: ageBandStr,
        waiting_position: data.waiting_position,
        priority_type: data.priority_type,
      });

      const frontend = mapEngineToFrontend(result, data.child_age_band);

      await incrementFeatureUsage(userId, 'admission_calc');
      await saveAdmissionRequest(db, userId, data.region ?? '', ageBandStr, data.waiting_position, data.priority_type, [syntheticId], result);
      logRequest(req, 200, start, traceId);
      return NextResponse.json({
        result: frontend,
        facility: {
          id: syntheticId,
          name: data.facility_name,
          address: '',
          regionKey: data.region ?? '',
        },
      });
    }

    const facilityId = facility.placeId ?? facility.facility_id ?? facility._id.toString();
    const ageBandStr = toAgeBandStr(data.child_age_band);

    const result = await calculateAdmissionScoreV2({
      facility_id: facilityId,
      child_age_band: ageBandStr,
      waiting_position: data.waiting_position,
      priority_type: data.priority_type,
    });

    const frontend = mapEngineToFrontend(result, data.child_age_band);
    const regionKey = extractRegionFromAddress(facility.address);

    await incrementFeatureUsage(userId, 'admission_calc');
    await saveAdmissionRequest(db, userId, regionKey ?? data.region ?? '', ageBandStr, data.waiting_position, data.priority_type, [facilityId], result);
    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      result: frontend,
      facility: {
        id: facilityId,
        name: facility.name,
        address: facility.address ?? '',
        regionKey: regionKey ?? data.region ?? '',
      },
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

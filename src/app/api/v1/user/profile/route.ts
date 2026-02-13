import { NextRequest, NextResponse } from 'next/server';
import { getUserId, errorResponse, parseJson, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { searchMemories, upsertMemory, appendEvent } from '@/lib/server/userMemoryService';
import { profileUpdateSchema, parseBody } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);
    const memories = await searchMemories(userId, { tags: ['child_profile'] });

    if (memories.length === 0) {
      logRequest(req, 200, start, traceId);
      return NextResponse.json({ profile: null });
    }

    const profile: Record<string, string> = {};
    for (const mem of memories) {
      profile[mem.memoryKey] = mem.value;
    }

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      profile: {
        nickname: profile['child_nickname'] ?? '',
        ageBand: profile['child_age_band'] ?? '',
        priorityType: profile['child_priority_type'] ?? '',
        regionKey: profile['child_region'] ?? '',
        interestedFacilities: (() => {
          try {
            return profile['child_interested_facilities']
              ? JSON.parse(profile['child_interested_facilities'])
              : [];
          } catch {
            return [];
          }
        })(),
      },
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

export async function PUT(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);
    const body = await parseJson(req);
    const parsed = parseBody(profileUpdateSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error, 'validation_error');
    }
    const data = parsed.data;

    const tag = 'child_profile';

    if (data.nickname !== undefined) {
      await upsertMemory({ userId, memoryKey: 'child_nickname', value: data.nickname, tags: [tag] });
    }
    if (data.ageBand !== undefined) {
      await upsertMemory({ userId, memoryKey: 'child_age_band', value: String(data.ageBand), tags: [tag] });
    }
    if (data.priorityType !== undefined) {
      await upsertMemory({ userId, memoryKey: 'child_priority_type', value: data.priorityType, tags: [tag] });
    }
    if (data.regionKey !== undefined) {
      await upsertMemory({ userId, memoryKey: 'child_region', value: data.regionKey, tags: [tag] });
    }
    if (data.interestedFacilities !== undefined) {
      await upsertMemory({
        userId,
        memoryKey: 'child_interested_facilities',
        value: JSON.stringify(data.interestedFacilities),
        tags: [tag],
      });
    }

    await appendEvent({
      userId,
      type: 'profile_updated',
      data: { nickname: data.nickname, ageBand: data.ageBand, priorityType: data.priorityType, regionKey: data.regionKey },
    });

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

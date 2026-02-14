import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

type FacilitySearchResult = {
  id: string;
  name: string;
  type: string;
  address: string;
  capacity_total: number;
  capacity_current: number;
  extended_care: boolean;
  location: unknown;
};

type FacilityDoc = {
  _id: { toString: () => string };
  name?: string;
  type?: string;
  address?: {
    full?: string;
  };
  capacity_total?: number;
  capacity_current?: number;
  extended_care?: boolean;
  location?: unknown;
};

const VALID_TYPES = new Set(['national_public', 'private', 'home', 'workplace', 'cooperative']);
const VALID_SORTS = new Set(['name', 'capacity', 'distance']);

function jsonError(status: number, error: string, message: string, details?: unknown) {
  return NextResponse.json({ error, message, details }, { status });
}

function parseNumeric(value: string | null, key: string): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${key} must be a valid number`);
  }
  return parsed;
}

function parseIntRange(value: string | null, key: string, fallback: number): number {
  if (value === null) return fallback;
  const parsed = parseNumeric(value, key);
  if (parsed === undefined) {
    return fallback;
  }
  const intValue = Math.trunc(parsed);
  if (String(intValue) !== value) {
    throw new Error(`${key} must be an integer`);
  }
  return intValue;
}

function parseBoolean(value: string | null, key: string): boolean | undefined {
  if (value === null) return undefined;
  if (value !== 'true' && value !== 'false') {
    throw new Error(`${key} must be 'true' or 'false'`);
  }
  return value === 'true';
}

export async function GET(req: NextRequest) {
  const startMs = Date.now();
  const traceId = getTraceId(req);

  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get('q');
    const region = searchParams.get('region');
    const type = searchParams.get('type');
    const extendedCareRaw = searchParams.get('extended_care');
    const capacityMinRaw = searchParams.get('capacity_min');
    const capacityMaxRaw = searchParams.get('capacity_max');
    const hasVacancyRaw = searchParams.get('has_vacancy');
    const limitRaw = searchParams.get('limit');
    const offsetRaw = searchParams.get('offset');
    const sort = searchParams.get('sort') ?? 'name';
    const latRaw = searchParams.get('lat');
    const lngRaw = searchParams.get('lng');

    const limit = parseIntRange(limitRaw, 'limit', 20);
    const offset = parseIntRange(offsetRaw, 'offset', 0);

    if (limit < 0 || offset < 0) {
      const res = jsonError(400, 'BAD_REQUEST', 'limit and offset must be non-negative');
      logRequest(req, 400, startMs, traceId);
      return res;
    }

    if (limit > 100) {
      const res = jsonError(400, 'BAD_REQUEST', 'limit must be <= 100');
      logRequest(req, 400, startMs, traceId);
      return res;
    }

    if (!VALID_SORTS.has(sort)) {
      const res = jsonError(400, 'BAD_REQUEST', 'sort must be name, capacity, or distance');
      logRequest(req, 400, startMs, traceId);
      return res;
    }

    const extended_care = parseBoolean(extendedCareRaw, 'extended_care');
    const has_vacancy = parseBoolean(hasVacancyRaw, 'has_vacancy');

    const capacity_min = parseNumeric(capacityMinRaw, 'capacity_min');
    const capacity_max = parseNumeric(capacityMaxRaw, 'capacity_max');

    if (capacity_min !== undefined && capacity_max !== undefined && capacity_min > capacity_max) {
      const res = jsonError(400, 'BAD_REQUEST', 'capacity_min cannot be greater than capacity_max');
      logRequest(req, 400, startMs, traceId);
      return res;
    }

    const filter: Record<string, unknown> = {};

    if (q?.trim()) {
      filter.name = { $regex: q.trim(), $options: 'i' };
    }

    if (region?.trim()) {
      const term = region.trim();
      filter.$or = [
        { 'address.sido': { $regex: term, $options: 'i' } },
        { 'address.sigungu': { $regex: term, $options: 'i' } },
        { 'address.full': { $regex: term, $options: 'i' } },
      ];
    }

    if (type?.trim()) {
      const types = type
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      const invalidTypes = types.filter((item) => !VALID_TYPES.has(item));
      if (invalidTypes.length > 0) {
        const res = jsonError(400, 'BAD_REQUEST', 'Invalid facility type', {
          invalid_types: invalidTypes,
          allowed_types: [...VALID_TYPES],
        });
        logRequest(req, 400, startMs, traceId);
        return res;
      }

      filter.type = { $in: types };
    }

    if (extended_care !== undefined) {
      filter.extended_care = extended_care;
    }

    const capacityFilter: Record<string, number> = {};
    if (capacity_min !== undefined) capacityFilter.$gte = capacity_min;
    if (capacity_max !== undefined) capacityFilter.$lte = capacity_max;
    if (Object.keys(capacityFilter).length > 0) {
      filter.capacity_total = capacityFilter;
    }

    if (has_vacancy === true) {
      filter.$expr = { $lt: ['$capacity_current', '$capacity_total'] };
    }

    if (sort === 'distance') {
      const lat = parseNumeric(latRaw, 'lat');
      const lng = parseNumeric(lngRaw, 'lng');

      if (lat === undefined || lng === undefined) {
        const res = jsonError(400, 'BAD_REQUEST', 'lat and lng are required when sort=distance');
        logRequest(req, 400, startMs, traceId);
        return res;
      }

      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        },
      };
    }

    const db = await getDbOrThrow();
    const col = db.collection(U.FACILITIES);

    const total = await col.countDocuments(filter);

    const cursor = col.find(filter);
    if (sort === 'name') {
      cursor.sort({ name: 1, _id: 1 });
    } else if (sort === 'capacity') {
      cursor.sort({ capacity_total: -1, _id: 1 });
    }

    const docs = await cursor.skip(offset).limit(limit).toArray();
    const items: FacilitySearchResult[] = docs.map((doc) => {
      const typedDoc = doc as FacilityDoc;
      const address = typedDoc.address?.full ?? '';

      return {
        id: typedDoc._id.toString(),
        name: typedDoc.name ?? '',
        type: typedDoc.type ?? '',
        address,
        capacity_total: typedDoc.capacity_total ?? 0,
        capacity_current: typedDoc.capacity_current ?? 0,
        extended_care: typedDoc.extended_care ?? false,
        location: typedDoc.location ?? null,
      };
    });

    const response = {
      items,
      total,
      limit,
      offset,
    };

    logRequest(req, 200, startMs, traceId);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';

    if (error instanceof Error && /must be/.test(error.message)) {
      const res = jsonError(400, 'BAD_REQUEST', message);
      logRequest(req, 400, startMs, traceId);
      return res;
    }

    logger.error('facility search failed', {
      traceId,
      message,
    });

    const res = jsonError(500, 'INTERNAL_ERROR', 'Internal server error');
    logRequest(req, 500, startMs, traceId);
    return res;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { errors } from '@/lib/server/apiError';
import { errorResponse, getTraceId, logRequest, parseJson } from '@/lib/server/apiHelpers';
import { requirePartner } from '@/lib/server/authPartner';
import { U } from '@/lib/server/collections';
import { getDbOrThrow } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/facility/adminAuth';

export const runtime = 'nodejs';

const partnerProfilePatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  address: z.string().trim().min(1).max(240).optional(),
  phone: z.string().trim().min(1).max(40).optional(),
}).refine(
  (value) => value.name !== undefined || value.address !== undefined || value.phone !== undefined,
  { message: 'name, address, phone 중 최소 1개가 필요합니다.' },
);

type LeadCountAgg = {
  _id?: unknown;
  count?: unknown;
};

function toIso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

function readText(raw: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return '';
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function PATCH(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const partner = await requirePartner(req);
    const body = await parseJson(req);
    const parsed = partnerProfilePatchSchema.safeParse(body);

    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error.message, 'validation_error');
    }

    const updateFields: Record<string, unknown> = {
      updated_at: new Date(),
    };
    if (parsed.data.name !== undefined) {
      updateFields.name = parsed.data.name;
    }
    if (parsed.data.address !== undefined) {
      updateFields.address = parsed.data.address;
    }
    if (parsed.data.phone !== undefined) {
      updateFields.phone = parsed.data.phone;
    }

    const db = await getDbOrThrow();
    const result = await db.collection(U.PARTNERS).updateOne(
      { _id: partner.doc_id },
      { $set: updateFields },
    );

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ updated: result.matchedCount > 0 });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const db = await getDbOrThrow();
    const adminKey = req.headers.get('x-admin-key');

    if (adminKey) {
      requireAdmin(req);

      const [partners, leadCounts] = await Promise.all([
        db.collection(U.PARTNERS).find({}, {
          projection: {
            org_id: 1,
            partner_id: 1,
            name: 1,
            address: 1,
            phone: 1,
            created_at: 1,
            updated_at: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        }).sort({ updated_at: -1, created_at: -1 }).toArray(),
        db.collection(U.LEADS).aggregate<LeadCountAgg>([
          {
            $addFields: {
              _org_id: {
                $ifNull: ['$org_id', '$partner_id'],
              },
            },
          },
          {
            $group: {
              _id: '$_org_id',
              count: { $sum: 1 },
            },
          },
        ]).toArray(),
      ]);

      const leadCountMap = new Map<string, number>();
      for (const row of leadCounts) {
        if (typeof row._id !== 'string' || row._id.trim().length === 0) continue;
        leadCountMap.set(row._id, Math.max(0, Math.round(toNumber(row.count))));
      }

      const orgs = partners.map((partner) => {
        const raw = partner as Record<string, unknown>;
        const orgId = readText(raw, ['org_id', 'partner_id']) || String(partner._id);
        const createdAt = toIso(raw.created_at ?? raw.createdAt);
        const updatedAt = toIso(raw.updated_at ?? raw.updatedAt);

        return {
          org_id: orgId,
          name: readText(raw, ['name']),
          address: readText(raw, ['address']),
          phone: readText(raw, ['phone']),
          leads_count: leadCountMap.get(orgId) ?? 0,
          created_at: createdAt,
          updated_at: updatedAt,
        };
      });

      logRequest(req, 200, start, traceId);
      return NextResponse.json({ orgs });
    }

    const partner = await requirePartner(req);
    const partnerDoc = await db.collection(U.PARTNERS).findOne({ _id: partner.doc_id });
    const raw = (partnerDoc ?? {}) as Record<string, unknown>;

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      profile: {
        org_id: partner.org_id,
        name: readText(raw, ['name']) || partner.name,
        address: readText(raw, ['address']),
        phone: readText(raw, ['phone']),
      },
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

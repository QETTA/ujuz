import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { errors } from '@/lib/server/apiError';
import { errorResponse, getTraceId, logRequest, parseJson } from '@/lib/server/apiHelpers';
import { requirePartner } from '@/lib/server/authPartner';
import { U } from '@/lib/server/collections';
import { getDbOrThrow } from '@/lib/server/db';
import { AppError } from '@/lib/server/errors';
import { requireAdmin } from '@/lib/server/facility/adminAuth';
import { appendEvent } from '@/lib/server/userMemoryService';

export const runtime = 'nodejs';

const LEAD_STATUSES = ['new', 'in_progress', 'done'] as const;

type LeadStatus = (typeof LEAD_STATUSES)[number];

type LeadDoc = {
  lead_id: string;
  partner_id: string;
  org_id: string;
  partner_name?: string;
  parent_name: string;
  child_age: number;
  message: string;
  status: LeadStatus;
  created_at: Date;
  updated_at: Date;
  status_updated_at?: Date;
};

const createLeadSchema = z.object({
  parent_name: z.string().trim().min(1).max(80),
  child_age: z.coerce.number().int().min(0).max(13),
  message: z.string().trim().min(1).max(1000),
});

const updateLeadStatusSchema = z.object({
  lead_id: z.string().trim().min(1).max(120),
  status: z.enum(LEAD_STATUSES),
});

function parseStatusParam(value: string | null): LeadStatus | null {
  if (!value) return null;
  if ((LEAD_STATUSES as readonly string[]).includes(value)) {
    return value as LeadStatus;
  }
  throw new AppError('status는 new/in_progress/done 중 하나여야 합니다.', 400, 'validation_error');
}

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

function normalizeStatus(value: unknown): LeadStatus {
  if (typeof value === 'string' && (LEAD_STATUSES as readonly string[]).includes(value)) {
    return value as LeadStatus;
  }
  return 'new';
}

function generateLeadId(): string {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `lead_${now}${rand}`;
}

function toLeadItem(doc: Record<string, unknown>) {
  const leadId = readText(doc, ['lead_id']) || String(doc._id ?? '');
  const status = normalizeStatus(doc.status);

  return {
    id: leadId,
    org_id: readText(doc, ['org_id', 'partner_id']),
    partner_name: readText(doc, ['partner_name', 'org_name', 'name']),
    status,
    parent_name: readText(doc, ['parent_name']),
    child_age: Math.max(0, Math.round(toNumber(doc.child_age))),
    message: readText(doc, ['message']),
    created_at: toIso(doc.created_at ?? doc.createdAt) ?? '',
    updated_at: toIso(doc.updated_at ?? doc.updatedAt) ?? '',
  };
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const partner = await requirePartner(req);
    const body = await parseJson(req);
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error.message, 'validation_error');
    }

    const db = await getDbOrThrow();
    const now = new Date();
    const leadId = generateLeadId();
    const leadDoc: LeadDoc = {
      lead_id: leadId,
      partner_id: partner.partner_id,
      org_id: partner.org_id,
      partner_name: partner.name || undefined,
      parent_name: parsed.data.parent_name,
      child_age: parsed.data.child_age,
      message: parsed.data.message,
      status: 'new',
      created_at: now,
      updated_at: now,
      status_updated_at: now,
    };

    await db.collection(U.LEADS).insertOne(leadDoc);
    await appendEvent({
      userId: `partner:${partner.org_id}`,
      type: 'b2b_lead_received',
      data: {
        lead_id: leadId,
        org_id: partner.org_id,
        child_age: parsed.data.child_age,
        status: 'new',
      },
    });

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ lead_id: leadId });
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
    const statusFilter = parseStatusParam(req.nextUrl.searchParams.get('status'));
    const adminKey = req.headers.get('x-admin-key');
    const query: Record<string, unknown> = {};

    if (statusFilter) {
      query.status = statusFilter;
    }

    if (adminKey) {
      requireAdmin(req);
    } else {
      const partner = await requirePartner(req);
      query.$or = [
        { org_id: partner.org_id },
        { partner_id: partner.partner_id },
      ];
    }

    const leads = await db.collection(U.LEADS)
      .find(query)
      .sort({ created_at: -1 })
      .limit(300)
      .toArray();

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      leads: leads.map((lead) => toLeadItem(lead as Record<string, unknown>)),
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

export async function PATCH(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    requireAdmin(req);

    const body = await parseJson(req);
    const parsed = updateLeadStatusSchema.safeParse(body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error.message, 'validation_error');
    }

    const db = await getDbOrThrow();
    const existing = await db.collection(U.LEADS).findOne({ lead_id: parsed.data.lead_id });
    if (!existing) {
      throw new AppError('리드를 찾을 수 없습니다.', 404, 'lead_not_found');
    }

    const prevStatus = normalizeStatus(existing.status);
    const nextStatus = parsed.data.status;
    const now = new Date();

    await db.collection(U.LEADS).updateOne(
      { lead_id: parsed.data.lead_id },
      {
        $set: {
          status: nextStatus,
          updated_at: now,
          status_updated_at: now,
        },
      },
    );

    if (prevStatus !== nextStatus) {
      const raw = existing as Record<string, unknown>;
      await appendEvent({
        userId: 'admin:b2b',
        type: 'b2b_lead_status_change',
        data: {
          lead_id: parsed.data.lead_id,
          from_status: prevStatus,
          to_status: nextStatus,
          org_id: readText(raw, ['org_id', 'partner_id']),
        },
      });
    }

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ updated: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

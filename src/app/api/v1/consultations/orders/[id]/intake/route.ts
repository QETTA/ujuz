import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errors } from '@/lib/server/apiError';
import { errorResponse, getTraceId, getUserId, logRequest } from '@/lib/server/apiHelpers';

export const runtime = 'nodejs';

const ORDERS_COLLECTION = 'orders';
const MAX_ANSWER_LENGTH = 1000;

const REQUIRED_QUESTION_IDS = [
  'target_region',
  'desired_start_month',
  'child_age_years',
  'household_type',
  'top_priority',
] as const;

const OPTIONAL_QUESTION_IDS = [
  'preferred_facility_1',
  'preferred_facility_2',
  'budget_range',
  'visit_availability',
  'additional_notes',
] as const;

const ALLOWED_QUESTION_IDS = [...REQUIRED_QUESTION_IDS, ...OPTIONAL_QUESTION_IDS] as const;

type OrderStatus = 'DRAFT' | 'INTAKE_SUBMITTED' | 'PAID' | 'BOOKED' | 'COMPLETED';

interface ConsultationOrderDoc {
  user_id: string;
  order_id: string;
  status: OrderStatus;
  answers?: Record<string, string>;
  intake_submitted_at?: Date;
  updated_at: Date;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

function normalizeAnswers(value: unknown): { ok: true; data: Record<string, string> } | { ok: false; message: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, message: 'answers must be an object' };
  }

  const input = value as Record<string, unknown>;
  const normalized: Record<string, string> = {};

  for (const key of ALLOWED_QUESTION_IDS) {
    const raw = input[key];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== 'string') {
      return { ok: false, message: `${key} must be a string` };
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length > MAX_ANSWER_LENGTH) {
      return { ok: false, message: `${key} must be ${MAX_ANSWER_LENGTH} characters or fewer` };
    }
    normalized[key] = trimmed;
  }

  return { ok: true, data: normalized };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const { id: orderId } = await params;
    if (!orderId || orderId.length > 128 || !/^[A-Za-z0-9_-]+$/.test(orderId)) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('유효하지 않은 주문 ID입니다', 'invalid_order_id');
    }

    const userId = await getUserId(req);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body) || !('answers' in body)) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('answers is required', 'validation_error');
    }

    const parsedAnswers = normalizeAnswers((body as { answers: unknown }).answers);
    if (!parsedAnswers.ok) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsedAnswers.message, 'validation_error');
    }

    const missingRequired = REQUIRED_QUESTION_IDS.filter((id) => !parsedAnswers.data[id]);
    if (missingRequired.length > 0) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('필수 질문 응답이 누락되었습니다', 'missing_required_answers', {
        missing: missingRequired,
      });
    }

    const db = await getDbOrThrow();
    const updateResult = await db.collection<ConsultationOrderDoc>(ORDERS_COLLECTION).updateOne(
      { order_id: orderId, user_id: userId },
      {
        $set: {
          answers: parsedAnswers.data,
          status: 'INTAKE_SUBMITTED',
          intake_submitted_at: new Date(),
          updated_at: new Date(),
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('주문을 찾을 수 없습니다', 'order_not_found');
    }

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ status: 'INTAKE_SUBMITTED' });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

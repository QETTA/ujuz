import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errors } from '@/lib/server/apiError';
import { errorResponse, getTraceId, getUserId, logRequest } from '@/lib/server/apiHelpers';

export const runtime = 'nodejs';

const ORDERS_COLLECTION = 'orders';

const PACKAGE_CATALOG = {
  pkg_basic: { tier: 'basic', amount_krw: 49000 },
  pkg_standard: { tier: 'standard', amount_krw: 99000 },
  pkg_premium: { tier: 'premium', amount_krw: 149000 },
} as const;

type PackageId = keyof typeof PACKAGE_CATALOG;
type OrderStatus = 'DRAFT' | 'INTAKE_SUBMITTED' | 'PAID' | 'BOOKED' | 'COMPLETED';

interface ConsultationOrderDoc {
  user_id: string;
  order_id: string;
  order_no: string;
  package_id: PackageId;
  tier: (typeof PACKAGE_CATALOG)[PackageId]['tier'];
  amount_krw: number;
  status: OrderStatus;
  answers?: Record<string, string>;
  created_at: Date;
  updated_at: Date;
  intake_submitted_at?: Date;
}

function isPackageId(value: unknown): value is PackageId {
  return typeof value === 'string' && value in PACKAGE_CATALOG;
}

function generateOrderId(): string {
  const ts = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `ord_${ts}${random}`;
}

function generateOrderNo(): string {
  const year = new Date().getFullYear();
  const sequence = `${Date.now() % 1_000_000}`.padStart(6, '0');
  return `UJZ-${year}-${sequence}`;
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Request body must be a JSON object', 'validation_error');
    }

    const rawPackageId = 'package_id' in body ? body.package_id : 'pkg_standard';
    if (!isPackageId(rawPackageId)) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('유효하지 않은 package_id 입니다', 'invalid_package_id');
    }

    const packageInfo = PACKAGE_CATALOG[rawPackageId];
    const orderId = generateOrderId();
    const orderNo = generateOrderNo();

    const orderDoc: ConsultationOrderDoc = {
      user_id: userId,
      order_id: orderId,
      order_no: orderNo,
      package_id: rawPackageId,
      tier: packageInfo.tier,
      amount_krw: packageInfo.amount_krw,
      status: 'DRAFT',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const db = await getDbOrThrow();
    await db.collection<ConsultationOrderDoc>(ORDERS_COLLECTION).insertOne(orderDoc);

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      order_id: orderDoc.order_id,
      status: orderDoc.status,
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

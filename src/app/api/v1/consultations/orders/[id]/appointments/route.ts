import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse, getTraceId, getUserId, logRequest, parseJson } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const orderIdSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, {
  message: '유효한 orderId가 필요합니다',
});

const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/;

const preferredTimeSchema = z
  .string()
  .regex(isoDateTimeRegex, 'preferred_times는 ISO 날짜/시간 형식이어야 합니다')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), '유효하지 않은 날짜/시간이 포함되어 있습니다')
  .refine((value) => new Date(value).getTime() > Date.now(), '희망 시간은 현재 시각 이후여야 합니다');

const createAppointmentBodySchema = z.object({
  preferred_times: z.array(preferredTimeSchema).length(3, 'preferred_times는 정확히 3개여야 합니다'),
}).superRefine((value, ctx) => {
  if (new Set(value.preferred_times).size !== value.preferred_times.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['preferred_times'],
      message: '희망 시간 3개는 서로 달라야 합니다',
    });
  }
});

export async function POST(req: NextRequest, context: RouteContext) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const { id } = await context.params;

    const parsedOrderId = orderIdSchema.safeParse(id);
    if (!parsedOrderId.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsedOrderId.error.issues[0]?.message ?? '유효한 orderId가 필요합니다', 'validation_error');
    }

    const rawBody = await parseJson(req);
    const parsedBody = createAppointmentBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(
        parsedBody.error.issues[0]?.message ?? '요청 값이 올바르지 않습니다',
        'validation_error',
        parsedBody.error.flatten(),
      );
    }

    const orderId = parsedOrderId.data;
    const preferredTimes = parsedBody.data.preferred_times;

    const db = await getDbOrThrow();
    const orders = db.collection(U.ORDERS);

    const order = await orders.findOne(
      { order_id: orderId, user_id: userId },
      { projection: { _id: 1 } },
    );

    if (!order) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('주문을 찾을 수 없습니다', 'order_not_found');
    }

    const appointmentId = `apt_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const status = 'REQUESTED' as const;
    const now = new Date();

    await db.collection(U.APPOINTMENTS).insertOne({
      appointment_id: appointmentId,
      order_id: orderId,
      user_id: userId,
      preferred_times: preferredTimes,
      status,
      created_at: now,
      updated_at: now,
    });

    await orders.updateOne(
      { order_id: orderId, user_id: userId },
      {
        $set: {
          appointment_id: appointmentId,
          appointment_status: status,
          updated_at: now,
        },
      },
    );

    logger.info('consult_booking_submit', {
      order_id: orderId,
      appointment_id: appointmentId,
      status,
    });

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ appointment_id: appointmentId, status });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

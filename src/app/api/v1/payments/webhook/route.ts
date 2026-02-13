import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { logger } from '@/lib/server/logger';
import { cancelSubscription } from '@/lib/server/subscriptionService';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, data } = body as {
      eventType: string;
      data: { paymentKey: string; orderId: string; status: string };
    };

    logger.info('Toss webhook received', { eventType, orderId: data?.orderId });

    const db = await getDbOrThrow();
    const paymentRecord = await db.collection('payments').findOne({ order_id: data?.orderId });
    
    if (!paymentRecord) {
      logger.warn('Webhook: payment record not found', { orderId: data?.orderId });
      return NextResponse.json({ ok: true }); // Return 200 to prevent retries
    }

    switch (data?.status) {
      case 'CANCELED':
      case 'PARTIAL_CANCELED':
        await db.collection('payments').updateOne(
          { order_id: data.orderId },
          { $set: { status: 'cancelled', cancelled_at: new Date() } },
        );
        // Cancel subscription if payment was cancelled
        if (paymentRecord.user_id) {
          try {
            await cancelSubscription(paymentRecord.user_id);
          } catch {
            // May not have active subscription
          }
        }
        break;
      
      case 'ABORTED':
      case 'EXPIRED':
        await db.collection('payments').updateOne(
          { order_id: data.orderId },
          { $set: { status: 'failed' } },
        );
        break;
        
      default:
        logger.info('Webhook: unhandled status', { status: data?.status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('Webhook processing error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: true }); // Always return 200
  }
}

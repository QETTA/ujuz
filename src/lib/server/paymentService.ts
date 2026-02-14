import type { Db, Document, WithId } from 'mongodb';
import { U } from './collections';
import { logger } from './logger';

const TOSS_BASE_URL = 'https://api.tosspayments.com/v1';

export interface PaymentInitiation {
  order_id: string;
  amount: number;
  order_name: string;
  customer_name?: string;
  customer_email?: string;
  success_url: string;
  fail_url: string;
}

export interface PaymentConfirmation {
  payment_key: string;
  order_id: string;
  amount: number;
}

export interface PaymentRecord {
  user_id: string;
  payment_key: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
  plan_tier: string;
  billing_cycle: string;
  toss_response?: Record<string, unknown>;
  created_at: Date;
  confirmed_at?: Date;
  cancelled_at?: Date;
  cancel_reason?: string;
}

export function generateOrderId(userId: string, planTier: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `UJUZ-${planTier.toUpperCase()}-${timestamp}-${random}`;
}

export async function createPaymentRecord(
  db: Db,
  userId: string,
  orderId: string,
  amount: number,
  planTier: string,
  billingCycle: string,
): Promise<string> {
  try {
    const record: PaymentRecord = {
      user_id: userId,
      payment_key: '',
      order_id: orderId,
      amount,
      status: 'pending',
      plan_tier: planTier,
      billing_cycle: billingCycle,
      created_at: new Date(),
    };

    const result = await db.collection(U.PAYMENTS).insertOne(record as Document);
    return result.insertedId.toString();
  } catch (error) {
    logger.error('Failed to create payment record', { error: error instanceof Error ? error.message : String(error), context: 'createPaymentRecord' });
    throw error;
  }
}

export async function confirmPayment(
  db: Db,
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = db.collection(U.PAYMENTS);
    const payment = await collection.findOne({ order_id: orderId });

    if (!payment) {
      const message = 'Payment record not found';
      logger.error(message, { orderId, context: 'confirmPayment' });
      return { success: false, error: message };
    }

    if (payment.amount !== amount) {
      const message = 'Amount mismatch';
      logger.error(message, { orderId, amount, expectedAmount: payment.amount, context: 'confirmPayment' });
      return { success: false, error: message };
    }

    if (payment.status === 'confirmed') {
      return { success: true };
    }

    if (payment.status === 'cancelled') {
      const message = 'Payment already cancelled';
      logger.error(message, { orderId, context: 'confirmPayment' });
      return { success: false, error: message };
    }

    const response = await tossRequest<{ [key: string]: unknown }>(
      'POST',
      '/payments/confirm',
      {
        paymentKey,
        orderId,
        amount,
      } as Record<string, unknown>,
    );

    if (!response.ok) {
      const message = response.error ?? 'Failed to confirm payment with Toss';
      logger.error(message, { orderId, tossError: response.error, context: 'confirmPayment' });
      return { success: false, error: message };
    }

    await collection.updateOne(
      { _id: payment._id },
      {
        $set: {
          status: 'confirmed',
          payment_key: paymentKey,
          confirmed_at: new Date(),
          toss_response: response.data,
        } as Record<string, unknown>,
      },
    );

    return { success: true };
  } catch (error) {
    logger.error('Failed to confirm payment', { error: error instanceof Error ? error.message : String(error), paymentKey, orderId, context: 'confirmPayment' });
    const message = error instanceof Error ? error.message : 'Failed to confirm payment';
    return { success: false, error: message };
  }
}

export async function cancelPayment(
  db: Db,
  paymentKey: string,
  cancelReason: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const collection = db.collection(U.PAYMENTS);
    const payment = await collection.findOne({ payment_key: paymentKey });

    if (!payment) {
      const message = 'Payment record not found';
      logger.error(message, { paymentKey, context: 'cancelPayment' });
      return { success: false, error: message };
    }

    if (payment.status === 'cancelled') {
      return { success: true };
    }

    const response = await tossRequest<{ [key: string]: unknown }>(
      'POST',
      `/payments/${encodeURIComponent(paymentKey)}/cancel`,
      { cancelReason } as Record<string, unknown>,
    );

    if (!response.ok) {
      const message = response.error ?? 'Failed to cancel payment with Toss';
      logger.error(message, { paymentKey, tossError: response.error, context: 'cancelPayment' });
      return { success: false, error: message };
    }

    await collection.updateOne(
      { payment_key: paymentKey },
      {
        $set: {
          status: 'cancelled',
          cancel_reason: cancelReason,
          cancelled_at: new Date(),
          toss_response: response.data,
        } as Record<string, unknown>,
      },
    );

    return { success: true };
  } catch (error) {
    logger.error('Failed to cancel payment', { error: error instanceof Error ? error.message : String(error), paymentKey, context: 'cancelPayment' });
    const message = error instanceof Error ? error.message : 'Failed to cancel payment';
    return { success: false, error: message };
  }
}

export async function getPaymentHistory(
  db: Db,
  userId: string,
  limit = 20,
): Promise<PaymentRecord[]> {
  try {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;

    const records = await db
      .collection('payments')
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(safeLimit)
      .toArray();

    return records.map((r: WithId<Document>) => r as unknown as PaymentRecord);
  } catch (error) {
    logger.error('Failed to fetch payment history', { error: error instanceof Error ? error.message : String(error), userId, context: 'getPaymentHistory' });
    throw error;
  }
}

async function tossRequest<T>(
  method: 'POST' | 'GET',
  path: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;

    if (!secretKey) {
      const message = 'TOSS_PAYMENTS_SECRET_KEY is not configured';
      logger.error(message, { context: 'tossRequest' });
      return { ok: false, error: message };
    }

    const response = await fetch(`${TOSS_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const rawText = await response.text();
    let payload: T | undefined;
    let parseError: string | null = null;

    if (rawText) {
      try {
        payload = JSON.parse(rawText) as T;
      } catch {
        parseError = rawText;
      }
    }

    if (!response.ok) {
      const error =
        (payload as { message?: string; error?: string } | undefined)?.message ||
        parseError ||
        `Toss API returned status ${response.status}`;
      logger.error('Toss API request failed', {
        context: 'tossRequest',
        path,
        method,
        status: response.status,
      });
      return { ok: false, error };
    }

    return { ok: true, data: payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Toss API request failed';
    logger.error(message, { error: error instanceof Error ? error.message : String(error), context: 'tossRequest', path });
    return { ok: false, error: message };
  }
}


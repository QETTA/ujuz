import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

const orderIdSchema = z
  .string()
  .trim()
  .min(1, '주문 ID가 필요합니다')
  .max(64, '유효하지 않은 주문 ID입니다')
  .regex(/^[a-zA-Z0-9_-]+$/, '유효하지 않은 주문 ID입니다');

type ReportStatus = 'WRITING' | 'READY' | 'DELIVERED';

interface ActionItem {
  title: string;
  detail: string;
}

interface ConsultationReportPayload {
  summary: string;
  actions: ActionItem[];
}

interface ConsultationReportDoc {
  order_id: string;
  status?: string;
  report?: {
    summary?: string;
    actions?: unknown;
  };
  summary?: string;
  actions?: unknown;
  pdf_url?: string | null;
  pdf?: {
    file_url?: string | null;
  };
}

function normalizeStatus(status?: string): ReportStatus {
  const value = (status ?? '').toUpperCase();
  if (value.includes('DELIVERED')) return 'DELIVERED';
  if (value.includes('READY')) return 'READY';
  return 'WRITING';
}

function toActionItem(value: unknown): ActionItem | null {
  if (!value || typeof value !== 'object') return null;

  const action = value as { title?: unknown; detail?: unknown };
  if (typeof action.title !== 'string' || typeof action.detail !== 'string') return null;

  const title = action.title.trim();
  const detail = action.detail.trim();
  if (!title || !detail) return null;

  return { title, detail };
}

function normalizeActions(value: unknown): ActionItem[] {
  if (!Array.isArray(value)) return [];
  return value.map(toActionItem).filter((item): item is ActionItem => item !== null);
}

function extractReport(doc: ConsultationReportDoc | null): ConsultationReportPayload | undefined {
  if (!doc) return undefined;

  const nestedSummary = typeof doc.report?.summary === 'string' ? doc.report.summary.trim() : '';
  if (nestedSummary) {
    return {
      summary: nestedSummary,
      actions: normalizeActions(doc.report?.actions),
    };
  }

  const summary = typeof doc.summary === 'string' ? doc.summary.trim() : '';
  if (!summary) return undefined;

  return {
    summary,
    actions: normalizeActions(doc.actions),
  };
}

function extractPdfUrl(doc: ConsultationReportDoc | null): string | undefined {
  if (!doc) return undefined;

  const pdfUrl = typeof doc.pdf_url === 'string' ? doc.pdf_url.trim() : '';
  if (pdfUrl) return pdfUrl;

  const nestedPdfUrl = typeof doc.pdf?.file_url === 'string' ? doc.pdf.file_url.trim() : '';
  return nestedPdfUrl || undefined;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const { id } = await params;
    const parsedOrderId = orderIdSchema.safeParse(id);
    if (!parsedOrderId.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(
        parsedOrderId.error.issues[0]?.message ?? '유효하지 않은 주문 ID입니다',
        'invalid_order_id',
      );
    }

    const orderId = parsedOrderId.data;
    const db = await getDbOrThrow();
    const reportDoc = await db.collection<ConsultationReportDoc>(U.CONSULTATION_REPORTS).findOne(
      { order_id: orderId },
      { sort: { updated_at: -1, created_at: -1 } },
    );

    const status = normalizeStatus(reportDoc?.status);
    const report = status === 'WRITING' ? undefined : extractReport(reportDoc);
    const pdfUrl = status === 'WRITING' ? undefined : extractPdfUrl(reportDoc);

    logger.info('report_view', { order_id: orderId, status });

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      status,
      ...(report ? { report } : {}),
      ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

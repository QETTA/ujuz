import type { NextRequest } from 'next/server';
import type { Document, WithId } from 'mongodb';
import { getDbOrThrow } from './db';
import { U } from './collections';
import { AppError } from './errors';

const PARTNER_KEY_HEADERS = ['x-partner-key', 'x-partner-api-key'] as const;
const PARTNER_KEY_FIELDS = ['api_key', 'partner_key', 'partner_api_key', 'apiKey', 'partnerApiKey', 'key'] as const;

export type PartnerAuthResult = {
  doc_id: WithId<Document>['_id'];
  partner_id: string;
  org_id: string;
  name: string;
  partner_key: string;
};

function readText(doc: Document, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = doc[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return undefined;
}

function normalizePartnerKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim();
  }
  return trimmed;
}

function getPartnerKey(req: NextRequest): string {
  for (const headerName of PARTNER_KEY_HEADERS) {
    const raw = req.headers.get(headerName);
    if (!raw) continue;
    const key = normalizePartnerKey(raw);
    if (key) return key;
  }

  throw new AppError('파트너 인증 키가 필요합니다.', 401, 'partner_unauthorized');
}

export async function requirePartner(req: NextRequest): Promise<PartnerAuthResult> {
  const partnerKey = getPartnerKey(req);
  const db = await getDbOrThrow();
  const partner = await db.collection(U.PARTNERS).findOne({
    $or: PARTNER_KEY_FIELDS.map((field) => ({ [field]: partnerKey })),
  });

  if (!partner) {
    throw new AppError('유효하지 않은 파트너 인증 키입니다.', 401, 'partner_unauthorized');
  }

  const doc = partner as WithId<Document>;
  const fallbackId = String(doc._id);
  const partnerId = readText(doc, ['partner_id', 'org_id']) ?? fallbackId;
  const orgId = readText(doc, ['org_id', 'partner_id']) ?? partnerId;
  const name = readText(doc, ['name']) ?? '';

  return {
    doc_id: doc._id,
    partner_id: partnerId,
    org_id: orgId,
    name,
    partner_key: partnerKey,
  };
}

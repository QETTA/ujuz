/**
 * data.go.kr OpenAPI connector — paginated fetch of childcare facility data.
 */

import { env } from '../env';
import { logger } from '../logger';
import type { DataGoKrRawFacility, DataGoKrResponse } from './types';

const BASE_URL = 'https://api.odcloud.kr/api/15084102/v1/uddi:e06bef5a-3621-4c57-a0e0-07f5a03bf0e0';
const PAGE_SIZE = 1000;
const MAX_PAGES = 100; // safety limit

/**
 * Fetches all facility records from data.go.kr, page by page.
 * Yields batches of raw records for streaming ingest.
 */
export async function* fetchAllFacilities(): AsyncGenerator<DataGoKrRawFacility[]> {
  const apiKey = env.DATA_GO_KR_API_KEY;
  if (!apiKey) {
    throw new Error('DATA_GO_KR_API_KEY is not configured');
  }

  let pageNo = 1;
  let totalCount = Infinity;

  while ((pageNo - 1) * PAGE_SIZE < totalCount && pageNo <= MAX_PAGES) {
    const url = new URL(BASE_URL);
    url.searchParams.set('serviceKey', apiKey);
    url.searchParams.set('page', String(pageNo));
    url.searchParams.set('perPage', String(PAGE_SIZE));
    url.searchParams.set('returnType', 'JSON');

    logger.info('data.go.kr fetch', { page: pageNo, totalCount });

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      throw new Error(`data.go.kr API error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as DataGoKrResponse;

    const { header, body } = json.response;
    if (header.resultCode !== '00') {
      throw new Error(`data.go.kr API result error: ${header.resultCode} ${header.resultMsg}`);
    }

    totalCount = body.totalCount;

    const items = typeof body.items === 'object' && body.items
      ? body.items.item
      : [];

    if (items.length === 0) break;

    yield items;
    pageNo++;
  }
}

/**
 * Fetches a single page for testing/manual ingest.
 */
export async function fetchFacilityPage(pageNo: number, pageSize = PAGE_SIZE): Promise<{
  items: DataGoKrRawFacility[];
  totalCount: number;
}> {
  const apiKey = env.DATA_GO_KR_API_KEY;
  if (!apiKey) {
    throw new Error('DATA_GO_KR_API_KEY is not configured');
  }

  const url = new URL(BASE_URL);
  url.searchParams.set('serviceKey', apiKey);
  url.searchParams.set('page', String(pageNo));
  url.searchParams.set('perPage', String(pageSize));
  url.searchParams.set('returnType', 'JSON');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`data.go.kr API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as DataGoKrResponse;
  const { body } = json.response;

  const items = typeof body.items === 'object' && body.items
    ? body.items.item
    : [];

  return { items, totalCount: body.totalCount };
}

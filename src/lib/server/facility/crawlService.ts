/**
 * Crawl service — orchestrates a full data.go.kr crawl job.
 * Creates a crawl_jobs record, streams pages through connector → ingest,
 * then marks the job as completed or failed.
 */

import type { Db } from 'mongodb';
import { U } from '../collections';
import { logger } from '../logger';
import type { CrawlJobDoc } from '../dbTypes';
import { fetchAllFacilities } from './connector';
import { ingestBatch } from './ingestService';
import type { IngestResult } from './types';

export interface CrawlResult {
  job_id: string;
  status: 'completed' | 'failed';
  total_fetched: number;
  total_upserted: number;
  total_skipped: number;
  error_message?: string;
  duration_ms: number;
}

export async function runCrawl(db: Db): Promise<CrawlResult> {
  const jobsCol = db.collection<CrawlJobDoc>(U.CRAWL_JOBS);
  const startedAt = new Date();

  // Create job record
  const { insertedId } = await jobsCol.insertOne({
    provider: 'data_go_kr',
    status: 'running',
    total_fetched: 0,
    total_upserted: 0,
    total_skipped: 0,
    started_at: startedAt,
  } as CrawlJobDoc);

  const totals: IngestResult = { fetched: 0, upserted: 0, skipped: 0 };

  try {
    for await (const batch of fetchAllFacilities()) {
      const result = await ingestBatch(db, batch);
      totals.fetched += result.fetched;
      totals.upserted += result.upserted;
      totals.skipped += result.skipped;

      // Update running totals
      await jobsCol.updateOne(
        { _id: insertedId },
        {
          $set: {
            total_fetched: totals.fetched,
            total_upserted: totals.upserted,
            total_skipped: totals.skipped,
          },
        },
      );
    }

    // Mark completed
    await jobsCol.updateOne(
      { _id: insertedId },
      {
        $set: {
          status: 'completed',
          finished_at: new Date(),
          total_fetched: totals.fetched,
          total_upserted: totals.upserted,
          total_skipped: totals.skipped,
        },
      },
    );

    logger.info('Crawl job completed', {
      job_id: insertedId.toString(),
      ...totals,
    });

    return {
      job_id: insertedId.toString(),
      status: 'completed',
      total_fetched: totals.fetched,
      total_upserted: totals.upserted,
      total_skipped: totals.skipped,
      duration_ms: Date.now() - startedAt.getTime(),
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await jobsCol.updateOne(
      { _id: insertedId },
      {
        $set: {
          status: 'failed',
          error_message: errorMessage,
          finished_at: new Date(),
          total_fetched: totals.fetched,
          total_upserted: totals.upserted,
          total_skipped: totals.skipped,
        },
      },
    );

    logger.error('Crawl job failed', {
      job_id: insertedId.toString(),
      error: errorMessage,
    });

    return {
      job_id: insertedId.toString(),
      status: 'failed',
      total_fetched: totals.fetched,
      total_upserted: totals.upserted,
      total_skipped: totals.skipped,
      error_message: errorMessage,
      duration_ms: Date.now() - startedAt.getTime(),
    };
  }
}

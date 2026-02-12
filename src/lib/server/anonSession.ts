/**
 * UjuZ - Anonymous Session Service
 * Creates/retrieves anonymous sessions identified by device fingerprint.
 */

import { getDbOrThrow } from './db';
import { U } from './collections';
import type { AnonymousSessionDoc } from './dbTypes';
import { logger } from './logger';

const ADJECTIVES = [
  '씩씩한', '용감한', '행복한', '따뜻한', '귀여운', '지혜로운', '멋진', '반짝이는',
  '사랑스런', '똑똑한', '다정한', '신나는', '즐거운', '든든한', '포근한', '활발한',
];

const ANIMALS = [
  '토끼', '고양이', '강아지', '판다', '코알라', '여우', '다람쥐', '수달',
  '고슴도치', '펭귄', '돌고래', '부엉이', '곰돌이', '사슴', '햄스터', '오리',
];

function generateHandle(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${animal}${num}`;
}

function hashDeviceFingerprint(fingerprint: string): string {
  // Simple hash using Web Crypto-compatible approach
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

export async function getOrCreateAnonSession(deviceFingerprint: string) {
  const db = await getDbOrThrow();
  const col = db.collection<AnonymousSessionDoc>(U.ANONYMOUS_SESSIONS);
  const deviceHash = hashDeviceFingerprint(deviceFingerprint);

  // Try to find existing session
  const existing = await col.findOne({ device_hash: deviceHash });
  if (existing) {
    // Update last_seen
    await col.updateOne(
      { _id: existing._id },
      { $set: { last_seen: new Date() } },
    );
    logger.info('anon session found', { anon_id: existing.anon_id });
    return {
      anon_id: existing.anon_id,
      handle: existing.handle,
      trust_level: existing.trust_level,
    };
  }

  // Create new session
  const anon_id = crypto.randomUUID();
  const handle = generateHandle();
  const now = new Date();

  const doc: Omit<AnonymousSessionDoc, '_id'> = {
    anon_id,
    device_hash: deviceHash,
    handle,
    trust_level: 'new',
    created_at: now,
    last_seen: now,
  };

  await col.insertOne(doc as AnonymousSessionDoc);
  logger.info('anon session created', { anon_id, handle });

  return { anon_id, handle, trust_level: 'new' as const };
}

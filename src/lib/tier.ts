import type { FastifyRequest } from 'fastify';

import type { Tier } from './types';
import { AppError } from './errors';

export function getEffectiveTier(req: FastifyRequest): Tier {
  if (process.env.NODE_ENV !== 'production') {
    const header = req.headers['x-dev-tier'];
    if (header && ['free', 'basic', 'premium'].includes(header as string)) {
      return header as Tier;
    }
    if (header) {
      throw new AppError('INVALID_TIER', `Invalid tier: ${header}`, 400);
    }
  }

  const def = process.env.TIER_DEFAULT || 'free';
  if (!['free', 'basic', 'premium'].includes(def)) return 'free';
  return def as Tier;
}

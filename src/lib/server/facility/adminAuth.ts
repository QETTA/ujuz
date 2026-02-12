/**
 * Admin authentication — Phase 1: simple API key header check.
 * To be replaced with RBAC in Phase 2.
 */

import type { NextRequest } from 'next/server';
import { env } from '../env';
import { AppError } from '../errors';

/**
 * Validates the x-admin-key header against env.ADMIN_API_KEY.
 * Throws AppError(401) if missing/invalid.
 */
export function requireAdmin(req: NextRequest): void {
  const key = req.headers.get('x-admin-key');

  if (!env.ADMIN_API_KEY) {
    throw new AppError('Admin API is not configured', 503, 'admin_not_configured');
  }

  if (!key || key !== env.ADMIN_API_KEY) {
    throw new AppError('Invalid admin key', 401, 'admin_unauthorized');
  }
}

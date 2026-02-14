import { describe, expect, it } from 'vitest';

import { apiError, errors } from '@/lib/server/apiError';

describe('apiError helpers', () => {
  it('returns typed error payload with status and details', async () => {
    const response = apiError('Invalid payload', 'VALIDATION_ERROR', 400, { field: 'name' });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload',
        details: { field: 'name' },
      },
    });
  });

  it('uses shared shape in preset helpers', async () => {
    const response = errors.unauthorized();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: '인증이 필요합니다',
      },
    });
  });
});

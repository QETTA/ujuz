import { describe, expect, it } from 'vitest';

import { AppError } from '@/lib/shared/appError';

describe('AppError compatibility', () => {
  it('supports preferred signature (code, message, status)', () => {
    const err = new AppError('INVALID_TIER', 'Invalid tier', 400, { field: 'x-dev-tier' });

    expect(err.code).toBe('INVALID_TIER');
    expect(err.message).toBe('Invalid tier');
    expect(err.statusCode).toBe(400);
    expect(err.toResponseBody()).toEqual({
      error: {
        code: 'INVALID_TIER',
        message: 'Invalid tier',
        details: { field: 'x-dev-tier' },
      },
    });
  });

  it('supports legacy signature (message, status, code)', () => {
    const err = new AppError('Invalid tier', 400, 'INVALID_TIER', { field: 'x-dev-tier' });

    expect(err.code).toBe('INVALID_TIER');
    expect(err.message).toBe('Invalid tier');
    expect(err.statusCode).toBe(400);
  });
});

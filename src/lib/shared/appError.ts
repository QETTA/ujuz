export type ErrorDetails = unknown;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: ErrorDetails;
  };
}

/**
 * Canonical application error with backward-compatible constructor signatures.
 *
 * Preferred signature:
 *   new AppError(code, message, statusCode?, details?)
 *
 * Legacy signature (still supported):
 *   new AppError(message, statusCode?, code?, details?)
 */
export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: ErrorDetails;

  constructor(code: string, message: string, statusCode?: number, details?: ErrorDetails);
  constructor(message: string, statusCode?: number, code?: string, details?: ErrorDetails);
  constructor(
    first: string,
    second?: string | number,
    third?: number | string,
    fourth?: ErrorDetails,
  ) {
    const normalized = normalizeAppErrorArgs(first, second, third, fourth);
    super(normalized.message);
    this.name = 'AppError';
    this.code = normalized.code;
    this.statusCode = normalized.statusCode;
    this.details = normalized.details;
  }

  toResponseBody(): ApiErrorBody {
    return {
      error: {
        code: this.code.toUpperCase(),
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

function normalizeAppErrorArgs(
  first: string,
  second?: string | number,
  third?: number | string,
  fourth?: ErrorDetails,
): { code: string; message: string; statusCode: number; details?: ErrorDetails } {
  // Preferred signature: (code, message, statusCode?, details?)
  if (typeof second === 'string') {
    return {
      code: first,
      message: second,
      statusCode: typeof third === 'number' ? third : 500,
      details: fourth,
    };
  }

  // Legacy signature: (message, statusCode?, code?, details?)
  return {
    code: typeof third === 'string' ? third : 'ERROR',
    message: first,
    statusCode: typeof second === 'number' ? second : 500,
    details: fourth,
  };
}

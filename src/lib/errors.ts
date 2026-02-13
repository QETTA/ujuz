import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export type ErrorDetails = Record<string, unknown>;

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: ErrorDetails;

  constructor(code: string, message: string, statusCode = 500, details?: ErrorDetails) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export async function errorHandler(
  error: FastifyError | AppError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (isAppError(error)) {
    return reply.status(error.statusCode).send({
      error: { code: error.code.toUpperCase(), message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
  }

  const statusCode = (error as FastifyError).statusCode ?? 500;
  const message = error.message || 'Internal server error';
  return reply.status(statusCode).send({
    error: { code: statusCode >= 500 ? 'SERVER_ERROR' : 'ERROR', message },
  });
}

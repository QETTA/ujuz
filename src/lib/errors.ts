import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

import { AppError, isAppError } from './shared/appError';

export { AppError, isAppError };
export type { ErrorDetails } from './shared/appError';

export async function errorHandler(
  error: FastifyError | AppError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (isAppError(error)) {
    return reply.status(error.statusCode).send(error.toResponseBody());
  }

  const statusCode = (error as FastifyError).statusCode ?? 500;
  const message = error.message || 'Internal server error';
  return reply.status(statusCode).send({
    error: { code: statusCode >= 500 ? 'SERVER_ERROR' : 'ERROR', message },
  });
}

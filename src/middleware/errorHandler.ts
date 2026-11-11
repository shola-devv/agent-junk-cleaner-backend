import type { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { sendFailure } from '../utils/respond';

interface BodyParserError extends Error {
  type?: string;
  status?: number;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const e = err as BodyParserError;

  if (err instanceof AppError) {
    const providerErrorCodes = [
      'AI_PROVIDER_AUTH',
      'AI_RATE_LIMITED',
      'AI_PROVIDER_ERROR',
      'AI_TIMEOUT',
    ];
    if (err.code === 'AI_RATE_LIMITED' && typeof err.details === 'object' && err.details !== null) {
      const retryAfter = 'retryAfter' in err.details ? err.details.retryAfter : undefined;
      if (typeof retryAfter === 'string') res.setHeader('Retry-After', retryAfter);
    }
    if (err.status >= 500 && !providerErrorCodes.includes(err.code)) {
      logger.error('app_error', { requestId: req.requestId, code: err.code, stack: err.stack });
    }
    return sendFailure(req, res, err.status, {
      code: err.code,
      message: err.message,
      retryable: err.retryable,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }

  if (e.type === 'entity.too.large') {
    return sendFailure(req, res, 413, {
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The request is too large.',
      retryable: false,
    });
  }
  if (e.type === 'entity.parse.failed') {
    return sendFailure(req, res, 400, {
      code: 'INVALID_JSON',
      message: 'The request body is not valid JSON.',
      retryable: false,
    });
  }

  // Unknown error: log details server-side only, return a generic message.
  logger.error('unhandled_error', {
    requestId: req.requestId,
    name: e.name,
    message: e.message,
    stack: e.stack,
  });
  return sendFailure(req, res, 500, {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong.',
    retryable: true,
  });
};

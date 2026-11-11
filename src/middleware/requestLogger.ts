import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/** Logs method, path (no query string), status and duration. Never logs headers or bodies. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    if (
      env.AI_PROVIDER === 'groq' &&
      req.method === 'POST' &&
      (req.path === '/api/chat' || req.path === '/chat')
    ) {
      logger.info('request', {
        requestId: req.requestId,
        provider: 'groq',
        model: env.GROQ_MODEL,
        statusCode: res.statusCode,
        latencyMs: Math.round(durationMs),
      });
      return;
    }
    logger.info('request', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });
  next();
};

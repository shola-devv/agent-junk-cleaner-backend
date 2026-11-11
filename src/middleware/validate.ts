import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/appError';

export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Report field paths and messages only, never the submitted values.
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(
        new AppError('VALIDATION_ERROR', 'The request is not valid.', 400, false, { issues }),
      );
    }
    req.body = result.data;
    next();
  };

import type { RequestHandler } from 'express';
import { AppError } from '../utils/appError';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND', 'The requested resource was not found.', 404, false));
};

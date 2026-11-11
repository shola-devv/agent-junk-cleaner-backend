import type { Request, Response } from 'express';
import type { ApiFailure, ApiSuccess } from '../types/api';

export function sendSuccess<T>(req: Request, res: Response, data: T, status = 200): void {
  const body: ApiSuccess<T> = { success: true, data, requestId: req.requestId };
  res.status(status).json(body);
}

export function sendFailure(
  req: Request,
  res: Response,
  status: number,
  error: ApiFailure['error'],
): void {
  const body: ApiFailure = { success: false, error, requestId: req.requestId };
  res.status(status).json(body);
}

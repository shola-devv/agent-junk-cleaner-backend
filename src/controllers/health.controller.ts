import type { Request, Response } from 'express';
import { APP_VERSION } from '../config/env';
import { checkReadiness } from '../services/readiness.service';
import { sendFailure, sendSuccess } from '../utils/respond';

export function health(req: Request, res: Response): void {
  sendSuccess(req, res, {
    status: 'ok',
    version: APP_VERSION,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

export async function ready(req: Request, res: Response): Promise<void> {
  const report = await checkReadiness();
  if (report.ready) {
    sendSuccess(req, res, { status: 'ready', checks: report.checks });
    return;
  }
  sendFailure(req, res, 503, {
    code: 'NOT_READY',
    message: 'The service is not ready yet.',
    retryable: true,
    details: { checks: report.checks },
  });
}

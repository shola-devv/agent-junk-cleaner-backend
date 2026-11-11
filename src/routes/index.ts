import { Router } from 'express';
import { chatRouter } from './chat.routes';
import { healthRouter } from './health.routes';
import { analyticsRouter } from './analytics.routes';
import { ipRateLimiter } from '../middleware/rateLimit';

export const routes = Router();
routes.use(healthRouter);
routes.use('/api', ipRateLimiter, chatRouter, analyticsRouter);

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getDownloadCount, recordDownload, registerVisitor } from '../controllers/analytics.controller';

export const analyticsRouter = Router();
analyticsRouter.post('/visitors', asyncHandler(registerVisitor));
analyticsRouter.post('/downloads', asyncHandler(recordDownload));
analyticsRouter.get('/downloads/count', asyncHandler(getDownloadCount));

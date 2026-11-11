import { Router } from 'express';
import { chat } from '../controllers/chat.controller';
import { validateBody } from '../middleware/validate';
import { chatRequestSchema } from '../validators/chat.validator';
import { asyncHandler } from '../utils/asyncHandler';

export const chatRouter = Router();
chatRouter.post('/chat', validateBody(chatRequestSchema), asyncHandler(chat));

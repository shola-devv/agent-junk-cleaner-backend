import type { Request, Response } from 'express';
import { handleChat } from '../services/chat.service';
import type { ChatRequest } from '../types/chat';

export async function chat(req: Request, res: Response): Promise<void> {
  // req.body was parsed and validated by validateBody(chatRequestSchema)
  const data = await handleChat(req.body as ChatRequest, req.requestId);
  res.status(200).json(data);
}

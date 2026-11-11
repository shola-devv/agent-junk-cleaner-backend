import { randomUUID } from 'crypto';
import { env } from '../config/env';
import type { ChatRequest, ChatResponseData } from '../types/chat';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { aiProvider } from './ai';
import { listToolsForModel, validateToolCalls } from './tools/registry';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new AppError('AI_TIMEOUT', 'The AI service took too long to respond.', 504, true)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function handleChat(input: ChatRequest, requestId: string): Promise<ChatResponseData> {
  let output;
  try {
    output = await withTimeout(
      aiProvider.generate({
        messages: input.messages,
        tools: listToolsForModel(),
        clientContext: input.clientContext,
        requestId,
      }),
      env.AI_TIMEOUT_MS,
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('ai_provider_failed', {
      requestId,
      provider: aiProvider.name,
      message: err instanceof Error ? err.message : 'unknown',
    });
    throw new AppError('AI_PROVIDER_ERROR', 'The AI service is unavailable right now.', 502, true);
  }

  const lastMessage = input.messages[input.messages.length - 1];
  const mustScan = lastMessage?.role === 'user' && /\bscan(?:ning|s)?\b/i.test(lastMessage.content);
  const toolCalls = validateToolCalls(
    mustScan ? [{ name: 'scan_computer', arguments: {} }] : output.toolCalls,
    requestId,
  );
  const explanation =
    toolCalls.length > 0
      ? `I can propose the following action(s) for your review:\n${toolCalls
          .map((call) => `- ${call.description}`)
          .join('\n')}`
      : output.text;

  return {
    conversationId: input.conversationId ?? randomUUID(),
    message: { role: 'assistant', content: output.text.trim() ? output.text : explanation },
    toolCalls,
    provider: aiProvider.name,
  };
}

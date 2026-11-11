import type { z } from 'zod';
import type { chatRequestSchema } from '../validators/chat.validator';

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatMessage = ChatRequest['messages'][number];
export type ClientContext = NonNullable<ChatRequest['clientContext']>;

/** A local tool call requested by the AI and executed by the Electron client. */
export interface ToolCallProposal {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatResponseData {
  conversationId: string;
  message: { role: 'assistant'; content: string };
  toolCalls: ToolCallProposal[];
}

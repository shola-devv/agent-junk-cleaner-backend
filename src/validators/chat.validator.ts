import { z } from 'zod';

const jsonContentSchema = z.string().refine(
  (content) => {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Tool results must be valid JSON' },
);

const messageSchema = z
  .strictObject({
    role: z.enum(['user', 'assistant', 'tool']),
    content: z.string().min(1).max(8000),
    /** Required for role "tool": links a tool result to the call that produced it. */
    toolCallId: z.uuid().optional(),
    toolName: z.string().min(1).max(64).optional(),
  })
  .superRefine((message, context) => {
    if (message.role === 'tool' && !message.toolCallId) {
      context.addIssue({
        code: 'custom',
        message: 'toolCallId is required for tool messages',
        path: ['toolCallId'],
      });
    }
    if (message.role === 'tool' && !jsonContentSchema.safeParse(message.content).success) {
      context.addIssue({
        code: 'custom',
        message: 'Tool results must be valid JSON',
        path: ['content'],
      });
    }
  });

export const chatRequestSchema = z
  .strictObject({
    conversationId: z.uuid().optional(),
    messages: z.array(messageSchema).min(1).max(50),
    clientContext: z
      .strictObject({
        platform: z.enum(['win32', 'darwin', 'linux']),
        appVersion: z.string().max(32).optional(),
      })
      .optional(),
  })
  .refine((r) => r.messages[r.messages.length - 1]?.role !== 'assistant', {
    message: 'The last message must be from the user or a tool result',
    path: ['messages'],
  });

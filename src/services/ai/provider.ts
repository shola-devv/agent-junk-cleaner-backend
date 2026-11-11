import type { ChatMessage, ClientContext } from '../../types/chat';
import type { RawToolCall } from '../tools/registry';

export interface AiTool {
  name: string;
  description: string;
  /** JSON Schema describing the tool arguments. */
  parameters: unknown;
}

export interface AiGenerateInput {
  messages: ChatMessage[];
  tools: AiTool[];
  clientContext?: ClientContext;
  requestId: string;
}

export interface AiGenerateOutput {
  text: string;
  toolCalls: RawToolCall[];
}

/**
 * Every AI vendor (Gemini, OpenAI, Anthropic, ...) gets one adapter implementing this.
 * The rest of the backend never imports a vendor SDK directly.
 */
export interface AiProvider {
  readonly name: string;
  isReady(): Promise<boolean>;
  generate(input: AiGenerateInput): Promise<AiGenerateOutput>;
}

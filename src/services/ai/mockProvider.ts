import type { AiGenerateInput, AiGenerateOutput, AiProvider } from './provider';

/** Deterministic stand-in so you can test the whole Electron <-> backend loop without an AI key. */
export class MockProvider implements AiProvider {
  readonly name = 'mock';

  async isReady(): Promise<boolean> {
    return true;
  }

  async generate(input: AiGenerateInput): Promise<AiGenerateOutput> {
    const last = input.messages[input.messages.length - 1];
    if (!last) return { text: 'How can I help you clean your system?', toolCalls: [] };

    if (last.role === 'tool') {
      return {
        text: `I received the result of ${last.toolName ?? 'the tool'}. Want me to do anything else?`,
        toolCalls: [],
      };
    }

    const text = last.content.toLowerCase();
    if (text.includes('scan')) {
      return {
        text: 'I can scan your system for junk files. Approve the action below to proceed.',
        toolCalls: [{ name: 'scan_computer', arguments: {} }],
      };
    }
    return {
      text: 'This is a temporary response from the mock AI provider. Try asking me to scan your system.',
      toolCalls: [],
    };
  }
}

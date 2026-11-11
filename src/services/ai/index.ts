import { env } from '../../config/env';
import { GroqProvider } from './groqProvider';
import { MockProvider } from './mockProvider';
import type { AiProvider } from './provider';

function createProvider(): AiProvider {
  switch (env.AI_PROVIDER) {
    case 'mock':
      return new MockProvider();
    case 'groq':
      return new GroqProvider();
  }
}

export const aiProvider: AiProvider = createProvider();

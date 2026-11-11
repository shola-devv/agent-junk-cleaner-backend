import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.AI_PROVIDER = 'mock';
process.env.GROQ_MODEL ||= 'openai/gpt-oss-20b';

const { listToolsForModel, validateToolCalls } = require('../tools/registry') as typeof import('../tools/registry');
const { GroqProvider } = require('./groqProvider') as typeof import('./groqProvider');

test('drops unknown and schema-invalid Groq tool proposals', async () => {
  const originalFetch = globalThis.fetch;
  const provider = new GroqProvider();
  let fetchBody: Record<string, unknown> | undefined;

  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    fetchBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    const proposedCall =
      fetchBody.messages &&
      Array.isArray(fetchBody.messages) &&
      fetchBody.messages.some((message) => {
        if (typeof message !== 'object' || message === null || !('content' in message)) {
          return false;
        }
        return typeof message.content === 'string' && message.content.includes('invalid-case');
      })
        ? {
            id: 'call-invalid',
            type: 'function',
            function: {
              name: 'clean_temp_files',
              arguments: '{"olderThanDays":500,"dryRun":false}',
            },
          }
        : {
            id: 'call-unknown',
            type: 'function',
            function: { name: 'format_disk', arguments: '{}' },
          };

    return new Response(
      JSON.stringify({
        choices: [{ message: { role: 'assistant', tool_calls: [proposedCall] } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    const unknownResult = await provider.generate({
      messages: [{ role: 'user', content: 'unknown-case' }],
      tools: listToolsForModel(),
      requestId: 'test-unknown',
    });
    assert.deepEqual(validateToolCalls(unknownResult.toolCalls, 'test-unknown'), []);
    assert.equal(JSON.stringify(fetchBody?.tools).includes('"$schema"'), false);

    const invalidResult = await provider.generate({
      messages: [{ role: 'user', content: 'invalid-case' }],
      tools: listToolsForModel(),
      requestId: 'test-invalid',
    });
    assert.deepEqual(validateToolCalls(invalidResult.toolCalls, 'test-invalid'), []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

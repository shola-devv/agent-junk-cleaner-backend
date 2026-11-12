import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { ToolCallProposal } from '../../types/chat';
import { logger } from '../../utils/logger';

export interface ToolDefinition {
  name: string;
  description: string;
  argsSchema: z.ZodType<Record<string, unknown>>;
}

const definitions: ToolDefinition[] = [
  {
    name: 'get_system_info',
    description: 'Get the operating system, platform, architecture, and app version.',
    argsSchema: z.strictObject({}),
  },
  {
    name: 'scan_computer',
    description: 'Read-only scan of supported cache locations.',
    argsSchema: z.strictObject({}),
  },
  {
    name: 'inspect_candidate',
    description: 'Get metadata for a file found by a scan.',
    argsSchema: z.strictObject({ candidateId: z.uuid() }),
  },
  {
    name: 'calculate_storage',
    description: 'Calculate cache totals, including totals by application.',
    argsSchema: z.strictObject({}),
  },
  {
    name: 'delete_candidates',
    description:
      'Move files found by the latest scan to the Recycle Bin. The desktop app asks the user for confirmation before anything is deleted.',
    argsSchema: z
      .strictObject({
        candidateIds: z.array(z.uuid()).min(1).max(1000),
      })
      .refine((args) => new Set(args.candidateIds).size === args.candidateIds.length, {
        message: 'candidateIds must be unique.',
      }),
  },
];

const byName = new Map(definitions.map((d) => [d.name, d]));
const LEGACY_TOOL_NAMES: Record<string, string> = { scan_system: 'scan_computer' };
const MAX_TOOL_CALLS_PER_RESPONSE = 5;

/** What gets handed to an AI provider so it knows which tools exist. */
export function listToolsForModel() {
  return definitions.map((d) => ({
    name: d.name,
    description: d.description,
    parameters: z.toJSONSchema(d.argsSchema),
  }));
}

export interface RawToolCall {
  name: string;
  arguments: unknown;
}

export function validateToolCalls(raw: RawToolCall[], requestId: string): ToolCallProposal[] {
  const accepted: ToolCallProposal[] = [];
  for (const call of raw.slice(0, MAX_TOOL_CALLS_PER_RESPONSE)) {
    const name = LEGACY_TOOL_NAMES[call.name] ?? call.name;
    const def = byName.get(name);
    if (!def) {
      logger.warn('tool_call_rejected_unknown', { requestId });
      continue;
    }
    const parsed = def.argsSchema.safeParse(call.arguments ?? {});
    if (!parsed.success) {
      logger.warn('tool_call_rejected_invalid_args', { requestId });
      continue;
    }
    accepted.push({
      id: randomUUID(),
      name: def.name,
      arguments: parsed.data,
      description: def.description,
    });
  }
  return accepted;
}

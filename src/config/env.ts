import 'dotenv/config';
import { z } from 'zod';

const originSchema = z.string().refine(
  (v) => {
    if (v === 'null') return true;
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: 'must be an http(s) origin like http://localhost:5173, or the literal "null"' },
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  ALLOWED_ORIGINS: z
    .string({ error: 'ALLOWED_ORIGINS is required' })
    .min(1, 'ALLOWED_ORIGINS is required')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    )
    .pipe(z.array(originSchema).min(1)),
  AI_PROVIDER: z.enum(['mock', 'groq']).default('mock'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  GROQ_API_KEY: z.string().trim().min(1).optional(),
  GROQ_MODEL: z.string().trim().min(1).default('openai/gpt-oss-20b'),
  REQUEST_BODY_LIMIT: z.string().regex(/^\d+(kb|mb)$/i, 'use a value like 64kb').default('64kb'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  DAILY_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(250),
  MONGODB_URI: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
  MONGODB_DATABASE: z.string().trim().min(1).default('agentjunkcleaner'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
}).superRefine((value, ctx) => {
  if (value.AI_PROVIDER === 'groq' && !value.GROQ_API_KEY) {
    ctx.addIssue({
      code: 'custom',
      path: ['GROQ_API_KEY'],
      message: 'is required when AI_PROVIDER=groq',
    });
  }
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Print variable names and reasons only. Never print the values.
    console.error('Invalid environment configuration:');
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export const APP_VERSION = '0.1.0';

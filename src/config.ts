import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const EnvSchema = z.object({
  LLM_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  ZHIPU_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().default('https://api.deepseek.com'),
  LLM_MODEL: z.string().default('deepseek-chat'),
  LLM_PROVIDER: z.string().default('deepseek'),
  LLM_THINKING: z.enum(['disabled', 'enabled']).default('disabled'),
  LLM_TEMPERATURE: z.coerce.number().default(0.1),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  LLM_MAX_RETRIES: z.coerce.number().int().nonnegative().default(2),
  PORT: z.coerce.number().int().positive().default(3100),
  VERIFIER: z
    .enum(['stub', 'baseline', 'minimal', 'optimized'])
    .default('optimized'),
  EVAL_DELAY_MS: z.coerce.number().int().nonnegative().default(0),
});

export type AppConfig = z.infer<typeof EnvSchema>;

function parseEnv(): AppConfig {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  return parsed.data;
}

export const env = parseEnv();

export function resolveLlmApiKey(): string | undefined {
  return env.LLM_API_KEY || env.DEEPSEEK_API_KEY || env.ZHIPU_API_KEY;
}

export function requireLlmKey(): string {
  const key = resolveLlmApiKey();
  if (!key) {
    throw new Error(
      'LLM_API_KEY is required for LLM verifiers. Set it in .env',
    );
  }
  return key;
}

export function hasLlmKey(): boolean {
  return Boolean(resolveLlmApiKey());
}

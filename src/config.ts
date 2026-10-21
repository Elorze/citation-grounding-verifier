import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const EnvSchema = z.object({
  ZHIPU_API_KEY: z.string().optional(),
  LLM_BASE_URL: z
    .string()
    .default('https://open.bigmodel.cn/api/paas/v4'),
  LLM_MODEL: z.string().default('glm-4.7-flash'),
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

export function requireLlmKey(): string {
  if (!env.ZHIPU_API_KEY) {
    throw new Error(
      'ZHIPU_API_KEY is required for LLM verifiers. Set it in .env',
    );
  }
  return env.ZHIPU_API_KEY;
}

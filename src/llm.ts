import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { APICallError, generateText, RetryError } from 'ai';
import { env, requireLlmKey } from './config.js';
import { AppError } from './errors.js';
import { LlmOutput, type Claim } from './schema.js';
import { assertInvariants, checkClaims, repair } from './validate.js';
import { emptyStats, type VerifyStats } from './verifiers/types.js';

let _model: ReturnType<ReturnType<typeof createOpenAICompatible>> | null = null;

function getModel() {
  if (_model) return _model;
  const client = createOpenAICompatible({
    name: env.LLM_PROVIDER,
    apiKey: requireLlmKey(),
    baseURL: env.LLM_BASE_URL,
  });
  _model = client(env.LLM_MODEL);
  return _model;
}

export interface CallOptions {
  system: string;
  user: string;
  passages: string[];
  withValidation?: boolean;
}

function toClaims(raw: LlmOutput): Claim[] {
  return raw.claims.map((c) => ({
    claim_text: c.claim_text,
    verdict: c.verdict,
    reasoning: c.reasoning ?? '',
    citations: (c.citations ?? []).map((cit) => ({
      index: cit.index,
      quote: cit.quote,
    })),
  }));
}

function countInvalidCitations(claims: Claim[], passages: string[]): number {
  const { errors } = checkClaims(claims, passages);
  return errors.filter(
    (e) => e.includes('quote not found') || e.includes('out of range'),
  ).length;
}

/** Strip ```json fences and extract the first JSON object. */
export function extractJsonObject(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1]!.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('No JSON object found in model text');
  }
  return JSON.parse(t.slice(start, end + 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Shared cooldown across calls (free-tier 429). */
let rateLimitUntil = 0;

async function respectRateLimit(): Promise<void> {
  const wait = rateLimitUntil - Date.now();
  if (wait > 0) {
    console.warn(`[llm] cooling down ${wait}ms before next call…`);
    await sleep(wait);
  }
}

function bumpRateLimit(ms: number): void {
  rateLimitUntil = Math.max(rateLimitUntil, Date.now() + ms);
}

function isRateLimited(err: unknown): boolean {
  if (APICallError.isInstance(err) && err.statusCode === 429) return true;
  if (RetryError.isInstance(err)) {
    return err.errors.some(
      (e) => APICallError.isInstance(e) && e.statusCode === 429,
    );
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /429|访问量过大|rate.?limit/i.test(msg);
}

async function generateOnce(
  instructions: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
) {
  // Prefer plain generateText → JSON.parse → Zod (provider JSON schema varies).
  // AI SDK v7: system prompt goes in `instructions`, not messages.
  const isZhipu =
    env.LLM_PROVIDER === 'zhipu' || env.LLM_BASE_URL.includes('bigmodel');
  return generateText({
    model: getModel(),
    instructions,
    messages,
    temperature: env.LLM_TEMPERATURE,
    abortSignal: AbortSignal.timeout(env.LLM_TIMEOUT_MS),
    maxRetries: 0, // we handle 429 ourselves with longer backoff
    ...(isZhipu
      ? {
          providerOptions: {
            zhipu: { thinking: { type: env.LLM_THINKING } },
          },
        }
      : {}),
  });
}

export async function callWithValidation(
  opts: CallOptions,
): Promise<{ claims: Claim[]; stats: VerifyStats }> {
  const withValidation = opts.withValidation !== false;
  const stats = emptyStats();
  const started = Date.now();

  type Msg =
    | { role: 'user'; content: string }
    | { role: 'assistant'; content: string };

  const messages: Msg[] = [{ role: 'user', content: opts.user }];

  let lastClaims: Claim[] | null = null;
  let lastRawText = '';
  let firstAttemptInvalid: number | null = null;
  const maxAttempts = withValidation ? env.LLM_MAX_RETRIES + 1 : 1;
  const transportRetries = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) stats.validationRetries += 1;
    stats.llmCalls += 1;

    try {
      let result;
      for (let t = 0; t < transportRetries; t++) {
        try {
          await respectRateLimit();
          result = await generateOnce(opts.system, messages);
          break;
        } catch (err) {
          if (isRateLimited(err) && t < transportRetries - 1) {
            const wait = Math.min(60_000, 5000 * 2 ** t);
            console.warn(`[llm] 429 rate limited, waiting ${wait}ms…`);
            bumpRateLimit(wait);
            await sleep(wait);
            continue;
          }
          throw err;
        }
      }
      if (!result) throw new Error('No LLM result');

      stats.inputTokens += result.usage?.inputTokens ?? 0;
      stats.outputTokens += result.usage?.outputTokens ?? 0;
      lastRawText = result.text ?? '';

      const json = extractJsonObject(lastRawText);
      const parsed = LlmOutput.safeParse(json);
      if (!parsed.success) {
        throw new Error(
          `Zod validation failed: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
        );
      }

      lastClaims = toClaims(parsed.data);

      if (firstAttemptInvalid === null) {
        firstAttemptInvalid = countInvalidCitations(lastClaims, opts.passages);
        stats.rawInvalidCitations = firstAttemptInvalid;
      }

      const checked = checkClaims(lastClaims, opts.passages);

      if (!withValidation) {
        const repaired = repair(lastClaims, opts.passages);
        stats.repairedClaims = repaired.repairedClaims;
        assertInvariants(repaired.claims, opts.passages);
        stats.latencyMs = Date.now() - started;
        return { claims: repaired.claims, stats };
      }

      if (checked.errors.length === 0) {
        assertInvariants(checked.claims, opts.passages);
        stats.latencyMs = Date.now() - started;
        return { claims: checked.claims, stats };
      }

      if (attempt < maxAttempts - 1) {
        messages.push({ role: 'assistant', content: lastRawText });
        messages.push({
          role: 'user',
          content: `Your previous JSON had these problems:\n${checked.errors.map((e) => `- ${e}`).join('\n')}\nReturn the complete corrected JSON.`,
        });
        continue;
      }

      const repaired = repair(checked.claims, opts.passages);
      stats.repairedClaims = repaired.repairedClaims;
      assertInvariants(repaired.claims, opts.passages);
      stats.latencyMs = Date.now() - started;
      return { claims: repaired.claims, stats };
    } catch (err) {
      if (err instanceof AppError) throw err;

      const isTimeout =
        err instanceof Error &&
        (err.name === 'TimeoutError' ||
          err.message.includes('aborted') ||
          err.message.includes('timeout'));
      if (isTimeout) {
        throw new AppError('UPSTREAM_TIMEOUT', 'LLM request timed out', 504);
      }

      if (attempt < maxAttempts - 1 && withValidation) {
        messages.push({
          role: 'assistant',
          content: lastRawText || '(no output)',
        });
        messages.push({
          role: 'user',
          content: `Your previous JSON had these problems:\n- Could not parse into the required schema: ${err instanceof Error ? err.message : String(err)}\nReturn the complete corrected JSON only, no markdown.`,
        });
        continue;
      }

      if (lastClaims) {
        const repaired = repair(lastClaims, opts.passages);
        stats.repairedClaims = repaired.repairedClaims;
        assertInvariants(repaired.claims, opts.passages);
        stats.latencyMs = Date.now() - started;
        return { claims: repaired.claims, stats };
      }

      if (isRateLimited(err)) {
        throw new AppError(
          'UPSTREAM_ERROR',
          'Upstream LLM rate limited (429)',
          502,
        );
      }

      const msg = err instanceof Error ? err.message : String(err);
      if (/5\d\d|network|fetch/i.test(msg)) {
        throw new AppError('UPSTREAM_ERROR', 'Upstream LLM error', 502);
      }
      throw new AppError(
        'MODEL_OUTPUT_INVALID',
        `Model output could not be parsed into claims: ${msg}`,
        502,
      );
    }
  }

  throw new AppError(
    'MODEL_OUTPUT_INVALID',
    'Model output could not be parsed into claims',
    502,
  );
}

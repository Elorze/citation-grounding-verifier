import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, NoObjectGeneratedError, Output } from 'ai';
import { env, requireLlmKey } from './config.js';
import { AppError } from './errors.js';
import { LlmOutput, type Claim } from './schema.js';
import { assertInvariants, checkClaims, repair } from './validate.js';
import { emptyStats, type VerifyStats } from './verifiers/types.js';

let _model: ReturnType<ReturnType<typeof createOpenAICompatible>> | null = null;

function getModel() {
  if (_model) return _model;
  const zhipu = createOpenAICompatible({
    name: 'zhipu',
    apiKey: requireLlmKey(),
    baseURL: env.LLM_BASE_URL,
  });
  _model = zhipu(env.LLM_MODEL);
  return _model;
}

export interface CallOptions {
  system: string;
  user: string;
  passages: string[];
  /** When false, skip validation retries — parse+Zod only then repair. */
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

export async function callWithValidation(
  opts: CallOptions,
): Promise<{ claims: Claim[]; stats: VerifyStats }> {
  const withValidation = opts.withValidation !== false;
  const stats = emptyStats();
  const started = Date.now();
  const model = getModel();

  type Msg =
    | { role: 'system'; content: string }
    | { role: 'user'; content: string }
    | { role: 'assistant'; content: string };

  const messages: Msg[] = [
    { role: 'system', content: opts.system },
    { role: 'user', content: opts.user },
  ];

  let lastClaims: Claim[] | null = null;
  let lastRawText = '';
  let firstAttemptInvalid: number | null = null;
  const maxAttempts = withValidation ? env.LLM_MAX_RETRIES + 1 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) stats.validationRetries += 1;
    stats.llmCalls += 1;

    try {
      const result = await generateText({
        model,
        messages,
        temperature: env.LLM_TEMPERATURE,
        output: Output.object({ schema: LlmOutput }),
        abortSignal: AbortSignal.timeout(env.LLM_TIMEOUT_MS),
        maxRetries: 2,
        providerOptions: {
          zhipu: {
            thinking: { type: env.LLM_THINKING },
          },
        },
      });

      stats.inputTokens += result.usage?.inputTokens ?? 0;
      stats.outputTokens += result.usage?.outputTokens ?? 0;

      const parsed = result.output;
      if (!parsed) {
        throw new Error('No structured output from model');
      }
      lastClaims = toClaims(parsed);
      lastRawText = JSON.stringify(parsed);

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

      let raw = lastRawText;
      if (NoObjectGeneratedError.isInstance(err)) {
        raw = err.text ?? raw;
      }

      if (attempt < maxAttempts - 1 && withValidation) {
        messages.push({
          role: 'assistant',
          content: raw || '(no output)',
        });
        messages.push({
          role: 'user',
          content: `Your previous JSON had these problems:\n- Could not parse into the required schema: ${err instanceof Error ? err.message : String(err)}\nReturn the complete corrected JSON.`,
        });
        lastRawText = raw;
        continue;
      }

      if (lastClaims) {
        const repaired = repair(lastClaims, opts.passages);
        stats.repairedClaims = repaired.repairedClaims;
        assertInvariants(repaired.claims, opts.passages);
        stats.latencyMs = Date.now() - started;
        return { claims: repaired.claims, stats };
      }

      const msg = err instanceof Error ? err.message : String(err);
      if (/429|5\d\d|network|fetch/i.test(msg)) {
        throw new AppError('UPSTREAM_ERROR', 'Upstream LLM error', 502);
      }
      throw new AppError(
        'MODEL_OUTPUT_INVALID',
        'Model output could not be parsed into claims',
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

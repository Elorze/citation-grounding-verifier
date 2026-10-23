import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { env, hasLlmKey } from './config.js';
import { AppError, toErrorBody, type ErrorCode } from './errors.js';
import { VerifyRequest } from './schema.js';
import { baselineVerifier } from './verifiers/baseline.js';
import { stubVerifier } from './verifiers/stub.js';
import type { Verifier, VerifyStats } from './verifiers/types.js';

export const MAX_BODY_BYTES = 1_000_000;

const verifiers: Record<string, Verifier> = {
  stub: stubVerifier,
  baseline: baselineVerifier,
};

let llmReady: Promise<void> | null = null;

function ensureLlmVerifiers(): Promise<void> {
  if (
    verifiers.minimal &&
    verifiers.optimized &&
    verifiers.prompt5 &&
    verifiers.prompt6 &&
    verifiers.prompt7 &&
    verifiers.prompt8
  ) {
    return Promise.resolve();
  }
  if (!hasLlmKey()) {
    return Promise.reject(
      new AppError(
        'INVALID_REQUEST',
        'LLM_API_KEY is required for LLM approaches',
        400,
      ),
    );
  }
  if (!llmReady) {
    llmReady = (async () => {
      const { llmMinimalVerifier } = await import('./verifiers/llmMinimal.js');
      const { llmOptimizedVerifier } = await import(
        './verifiers/llmOptimized.js'
      );
      const { llmWordingVerifier } = await import('./verifiers/llmWording.js');
      const { llmPrompt5Verifier } = await import('./verifiers/llmPrompt5.js');
      const { llmPrompt6Verifier } = await import('./verifiers/llmPrompt6.js');
      const { llmPrompt7Verifier } = await import('./verifiers/llmPrompt7.js');
      const { llmPrompt8Verifier } = await import('./verifiers/llmPrompt8.js');
      verifiers.minimal = llmMinimalVerifier;
      verifiers.optimized = llmOptimizedVerifier;
      verifiers.wording = llmWordingVerifier;
      verifiers.prompt5 = llmPrompt5Verifier;
      verifiers.prompt6 = llmPrompt6Verifier;
      verifiers.prompt7 = llmPrompt7Verifier;
      verifiers.prompt8 = llmPrompt8Verifier;
    })();
  }
  return llmReady;
}

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  INVALID_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  MODEL_OUTPUT_INVALID: 502,
  UPSTREAM_TIMEOUT: 504,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

async function resolveApproach(raw: string | undefined): Promise<Verifier> {
  const name = raw ?? env.VERIFIER;
  if (
    name === 'minimal' ||
    name === 'optimized' ||
    name === 'wording' ||
    name === 'prompt5' ||
    name === 'prompt6' ||
    name === 'prompt7' ||
    name === 'prompt8'
  ) {
    await ensureLlmVerifiers();
  }
  const v = verifiers[name];
  if (!v) {
    throw new AppError(
      'INVALID_REQUEST',
      `Unknown approach "${name}". Available: ${Object.keys(verifiers).join(', ')} (LLM needs LLM_API_KEY)`,
      400,
    );
  }
  return v;
}

function resolveRequestId(c: Context): string {
  const fromHeader = c.req.header('x-request-id')?.trim();
  if (fromHeader) return fromHeader;
  const fromQuery = c.req.query('request_id')?.trim();
  if (fromQuery) return fromQuery;
  return crypto.randomUUID();
}

function statsForDebug(stats: VerifyStats) {
  return {
    latency_ms: stats.latencyMs,
    llm_calls: stats.llmCalls,
    validation_retries: stats.validationRetries,
    input_tokens: stats.inputTokens,
    output_tokens: stats.outputTokens,
    raw_invalid_citations: stats.rawInvalidCitations,
    repaired_claims: stats.repairedClaims,
  };
}

export const app = new Hono();

app.get('/health', (c) =>
  c.json({
    ok: true,
    model: env.LLM_MODEL,
    provider: env.LLM_PROVIDER,
    verifiers: [
      ...Object.keys(verifiers),
      ...(hasLlmKey()
        ? [
            'minimal',
            'optimized',
            'wording',
            'prompt5',
            'prompt6',
            'prompt7',
            'prompt8',
          ]
        : []),
    ].filter((v, i, a) => a.indexOf(v) === i),
  }),
);

app.get('/healthz', (c) => c.json({ ok: true }));

app.post('/verify', async (c) => {
  const requestId = resolveRequestId(c);
  try {
    const raw = await c.req.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      throw new AppError(
        'PAYLOAD_TOO_LARGE',
        'Request body exceeds 1 MB',
        413,
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new AppError('INVALID_REQUEST', 'Body is not valid JSON', 400);
    }

    const parsed = VerifyRequest.safeParse(json);
    if (!parsed.success) {
      throw new AppError(
        'INVALID_REQUEST',
        'Request failed schema validation',
        400,
        parsed.error.issues,
      );
    }

    const verifier = await resolveApproach(c.req.query('approach'));
    const { response, stats } = await verifier.verify(parsed.data);
    const debug = c.req.query('debug') === '1';
    const body: Record<string, unknown> = {
      ...response,
      request_id: requestId,
    };
    if (debug) body.stats = statsForDebug(stats);
    return c.json(body);
  } catch (err) {
    if (err instanceof AppError) {
      return c.json(
        { ...toErrorBody(err), request_id: requestId },
        STATUS_BY_CODE[err.code] as 400,
      );
    }
    console.error(`[${requestId}]`, err);
    return c.json(
      {
        ...toErrorBody(
          new AppError('INTERNAL_ERROR', 'Unexpected server error', 500),
        ),
        request_id: requestId,
      },
      500,
    );
  }
});

export function startServer(port = env.PORT): void {
  console.log(`Listening on http://localhost:${port}`);
  serve({ fetch: app.fetch, port });
}

const entry = process.argv[1]?.replace(/\\/g, '/') ?? '';
if (entry.endsWith('/server.ts') || entry.endsWith('/server.js')) {
  startServer();
}

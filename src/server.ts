import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env } from './config.js';
import { AppError, toErrorBody, type ErrorCode } from './errors.js';
import { VerifyRequest } from './schema.js';
import { stubVerifier } from './verifiers/stub.js';
import type { Verifier } from './verifiers/types.js';

const MAX_BODY_BYTES = 1_000_000;

const verifiers: Record<string, Verifier> = {
  stub: stubVerifier,
};

export function registerVerifier(v: Verifier): void {
  verifiers[v.name] = v;
}

function resolveApproach(raw: string | undefined): Verifier {
  const name = raw ?? env.VERIFIER;
  const v = verifiers[name];
  if (!v) {
    throw new AppError(
      'INVALID_REQUEST',
      `Unknown approach "${name}". Available: ${Object.keys(verifiers).join(', ')}`,
      400,
    );
  }
  if ((name === 'minimal' || name === 'optimized') && !env.ZHIPU_API_KEY) {
    throw new AppError(
      'INVALID_REQUEST',
      'ZHIPU_API_KEY is required for LLM approaches',
      400,
    );
  }
  return v;
}

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  INVALID_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  MODEL_OUTPUT_INVALID: 502,
  UPSTREAM_TIMEOUT: 504,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

export const app = new Hono();

app.get('/health', (c) =>
  c.json({ ok: true, model: env.LLM_MODEL, verifiers: Object.keys(verifiers) }),
);

app.post('/verify', async (c) => {
  const requestId = crypto.randomUUID();
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

    const verifier = resolveApproach(c.req.query('approach'));
    const { response } = await verifier.verify(parsed.data);
    return c.json(response);
  } catch (err) {
    if (err instanceof AppError) {
      return c.json(toErrorBody(err), STATUS_BY_CODE[err.code] as 400);
    }
    console.error(`[${requestId}]`, err);
    return c.json(
      toErrorBody(
        new AppError('INTERNAL_ERROR', 'Unexpected server error', 500),
      ),
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

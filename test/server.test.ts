import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/config.js')>();
  return {
    ...actual,
    hasLlmKey: () => false,
  };
});

import { app, MAX_BODY_BYTES } from '../src/server.js';
import { MAX_CONTEXT_PASSAGES } from '../src/schema.js';

const stubBody = {
  context_passages: ['Hello world.'],
  generated_answer: 'Hello world.',
};

describe('HTTP /verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects bad JSON with 400 and request_id', async () => {
    const res = await app.request('/verify?approach=stub', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-json',
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as {
      error: { code: string };
      request_id: string;
    };
    expect(json.error.code).toBe('INVALID_REQUEST');
    expect(json.request_id).toBeTruthy();
  });

  it('rejects body over 1 MB with 413', async () => {
    const oversized = 'x'.repeat(MAX_BODY_BYTES + 1);
    const res = await app.request('/verify?approach=stub', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: oversized,
    });
    expect(res.status).toBe(413);
    const json = (await res.json()) as {
      error: { code: string };
      request_id: string;
    };
    expect(json.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(json.request_id).toBeTruthy();
  });

  it('rejects unknown approach with 400', async () => {
    const res = await app.request('/verify?approach=not-a-thing', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(stubBody),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { message: string } };
    expect(json.error.message).toMatch(/Unknown approach/i);
  });

  it('rejects minimal without LLM key with 400', async () => {
    const res = await app.request('/verify?approach=minimal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(stubBody),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { message: string } };
    expect(json.error.message).toMatch(/LLM_API_KEY/i);
  });

  it('stub success returns claims + request_id; debug=1 adds stats', async () => {
    const res = await app.request('/verify?approach=stub', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'test-req-1',
      },
      body: JSON.stringify(stubBody),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      claims: unknown[];
      request_id: string;
      stats?: unknown;
    };
    expect(Array.isArray(json.claims)).toBe(true);
    expect(json.request_id).toBe('test-req-1');
    expect(json.stats).toBeUndefined();

    const debugRes = await app.request('/verify?approach=stub&debug=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(stubBody),
    });
    const debugJson = (await debugRes.json()) as {
      request_id: string;
      stats: { latency_ms: number; llm_calls: number };
    };
    expect(debugJson.stats.llm_calls).toBe(0);
    expect(typeof debugJson.stats.latency_ms).toBe('number');
  });

  it('rejects too many context_passages via schema (400)', async () => {
    const res = await app.request('/verify?approach=stub', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        context_passages: Array.from(
          { length: MAX_CONTEXT_PASSAGES + 1 },
          () => 'p',
        ),
        generated_answer: 'x',
      }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { message: string } };
    expect(json.error.message).toMatch(/schema validation/i);
  });
});

describe('HTTP /healthz', () => {
  it('returns { ok: true }', async () => {
    const res = await app.request('/healthz');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

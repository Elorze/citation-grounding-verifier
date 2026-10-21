import { describe, expect, it } from 'vitest';
import { baselineVerifier } from '../src/verifiers/baseline.js';

describe('baselineVerifier', () => {
  it('returns UNSUPPORTED for empty context', async () => {
    const { response } = await baselineVerifier.verify({
      context_passages: [],
      generated_answer: 'The museum is free on Mondays.',
    });
    expect(response.claims.length).toBeGreaterThan(0);
    expect(response.claims.every((c) => c.verdict === 'UNSUPPORTED')).toBe(
      true,
    );
  });

  it('supports high lexical overlap', async () => {
    const { response } = await baselineVerifier.verify({
      context_passages: [
        'The Maple Street Community Pool is 25 meters long and has six lanes.',
      ],
      generated_answer: 'The Maple Street Community Pool is 25 meters long.',
    });
    expect(response.claims[0]!.verdict).toBe('SUPPORTED');
    expect(response.claims[0]!.citations.length).toBe(1);
  });
});

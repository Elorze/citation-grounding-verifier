import { describe, expect, it } from 'vitest';
import { checkClaims, repair } from '../src/validate.js';
import type { Claim } from '../src/schema.js';

const passages = [
  'Hello world. WAL does not work over a network filesystem.',
  'Automatic checkpointing occurs by default when the WAL passes approximately 1000 pages.',
];

describe('checkClaims', () => {
  it('accepts a valid SUPPORTED claim and fills offsets', () => {
    const claims: Claim[] = [
      {
        claim_text: 'WAL does not work over a network filesystem.',
        verdict: 'SUPPORTED',
        reasoning: 'quoted',
        citations: [
          {
            index: 0,
            quote: 'WAL does not work over a network filesystem.',
          },
        ],
      },
    ];
    const { errors, claims: out } = checkClaims(claims, passages);
    expect(errors).toEqual([]);
    expect(out[0]!.citations[0]!.start_char).toBe(13);
    expect(out[0]!.citations[0]!.end_char).toBe(57);
  });

  it('flags out-of-range index', () => {
    const claims: Claim[] = [
      {
        claim_text: 'x',
        verdict: 'SUPPORTED',
        reasoning: '',
        citations: [{ index: 3, quote: 'Hello' }],
      },
    ];
    const { errors } = checkClaims(claims, passages);
    expect(errors.some((e) => e.includes('out of range'))).toBe(true);
  });

  it('flags non-verbatim quote', () => {
    const claims: Claim[] = [
      {
        claim_text: 'x',
        verdict: 'SUPPORTED',
        reasoning: '',
        citations: [{ index: 0, quote: 'not in the passage' }],
      },
    ];
    const { errors } = checkClaims(claims, passages);
    expect(errors.some((e) => e.includes('quote not found'))).toBe(true);
  });

  it('requires citations for S/C and none for U', () => {
    const claims: Claim[] = [
      {
        claim_text: 'a',
        verdict: 'CONTRADICTED',
        reasoning: '',
        citations: [],
      },
      {
        claim_text: 'b',
        verdict: 'UNSUPPORTED',
        reasoning: '',
        citations: [{ index: 0, quote: 'Hello world' }],
      },
    ];
    const { errors } = checkClaims(claims, passages);
    expect(errors.some((e) => e.includes('requires at least one'))).toBe(true);
    expect(errors.some((e) => e.includes('empty citations'))).toBe(true);
  });

  it('drops exact duplicate claim_text', () => {
    const claims: Claim[] = [
      {
        claim_text: 'same',
        verdict: 'UNSUPPORTED',
        reasoning: '',
        citations: [],
      },
      {
        claim_text: 'same',
        verdict: 'UNSUPPORTED',
        reasoning: '',
        citations: [],
      },
    ];
    const { claims: out } = checkClaims(claims, passages);
    expect(out).toHaveLength(1);
  });
});

describe('repair', () => {
  it('downgrades S/C with no valid citation to UNSUPPORTED', () => {
    const claims: Claim[] = [
      {
        claim_text: 'bad',
        verdict: 'SUPPORTED',
        reasoning: 'guess',
        citations: [{ index: 0, quote: 'missing quote' }],
      },
    ];
    const { claims: out, repairedClaims } = repair(claims, passages);
    expect(repairedClaims).toBe(1);
    expect(out[0]!.verdict).toBe('UNSUPPORTED');
    expect(out[0]!.citations).toEqual([]);
    expect(out[0]!.reasoning).toContain('[auto: citation could not be verified]');
  });
});

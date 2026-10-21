import { describe, expect, it } from 'vitest';
import { claimSimilarity, matchClaims } from '../eval/match.js';
import type { Claim } from '../src/schema.js';

describe('claimSimilarity', () => {
  it('scores exact match high', () => {
    expect(
      claimSimilarity(
        'The pool is 25 meters long.',
        'The pool is 25 meters long.',
      ),
    ).toBeGreaterThan(0.9);
  });

  it('scores distant paraphrase below threshold', () => {
    expect(
      claimSimilarity(
        'Registration costs fifteen dollars.',
        'The bakery opens at dawn on weekdays.',
      ),
    ).toBeLessThan(0.5);
  });

  it('uses CJK bigrams for identical Chinese claims', () => {
    const s = claimSimilarity(
      'Hillcrest 健身房工作日早上 5 点开门。',
      'Hillcrest 健身房工作日早上 5 点开门。',
    );
    expect(s).toBeGreaterThan(0.9);
  });

  it('matches shorter Chinese pred to longer gold (case_022 style)', () => {
    expect(
      claimSimilarity(
        'Hillcrest 健身房月卡 50 美元。',
        '月卡 50 美元',
      ),
    ).toBeGreaterThanOrEqual(0.5);
    expect(
      claimSimilarity(
        'Hillcrest 健身房月卡包含所有团课。',
        '月卡包含所有团课',
      ),
    ).toBeGreaterThanOrEqual(0.5);
  });
});

describe('matchClaims', () => {
  it('aligns case_022-style gold/pred without missed+extra', () => {
    const gold = [
      {
        claim_text: 'Hillcrest 健身房工作日早上 5 点开门。',
        verdict: 'SUPPORTED' as const,
        citations: [],
      },
      {
        claim_text: 'Hillcrest 健身房月卡 50 美元。',
        verdict: 'CONTRADICTED' as const,
        citations: [],
      },
      {
        claim_text: 'Hillcrest 健身房月卡包含所有团课。',
        verdict: 'SUPPORTED' as const,
        citations: [],
      },
    ];
    const pred: Claim[] = [
      {
        claim_text: 'Hillcrest 健身房工作日早上 5 点开门。',
        verdict: 'SUPPORTED',
        reasoning: '',
        citations: [],
      },
      {
        claim_text: '月卡 50 美元',
        verdict: 'CONTRADICTED',
        reasoning: '',
        citations: [],
      },
      {
        claim_text: '月卡包含所有团课',
        verdict: 'SUPPORTED',
        reasoning: '',
        citations: [],
      },
    ];
    const m = matchClaims(gold, pred);
    expect(m.matches).toHaveLength(3);
    expect(m.missedGold).toHaveLength(0);
    expect(m.extraPred).toHaveLength(0);
  });

  it('greedily assigns one-to-one pairs', () => {
    const gold = [
      {
        claim_text: 'The pool is 25 meters long.',
        verdict: 'SUPPORTED' as const,
        citations: [],
      },
      {
        claim_text: 'The pool has six lanes.',
        verdict: 'SUPPORTED' as const,
        citations: [],
      },
    ];
    const pred: Claim[] = [
      {
        claim_text: 'The pool has six lanes.',
        verdict: 'SUPPORTED',
        reasoning: '',
        citations: [],
      },
      {
        claim_text: 'The pool is 25 meters long.',
        verdict: 'SUPPORTED',
        reasoning: '',
        citations: [],
      },
      {
        claim_text: 'Unrelated extra claim about dragons.',
        verdict: 'UNSUPPORTED',
        reasoning: '',
        citations: [],
      },
    ];
    const m = matchClaims(gold, pred);
    expect(m.matches).toHaveLength(2);
    expect(m.extraPred).toHaveLength(1);
    expect(m.missedGold).toHaveLength(0);
  });
});

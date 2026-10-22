import { describe, expect, it } from 'vitest';
import {
  loadRuns,
  mulberry32,
  resampleCaseIds,
  runBootstrap,
  type PerCaseRow,
  type RunSlice,
} from '../eval/bootstrap.js';
import type { MatchResult } from '../eval/match.js';

function emptyMatch(goldN: number, predN: number): MatchResult {
  return {
    matches: Array.from({ length: Math.min(goldN, predN) }, (_, i) => ({
      goldIndex: i,
      predIndex: i,
      score: 1,
      goldVerdict: 'SUPPORTED' as const,
      predVerdict: 'SUPPORTED' as const,
    })),
    missedGold: [],
    extraPred: [],
    borderlineCount: 0,
  };
}

function makeCase(id: string): PerCaseRow {
  return {
    id,
    gold: [
      { claim_text: `${id} claim`, verdict: 'SUPPORTED', citations: [] },
    ],
    pred: [
      {
        claim_text: `${id} claim`,
        verdict: 'SUPPORTED',
        reasoning: 'ok',
        citations: [],
      },
    ],
    match: emptyMatch(1, 1),
    caseExact: true,
  };
}

function identicalRuns(ids: string[]): RunSlice[] {
  const perCase = ids.map(makeCase);
  return [
    { perCase },
    { perCase: structuredClone(perCase) },
    { perCase: structuredClone(perCase) },
  ];
}

describe('paired bootstrap', () => {
  it('when A and B are identical, diff is 0 and CI is [0, 0]', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `c${String(i).padStart(2, '0')}`);
    const runs = identicalRuns(ids);
    const result = runBootstrap(runs, structuredClone(runs), {
      aLabel: 'A',
      bLabel: 'B',
      seed: 42,
      B: 1000,
    });
    expect(result.point.diff.macroF1).toBe(0);
    expect(result.point.diff.endToEndAccuracy).toBe(0);
    expect(result.ci.macroF1.lo).toBe(0);
    expect(result.ci.macroF1.hi).toBe(0);
    expect(result.ci.endToEndAccuracy.lo).toBe(0);
    expect(result.ci.endToEndAccuracy.hi).toBe(0);
  });

  it('mulberry32 is deterministic', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('resample draws with replacement of fixed length', () => {
    const ids = ['a', 'b', 'c'];
    const sample = resampleCaseIds(ids, mulberry32(1));
    expect(sample).toHaveLength(3);
    for (const id of sample) expect(ids).toContain(id);
  });

  it('loadRuns falls back to top-level perCase', () => {
    const runs = loadRuns({ perCase: [makeCase('x')] });
    expect(runs).toHaveLength(1);
    expect(runs[0]!.perCase[0]!.id).toBe('x');
  });
});

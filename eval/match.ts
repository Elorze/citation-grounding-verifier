import { jaccard, normalizeClaimKey, tokenize } from '../src/text.js';
import type { Claim, Verdict } from '../src/schema.js';

export const MATCH_THRESHOLD = 0.5;
/** Shorter normalized key must be at least this long for containment boost. */
const CONTAINMENT_MIN_LEN = 6;

export interface GoldClaim {
  claim_text: string;
  verdict: Verdict;
  citations: { index: number; quote: string }[];
}

export interface MatchPair {
  goldIndex: number;
  predIndex: number;
  score: number;
  goldVerdict: Verdict;
  predVerdict: Verdict;
}

export interface MatchResult {
  matches: MatchPair[];
  missedGold: number[];
  extraPred: number[];
  borderlineCount: number; // matched with score in [0.5, 0.6]
}

export function normalizeTokens(text: string): string[] {
  return tokenize(text, true);
}

/**
 * Jaccard over hybrid tokens, with a containment boost for asymmetric
 * Chinese/English claims (e.g. gold has "Hillcrest …", pred omits the name).
 */
export function claimSimilarity(a: string, b: string): number {
  const jac = jaccard(normalizeTokens(a), normalizeTokens(b));
  const na = normalizeClaimKey(a);
  const nb = normalizeClaimKey(b);
  if (
    na.length >= CONTAINMENT_MIN_LEN &&
    nb.length >= CONTAINMENT_MIN_LEN &&
    (na.includes(nb) || nb.includes(na))
  ) {
    return Math.max(jac, 1);
  }
  return jac;
}

/**
 * Greedy one-to-one matching by Jaccard ≥ MATCH_THRESHOLD.
 */
export function matchClaims(
  gold: GoldClaim[],
  pred: Claim[],
): MatchResult {
  type Cand = { g: number; p: number; score: number };
  const cands: Cand[] = [];
  for (let g = 0; g < gold.length; g++) {
    for (let p = 0; p < pred.length; p++) {
      const score = claimSimilarity(gold[g]!.claim_text, pred[p]!.claim_text);
      if (score >= MATCH_THRESHOLD) cands.push({ g, p, score });
    }
  }
  cands.sort((a, b) => b.score - a.score);

  const usedG = new Set<number>();
  const usedP = new Set<number>();
  const matches: MatchPair[] = [];
  let borderlineCount = 0;

  for (const c of cands) {
    if (usedG.has(c.g) || usedP.has(c.p)) continue;
    usedG.add(c.g);
    usedP.add(c.p);
    matches.push({
      goldIndex: c.g,
      predIndex: c.p,
      score: c.score,
      goldVerdict: gold[c.g]!.verdict,
      predVerdict: pred[c.p]!.verdict,
    });
    if (c.score >= 0.5 && c.score <= 0.6) borderlineCount += 1;
  }

  const missedGold: number[] = [];
  const extraPred: number[] = [];
  for (let g = 0; g < gold.length; g++) if (!usedG.has(g)) missedGold.push(g);
  for (let p = 0; p < pred.length; p++) if (!usedP.has(p)) extraPred.push(p);

  return { matches, missedGold, extraPred, borderlineCount };
}

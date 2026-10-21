import type { Claim, VerifyRequest } from '../schema.js';
import { contentTokens, splitSentences } from '../text.js';
import { assertInvariants } from '../validate.js';
import { emptyStats, type Verifier } from './types.js';

const K1 = 1.2;
const B = 0.75;
const COVERAGE_SUPPORTED = 0.7;
const COVERAGE_CONTRADICT = 0.4;

const NEGATIONS = new Set(['not', 'no', 'never', 'cannot', 'can\'t', 'dont', "don't"]);

interface Doc {
  tokens: string[];
  text: string;
  passageIndex: number;
  start: number;
  end: number;
}

function extractNumbers(text: string): string[] {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).map((n) => n);
}

function negationSet(text: string): Set<string> {
  const toks = text.toLowerCase().replace(/[^\w\s']/g, ' ').split(/\s+/);
  return new Set(toks.filter((t) => NEGATIONS.has(t)));
}

function negationMismatch(claim: string, sentence: string): boolean {
  const a = negationSet(claim);
  const b = negationSet(sentence);
  if (a.size === 0 && b.size === 0) return false;
  // Mismatch if one has a negation token the other lacks (simple heuristic)
  for (const t of a) if (!b.has(t)) return true;
  for (const t of b) if (!a.has(t)) return true;
  return false;
}

function numberAbsent(claim: string, sentence: string): boolean {
  const cn = extractNumbers(claim);
  if (cn.length === 0) return false;
  const sn = new Set(extractNumbers(sentence));
  return cn.some((n) => !sn.has(n));
}

function bm25Scores(query: string[], docs: Doc[]): number[] {
  const N = docs.length || 1;
  const avgdl =
    docs.reduce((s, d) => s + d.tokens.length, 0) / N || 1;
  const df = new Map<string, number>();
  for (const t of new Set(query)) {
    let c = 0;
    for (const d of docs) if (d.tokens.includes(t)) c += 1;
    df.set(t, c);
  }
  return docs.map((d) => {
    let score = 0;
    const tfMap = new Map<string, number>();
    for (const t of d.tokens) tfMap.set(t, (tfMap.get(t) ?? 0) + 1);
    for (const t of query) {
      const tf = tfMap.get(t) ?? 0;
      if (tf === 0) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      const denom = tf + K1 * (1 - B + B * (d.tokens.length / avgdl));
      score += idf * ((tf * (K1 + 1)) / denom);
    }
    return score;
  });
}

function coverage(claimTokens: string[], sentTokens: string[]): number {
  if (claimTokens.length === 0) return 0;
  const set = new Set(sentTokens);
  let hit = 0;
  for (const t of claimTokens) if (set.has(t)) hit += 1;
  return hit / claimTokens.length;
}

export const baselineVerifier: Verifier = {
  name: 'baseline',
  async verify(req: VerifyRequest) {
    const started = Date.now();
    if (!req.generated_answer.trim()) {
      return {
        response: { claims: [] },
        stats: emptyStats({ latencyMs: Date.now() - started }),
      };
    }

    const claimSpans = splitSentences(req.generated_answer);
    if (req.context_passages.length === 0) {
      const claims: Claim[] = claimSpans.map((s) => ({
        claim_text: s.text,
        verdict: 'UNSUPPORTED',
        reasoning: 'Empty context; baseline marks all claims UNSUPPORTED.',
        citations: [],
      }));
      assertInvariants(claims, req.context_passages);
      return {
        response: { claims },
        stats: emptyStats({ latencyMs: Date.now() - started }),
      };
    }

    const docs: Doc[] = [];
    req.context_passages.forEach((passage, passageIndex) => {
      for (const s of splitSentences(passage)) {
        docs.push({
          tokens: contentTokens(s.text),
          text: s.text,
          passageIndex,
          start: s.start,
          end: s.end,
        });
      }
    });

    const claims: Claim[] = claimSpans.map((span) => {
      const qTokens = contentTokens(span.text);
      if (docs.length === 0) {
        return {
          claim_text: span.text,
          verdict: 'UNSUPPORTED' as const,
          reasoning: 'No passage sentences to compare.',
          citations: [],
        };
      }
      const scores = bm25Scores(qTokens, docs);
      let best = 0;
      for (let i = 1; i < scores.length; i++) {
        if (scores[i]! > scores[best]!) best = i;
      }
      const bestDoc = docs[best]!;
      const cov = coverage(qTokens, bestDoc.tokens);

      if (cov >= COVERAGE_SUPPORTED) {
        return {
          claim_text: span.text,
          verdict: 'SUPPORTED' as const,
          reasoning: `BM25 best sentence coverage=${cov.toFixed(2)} ≥ ${COVERAGE_SUPPORTED}.`,
          citations: [
            {
              index: bestDoc.passageIndex,
              quote: bestDoc.text,
              start_char: bestDoc.start,
              end_char: bestDoc.end,
            },
          ],
        };
      }

      if (
        cov >= COVERAGE_CONTRADICT &&
        (numberAbsent(span.text, bestDoc.text) ||
          negationMismatch(span.text, bestDoc.text))
      ) {
        return {
          claim_text: span.text,
          verdict: 'CONTRADICTED' as const,
          reasoning: `Partial coverage=${cov.toFixed(2)} with number/negation mismatch vs best sentence.`,
          citations: [
            {
              index: bestDoc.passageIndex,
              quote: bestDoc.text,
              start_char: bestDoc.start,
              end_char: bestDoc.end,
            },
          ],
        };
      }

      return {
        claim_text: span.text,
        verdict: 'UNSUPPORTED' as const,
        reasoning: `Coverage=${cov.toFixed(2)} below thresholds (hand-picked constants; not tuned on test set).`,
        citations: [],
      };
    });

    assertInvariants(claims, req.context_passages);
    return {
      response: { claims },
      stats: emptyStats({ latencyMs: Date.now() - started }),
    };
  },
};

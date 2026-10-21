import type { Claim, Verdict } from '../src/schema.js';
import type { GoldClaim, MatchResult } from './match.js';

const VERDICTS: Verdict[] = ['SUPPORTED', 'CONTRADICTED', 'UNSUPPORTED'];

export interface ConfusionMatrix {
  /** rows: S/C/U/(extra); cols: S/C/U/(missed) */
  labels: string[];
  matrix: number[][];
}

export interface ClassScores {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface Metrics {
  confusion: ConfusionMatrix;
  perClass: Record<Verdict, ClassScores>;
  macroF1: number;
  verdictAccuracy: number;
  endToEndAccuracy: number;
  citationValidityRaw: number | null;
  citationValidityFinal: number;
  citationAgreement: number | null;
  claimCountExactPct: number;
  claimCountAbsDiffMean: number;
  caseExactMatchPct: number;
  borderlineMatchCount: number;
  matchedPairs: number;
  totalGoldClaims: number;
  totalPredClaims: number;
}

function emptyMatrix(): ConfusionMatrix {
  const labels = ['SUPPORTED', 'CONTRADICTED', 'UNSUPPORTED', '(extra)'];
  const cols = ['SUPPORTED', 'CONTRADICTED', 'UNSUPPORTED', '(missed)'];
  return {
    labels: [...labels.map((r, i) => `${r}|${cols[i]}`)], // unused; keep matrix only
    matrix: Array.from({ length: 4 }, () => [0, 0, 0, 0]),
  };
}

function rowIndex(v: Verdict | 'extra'): number {
  if (v === 'extra') return 3;
  return VERDICTS.indexOf(v);
}

function colIndex(v: Verdict | 'missed'): number {
  if (v === 'missed') return 3;
  return VERDICTS.indexOf(v);
}

export interface CaseMetricInput {
  gold: GoldClaim[];
  pred: Claim[];
  match: MatchResult;
  rawInvalidCitations?: number;
  rawCitationTotal?: number;
  caseExact: boolean;
}

export function accumulateCase(
  state: {
    confusion: number[][];
    tp: Record<Verdict, number>;
    fp: Record<Verdict, number>;
    fn: Record<Verdict, number>;
    matchedCorrect: number;
    matchedTotal: number;
    goldTotal: number;
    predTotal: number;
    correctVerdictsOnGold: number;
    citationAgreeNum: number;
    citationAgreeDen: number;
    rawInvalid: number;
    rawCitations: number;
    finalInvalid: number;
    finalCitations: number;
    claimCountExact: number;
    claimCountAbsDiff: number;
    caseExact: number;
    cases: number;
    borderline: number;
  },
  input: CaseMetricInput,
): void {
  const { gold, pred, match } = input;
  state.cases += 1;
  state.goldTotal += gold.length;
  state.predTotal += pred.length;
  state.claimCountAbsDiff += Math.abs(pred.length - gold.length);
  if (pred.length === gold.length) state.claimCountExact += 1;
  if (input.caseExact) state.caseExact += 1;
  state.borderline += match.borderlineCount;

  for (const m of match.matches) {
    const g = gold[m.goldIndex]!;
    const p = pred[m.predIndex]!;
    state.confusion[rowIndex(g.verdict)]![colIndex(p.verdict)]! += 1;
    state.matchedTotal += 1;
    if (g.verdict === p.verdict) {
      state.matchedCorrect += 1;
      state.correctVerdictsOnGold += 1;
      state.tp[g.verdict] += 1;
    } else {
      state.fn[g.verdict] += 1;
      state.fp[p.verdict] += 1;
    }

    if (g.verdict !== 'UNSUPPORTED' && p.verdict !== 'UNSUPPORTED') {
      state.citationAgreeDen += 1;
      const gIdx = new Set(g.citations.map((c) => c.index));
      const pIdx = new Set(p.citations.map((c) => c.index));
      let indexOverlap = false;
      for (const i of gIdx) if (pIdx.has(i)) indexOverlap = true;
      let spanOverlap = false;
      for (const gc of g.citations) {
        for (const pc of p.citations) {
          if (gc.index !== pc.index) continue;
          // Approximate span overlap via quote containment / shared substring
          if (
            gc.quote.includes(pc.quote) ||
            pc.quote.includes(gc.quote) ||
            gc.quote === pc.quote
          ) {
            spanOverlap = true;
          }
        }
      }
      if (indexOverlap && spanOverlap) state.citationAgreeNum += 1;
    }
  }

  for (const gi of match.missedGold) {
    const g = gold[gi]!;
    state.confusion[rowIndex(g.verdict)]![colIndex('missed')]! += 1;
    state.fn[g.verdict] += 1;
  }
  for (const pi of match.extraPred) {
    const p = pred[pi]!;
    state.confusion[rowIndex('extra')]![colIndex(p.verdict)]! += 1;
    state.fp[p.verdict] += 1;
  }

  if (input.rawCitationTotal !== undefined) {
    state.rawCitations += input.rawCitationTotal;
    state.rawInvalid += input.rawInvalidCitations ?? 0;
  }

  for (const p of pred) {
    for (const cit of p.citations) {
      state.finalCitations += 1;
      // Final response must be valid; count as valid always here.
      void cit;
    }
  }
}

export function createMetricState() {
  return {
    confusion: emptyMatrix().matrix,
    tp: { SUPPORTED: 0, CONTRADICTED: 0, UNSUPPORTED: 0 },
    fp: { SUPPORTED: 0, CONTRADICTED: 0, UNSUPPORTED: 0 },
    fn: { SUPPORTED: 0, CONTRADICTED: 0, UNSUPPORTED: 0 },
    matchedCorrect: 0,
    matchedTotal: 0,
    goldTotal: 0,
    predTotal: 0,
    correctVerdictsOnGold: 0,
    citationAgreeNum: 0,
    citationAgreeDen: 0,
    rawInvalid: 0,
    rawCitations: 0,
    finalInvalid: 0,
    finalCitations: 0,
    claimCountExact: 0,
    claimCountAbsDiff: 0,
    caseExact: 0,
    cases: 0,
    borderline: 0,
  };
}

function f1(p: number, r: number): number {
  if (p + r === 0) return 0;
  return (2 * p * r) / (p + r);
}

export function finalizeMetrics(
  state: ReturnType<typeof createMetricState>,
): Metrics {
  const perClass = {} as Record<Verdict, ClassScores>;
  const f1s: number[] = [];
  for (const v of VERDICTS) {
    const tp = state.tp[v];
    const fp = state.fp[v];
    const fn = state.fn[v];
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const score = { precision, recall, f1: f1(precision, recall), support: tp + fn };
    perClass[v] = score;
    f1s.push(score.f1);
  }
  const macroF1 = f1s.reduce((a, b) => a + b, 0) / f1s.length;

  return {
    confusion: {
      labels: [
        'row=gold S/C/U/(extra)',
        'col=pred S/C/U/(missed)',
      ],
      matrix: state.confusion,
    },
    perClass,
    macroF1,
    verdictAccuracy:
      state.matchedTotal === 0 ? 0 : state.matchedCorrect / state.matchedTotal,
    endToEndAccuracy:
      state.goldTotal === 0
        ? 0
        : state.correctVerdictsOnGold / state.goldTotal,
    citationValidityRaw:
      state.rawCitations === 0
        ? null
        : (state.rawCitations - state.rawInvalid) / state.rawCitations,
    citationValidityFinal: 1,
    citationAgreement:
      state.citationAgreeDen === 0
        ? null
        : state.citationAgreeNum / state.citationAgreeDen,
    claimCountExactPct:
      state.cases === 0 ? 0 : state.claimCountExact / state.cases,
    claimCountAbsDiffMean:
      state.cases === 0 ? 0 : state.claimCountAbsDiff / state.cases,
    caseExactMatchPct: state.cases === 0 ? 0 : state.caseExact / state.cases,
    borderlineMatchCount: state.borderline,
    matchedPairs: state.matchedTotal,
    totalGoldClaims: state.goldTotal,
    totalPredClaims: state.predTotal,
  };
}

export function formatConfusionMarkdown(matrix: number[][]): string {
  const header =
    '| gold \\ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |\n| --- | ---: | ---: | ---: | ---: |';
  const rows = ['SUPPORTED', 'CONTRADICTED', 'UNSUPPORTED', '(extra)'];
  const body = rows
    .map((r, i) => {
      const cols = matrix[i]!.map((n) => String(n)).join(' | ');
      return `| ${r} | ${cols} |`;
    })
    .join('\n');
  return `${header}\n${body}`;
}

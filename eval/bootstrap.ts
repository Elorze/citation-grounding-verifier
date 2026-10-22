/**
 * Paired case-level bootstrap CI over two eval result JSONs.
 * Usage:
 *   pnpm tsx eval/bootstrap.ts --a results/4-prompt2.json --b results/4-prompt3.json \
 *     [--a-label prompt2] [--b-label prompt3]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  accumulateCase,
  createMetricState,
  finalizeMetrics,
} from './metrics.js';
import type { MatchResult } from './match.js';
import type { Claim } from '../src/schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const B = 10_000;
const SEED = 42;

export interface PerCaseRow {
  id: string;
  gold: { claim_text: string; verdict: string; citations: unknown[] }[];
  pred: Claim[];
  match: MatchResult;
  caseExact: boolean;
  rawInvalidCitations?: number;
}

export interface RunSlice {
  perCase: PerCaseRow[];
  metrics?: { macroF1: number; endToEndAccuracy: number };
}

export interface EvalResultFile {
  perCase?: PerCaseRow[];
  runDetails?: RunSlice[];
  metrics?: { macroF1: number; endToEndAccuracy: number };
}

function resolvePath(p: string): string {
  return isAbsolute(p) ? p : join(ROOT, p);
}

function parseArgs(argv: string[]) {
  const out: {
    a?: string;
    b?: string;
    aLabel: string;
    bLabel: string;
  } = { aLabel: 'A', bLabel: 'B' };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i]!;
    if (x === '--a') out.a = argv[++i]!;
    else if (x === '--b') out.b = argv[++i]!;
    else if (x === '--a-label') out.aLabel = argv[++i]!;
    else if (x === '--b-label') out.bLabel = argv[++i]!;
  }
  if (!out.a || !out.b) {
    throw new Error('Usage: --a <json> --b <json> [--a-label] [--b-label]');
  }
  return out as { a: string; b: string; aLabel: string; bLabel: string };
}

export function loadRuns(file: EvalResultFile): RunSlice[] {
  if (file.runDetails && file.runDetails.length > 0) {
    return file.runDetails.map((r) => ({
      perCase: r.perCase,
      metrics: r.metrics,
    }));
  }
  if (!file.perCase) {
    throw new Error('Result JSON missing perCase / runDetails');
  }
  return [{ perCase: file.perCase, metrics: file.metrics }];
}

export function metricsForCaseIds(
  run: RunSlice,
  caseIds: string[],
): { macroF1: number; endToEndAccuracy: number } {
  const byId = new Map(run.perCase.map((c) => [c.id, c]));
  const state = createMetricState();
  for (const id of caseIds) {
    const row = byId.get(id);
    if (!row) throw new Error(`Missing case ${id} in run`);
    accumulateCase(state, {
      gold: row.gold as Parameters<typeof accumulateCase>[1]['gold'],
      pred: row.pred,
      match: row.match,
      caseExact: row.caseExact,
      rawInvalidCitations: row.rawInvalidCitations,
    });
  }
  const m = finalizeMetrics(state);
  return { macroF1: m.macroF1, endToEndAccuracy: m.endToEndAccuracy };
}

/** Mulberry32 PRNG — deterministic, seedable. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function resampleCaseIds(
  caseIds: string[],
  rng: () => number,
): string[] {
  const n = caseIds.length;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(caseIds[Math.floor(rng() * n)]!);
  }
  return out;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function percentileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx]!;
}

export interface BootstrapResult {
  aLabel: string;
  bLabel: string;
  caseCount: number;
  aRuns: number;
  bRuns: number;
  point: {
    a: { macroF1: number; endToEndAccuracy: number };
    b: { macroF1: number; endToEndAccuracy: number };
    diff: { macroF1: number; endToEndAccuracy: number };
  };
  ci: {
    macroF1: { lo: number; hi: number; pLeq0: number };
    endToEndAccuracy: { lo: number; hi: number; pLeq0: number };
  };
  unstable: { a: string[]; b: string[] };
}

/** Outcome signature for one gold claim in one run. */
function goldOutcome(row: PerCaseRow, goldIndex: number): string {
  const hit = row.match.matches.find((m) => m.goldIndex === goldIndex);
  if (!hit) return 'MISSED';
  return `MATCH:${hit.predVerdict}`;
}

export function unstableCaseIds(runs: RunSlice[]): string[] {
  if (runs.length <= 1) return [];
  const ids = runs[0]!.perCase.map((c) => c.id);
  const unstable: string[] = [];
  for (const id of ids) {
    const rows = runs.map((r) => r.perCase.find((c) => c.id === id));
    if (rows.some((r) => !r)) continue;
    const goldN = rows[0]!.gold.length;
    let bad = false;
    for (let gi = 0; gi < goldN; gi++) {
      const sigs = new Set(rows.map((r) => goldOutcome(r!, gi)));
      if (sigs.size > 1) {
        bad = true;
        break;
      }
    }
    if (bad) unstable.push(id);
  }
  return unstable;
}

export function runBootstrap(
  aRuns: RunSlice[],
  bRuns: RunSlice[],
  opts: { aLabel: string; bLabel: string; seed?: number; B?: number },
): BootstrapResult {
  const seed = opts.seed ?? SEED;
  const resamples = opts.B ?? B;
  const caseIds = aRuns[0]!.perCase.map((c) => c.id);
  if (caseIds.length === 0) throw new Error('No cases');
  for (const r of [...aRuns, ...bRuns]) {
    const ids = new Set(r.perCase.map((c) => c.id));
    for (const id of caseIds) {
      if (!ids.has(id)) throw new Error(`Case ${id} missing across runs`);
    }
  }

  const allIds = caseIds;
  const pointA = {
    macroF1: mean(aRuns.map((r) => metricsForCaseIds(r, allIds).macroF1)),
    endToEndAccuracy: mean(
      aRuns.map((r) => metricsForCaseIds(r, allIds).endToEndAccuracy),
    ),
  };
  const pointB = {
    macroF1: mean(bRuns.map((r) => metricsForCaseIds(r, allIds).macroF1)),
    endToEndAccuracy: mean(
      bRuns.map((r) => metricsForCaseIds(r, allIds).endToEndAccuracy),
    ),
  };

  const rng = mulberry32(seed);
  const diffF1: number[] = [];
  const diffE2e: number[] = [];
  for (let i = 0; i < resamples; i++) {
    const sample = resampleCaseIds(allIds, rng);
    const aF1 = mean(aRuns.map((r) => metricsForCaseIds(r, sample).macroF1));
    const bF1 = mean(bRuns.map((r) => metricsForCaseIds(r, sample).macroF1));
    const aE = mean(
      aRuns.map((r) => metricsForCaseIds(r, sample).endToEndAccuracy),
    );
    const bE = mean(
      bRuns.map((r) => metricsForCaseIds(r, sample).endToEndAccuracy),
    );
    diffF1.push(bF1 - aF1);
    diffE2e.push(bE - aE);
  }
  const sortedF1 = [...diffF1].sort((x, y) => x - y);
  const sortedE = [...diffE2e].sort((x, y) => x - y);

  return {
    aLabel: opts.aLabel,
    bLabel: opts.bLabel,
    caseCount: allIds.length,
    aRuns: aRuns.length,
    bRuns: bRuns.length,
    point: {
      a: pointA,
      b: pointB,
      diff: {
        macroF1: pointB.macroF1 - pointA.macroF1,
        endToEndAccuracy: pointB.endToEndAccuracy - pointA.endToEndAccuracy,
      },
    },
    ci: {
      macroF1: {
        lo: percentileSorted(sortedF1, 2.5),
        hi: percentileSorted(sortedF1, 97.5),
        pLeq0: diffF1.filter((d) => d <= 0).length / diffF1.length,
      },
      endToEndAccuracy: {
        lo: percentileSorted(sortedE, 2.5),
        hi: percentileSorted(sortedE, 97.5),
        pLeq0: diffE2e.filter((d) => d <= 0).length / diffE2e.length,
      },
    },
    unstable: {
      a: unstableCaseIds(aRuns),
      b: unstableCaseIds(bRuns),
    },
  };
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function fmt(n: number): string {
  return n.toFixed(3);
}

function toMarkdown(r: BootstrapResult): string {
  const lines: string[] = [];
  lines.push(`# Paired bootstrap: ${r.aLabel} vs ${r.bLabel}`);
  lines.push('');
  lines.push(
    `Case-level paired bootstrap, B=${B}, seed=${SEED}, averaged over ${r.aRuns}/${r.bRuns} runs (n=${r.caseCount} cases).`,
  );
  lines.push('');
  lines.push('## Point estimates and 95% CI on diff (B − A)');
  lines.push('');
  lines.push(
    `| Metric | ${r.aLabel} | ${r.bLabel} | diff (B−A) | 95% CI | P(diff ≤ 0) |`,
  );
  lines.push('| --- | ---: | ---: | ---: | --- | ---: |');
  lines.push(
    `| macro-F1 | ${fmt(r.point.a.macroF1)} | ${fmt(r.point.b.macroF1)} | ${fmt(r.point.diff.macroF1)} | [${fmt(r.ci.macroF1.lo)}, ${fmt(r.ci.macroF1.hi)}] | ${fmt(r.ci.macroF1.pLeq0)} |`,
  );
  lines.push(
    `| end-to-end | ${fmt(r.point.a.endToEndAccuracy)} | ${fmt(r.point.b.endToEndAccuracy)} | ${fmt(r.point.diff.endToEndAccuracy)} | [${fmt(r.ci.endToEndAccuracy.lo)}, ${fmt(r.ci.endToEndAccuracy.hi)}] | ${fmt(r.ci.endToEndAccuracy.pLeq0)} |`,
  );
  lines.push('');
  lines.push('## Unstable cases (gold-claim outcome differs across runs)');
  lines.push('');
  lines.push(
    `- **${r.aLabel}**: ${r.unstable.a.length} — ${r.unstable.a.length ? r.unstable.a.join(', ') : '_none_'}`,
  );
  lines.push(
    `- **${r.bLabel}**: ${r.unstable.b.length} — ${r.unstable.b.length ? r.unstable.b.join(', ') : '_none_'}`,
  );
  lines.push('');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const aFile = JSON.parse(
    readFileSync(resolvePath(args.a), 'utf8'),
  ) as EvalResultFile;
  const bFile = JSON.parse(
    readFileSync(resolvePath(args.b), 'utf8'),
  ) as EvalResultFile;
  const result = runBootstrap(loadRuns(aFile), loadRuns(bFile), {
    aLabel: args.aLabel,
    bLabel: args.bLabel,
  });
  const md = toMarkdown(result);
  console.log(md);
  const outDir = join(ROOT, 'results');
  mkdirSync(outDir, { recursive: true });
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const outPath = join(
    outDir,
    `bootstrap-${safe(args.aLabel)}-vs-${safe(args.bLabel)}-${stamp()}.md`,
  );
  writeFileSync(outPath, md, 'utf8');
  console.log(`Wrote ${outPath}`);
}

const entry = process.argv[1]
  ? pathToFileURL(
      isAbsolute(process.argv[1])
        ? process.argv[1]
        : join(process.cwd(), process.argv[1]),
    ).href
  : '';
if (import.meta.url === entry) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { env } from '../src/config.js';
import { EvalCase, type Claim } from '../src/schema.js';
import { stubVerifier } from '../src/verifiers/stub.js';
import type { Verifier, VerifyStats } from '../src/verifiers/types.js';
import { MATCH_THRESHOLD, matchClaims } from './match.js';
import {
  accumulateCase,
  createMetricState,
  finalizeMetrics,
  formatConfusionMarkdown,
} from './metrics.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEFAULT_DATASET = join('eval', '1-1.jsonl');

function parseArgs(argv: string[]) {
  const out: {
    approach: string;
    label?: string;
    ids?: string[];
    limit?: number;
    repeat: number;
    dataset: string;
    /** If set, write results/<outBase>.json|.md instead of approach-timestamp. */
    outBase?: string;
  } = { approach: 'stub', repeat: 1, dataset: DEFAULT_DATASET };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--approach') out.approach = argv[++i]!;
    else if (a === '--label') out.label = argv[++i]!;
    else if (a === '--ids') out.ids = argv[++i]!.split(',');
    else if (a === '--limit') out.limit = Number(argv[++i]);
    else if (a === '--repeat') out.repeat = Number(argv[++i]);
    else if (a === '--dataset' || a === '--cases') out.dataset = argv[++i]!;
    else if (a === '--out-base' || a === '--out') out.outBase = argv[++i]!;
  }
  return out;
}

function resolveDatasetPath(relOrAbs: string): string {
  return isAbsolute(relOrAbs) ? relOrAbs : join(ROOT, relOrAbs);
}

function sha256File(absPath: string): string {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

function loadCases(datasetPath: string): EvalCase[] {
  const abs = resolveDatasetPath(datasetPath);
  const lines = readFileSync(abs, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line, i) => {
    const parsed = EvalCase.safeParse(JSON.parse(line));
    if (!parsed.success) {
      throw new Error(`Invalid case line ${i + 1}: ${parsed.error.message}`);
    }
    return parsed.data;
  });
}

function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function getVerifier(name: string): Promise<Verifier> {
  if (name === 'stub') return stubVerifier;
  if (name === 'baseline') {
    const { baselineVerifier } = await import('../src/verifiers/baseline.js');
    return baselineVerifier;
  }
  if (name === 'minimal') {
    const { llmMinimalVerifier } = await import('../src/verifiers/llmMinimal.js');
    return llmMinimalVerifier;
  }
  if (name === 'optimized') {
    const { llmOptimizedVerifier } = await import(
      '../src/verifiers/llmOptimized.js'
    );
    return llmOptimizedVerifier;
  }
  if (name === 'wording') {
    const { llmWordingVerifier } = await import('../src/verifiers/llmWording.js');
    return llmWordingVerifier;
  }
  if (name === 'prompt5') {
    const { llmPrompt5Verifier } = await import('../src/verifiers/llmPrompt5.js');
    return llmPrompt5Verifier;
  }
  if (name === 'prompt6') {
    const { llmPrompt6Verifier } = await import('../src/verifiers/llmPrompt6.js');
    return llmPrompt6Verifier;
  }
  if (name === 'prompt7') {
    const { llmPrompt7Verifier } = await import('../src/verifiers/llmPrompt7.js');
    return llmPrompt7Verifier;
  }
  throw new Error(`Unknown approach: ${name}`);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx]!;
}

async function runOnce(
  verifier: Verifier,
  cases: EvalCase[],
  label: string | undefined,
  datasetMeta: { path: string; sha256: string },
) {
  const state = createMetricState();
  const perCase: unknown[] = [];
  const latencies: number[] = [];
  let totalInput = 0;
  let totalOutput = 0;
  let totalCalls = 0;
  let totalRetries = 0;
  const failures: string[] = [];

  for (let caseIdx = 0; caseIdx < cases.length; caseIdx++) {
    const c = cases[caseIdx]!;
    console.log(`[${caseIdx + 1}/${cases.length}] ${c.id}…`);
    const t0 = Date.now();
    let predClaims: Claim[] = [];
    let stats: VerifyStats = {
      llmCalls: 0,
      validationRetries: 0,
      inputTokens: 0,
      outputTokens: 0,
      rawInvalidCitations: 0,
      repairedClaims: 0,
      latencyMs: 0,
    };
    let error: string | undefined;
    try {
      const result = await verifier.verify({
        context_passages: c.context_passages,
        generated_answer: c.generated_answer,
      });
      predClaims = result.response.claims;
      stats = result.stats;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      predClaims = [];
    }
    const latency = stats.latencyMs || Date.now() - t0;
    latencies.push(latency);
    totalInput += stats.inputTokens;
    totalOutput += stats.outputTokens;
    totalCalls += stats.llmCalls;
    totalRetries += stats.validationRetries;

    const match = matchClaims(c.gold_claims, predClaims);
    const caseExact =
      match.missedGold.length === 0 &&
      match.extraPred.length === 0 &&
      match.matches.every((m) => m.goldVerdict === m.predVerdict);

    accumulateCase(state, {
      gold: c.gold_claims,
      pred: predClaims,
      match,
      rawInvalidCitations: stats.rawInvalidCitations,
      // Approximate: treat each citation on first attempt; we only have invalid count.
      rawCitationTotal:
        stats.rawInvalidCitations > 0
          ? stats.rawInvalidCitations +
            predClaims.reduce((n, cl) => n + cl.citations.length, 0)
          : predClaims.reduce((n, cl) => n + cl.citations.length, 0) || undefined,
      caseExact,
    });

    for (const m of match.matches) {
      if (m.goldVerdict !== m.predVerdict) {
        failures.push(
          `- **${c.id}** (${c.category}): gold=${m.goldVerdict} pred=${m.predVerdict} | gold="${c.gold_claims[m.goldIndex]!.claim_text}" | pred="${predClaims[m.predIndex]!.claim_text}" | reasoning=${JSON.stringify(predClaims[m.predIndex]!.reasoning)}`,
        );
      }
    }
    for (const gi of match.missedGold) {
      failures.push(
        `- **${c.id}** (${c.category}): MISSED gold=${c.gold_claims[gi]!.verdict} "${c.gold_claims[gi]!.claim_text}"${error ? ` | error=${error}` : ''}`,
      );
    }
    for (const pi of match.extraPred) {
      failures.push(
        `- **${c.id}** (${c.category}): EXTRA pred=${predClaims[pi]!.verdict} "${predClaims[pi]!.claim_text}"`,
      );
    }

    perCase.push({
      id: c.id,
      category: c.category,
      gold: c.gold_claims,
      pred: predClaims,
      match,
      stats: { ...stats, latencyMs: latency },
      error,
      caseExact,
    });

    if (env.EVAL_DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, env.EVAL_DELAY_MS));
    }
  }

  const metrics = finalizeMetrics(state);
  latencies.sort((a, b) => a - b);

  return {
    config: {
      approach: verifier.name,
      label: label ?? null,
      model: env.LLM_MODEL,
      thinking: env.LLM_THINKING,
      temperature: env.LLM_TEMPERATURE,
      matchThreshold: MATCH_THRESHOLD,
      gitCommit: getGitCommit(),
      caseCount: cases.length,
      dataset: datasetMeta.path,
      datasetSha256: datasetMeta.sha256,
    },
    metrics: {
      ...metrics,
      latencyMs: {
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        mean:
          latencies.length === 0
            ? 0
            : latencies.reduce((a, b) => a + b, 0) / latencies.length,
      },
      tokens: {
        inputTotal: totalInput,
        outputTotal: totalOutput,
        perCaseInput: cases.length ? totalInput / cases.length : 0,
        perCaseOutput: cases.length ? totalOutput / cases.length : 0,
      },
      llmCallsTotal: totalCalls,
      validationRetriesTotal: totalRetries,
      llmCallsPerCase: cases.length ? totalCalls / cases.length : 0,
    },
    failures,
    perCase,
  };
}

type RunReport = Awaited<ReturnType<typeof runOnce>>;

function toMarkdown(
  report: RunReport,
  multi?: {
    repeats: number[];
    macroF1Mean: number;
    macroF1Min: number;
    macroF1Max: number;
    endToEndMean: number;
    endToEndMin: number;
    endToEndMax: number;
  },
): string {
  const m = report.metrics;
  const lines: string[] = [];
  lines.push(`# Eval: ${report.config.approach}`);
  if (report.config.label) lines.push(`Label: ${report.config.label}`);
  lines.push('');
  lines.push('## Config');
  lines.push('```json');
  lines.push(JSON.stringify(report.config, null, 2));
  lines.push('```');
  lines.push('');
  lines.push(
    `Dataset: \`${report.config.dataset}\` (sha256 \`${report.config.datasetSha256}\`)`,
  );
  lines.push('');
  if (multi) {
    lines.push('## Repeat summary');
    lines.push(
      `- runs: ${multi.repeats.length} (macro-F1 per run: ${multi.repeats.map((x) => x.toFixed(3)).join(', ')})`,
    );
    lines.push(
      `- macro-F1 mean / min–max: **${multi.macroF1Mean.toFixed(3)}** / ${multi.macroF1Min.toFixed(3)}–${multi.macroF1Max.toFixed(3)}`,
    );
    lines.push(
      `- end-to-end mean / min–max: ${multi.endToEndMean.toFixed(3)} / ${multi.endToEndMin.toFixed(3)}–${multi.endToEndMax.toFixed(3)}`,
    );
    lines.push('');
    lines.push('## Headline (run 1)');
  } else {
    lines.push('## Headline');
  }
  lines.push(`- macro-F1: **${m.macroF1.toFixed(3)}**`);
  lines.push(`- verdict accuracy (matched): ${m.verdictAccuracy.toFixed(3)}`);
  lines.push(`- end-to-end accuracy: ${m.endToEndAccuracy.toFixed(3)}`);
  lines.push(`- case exact-match: ${(m.caseExactMatchPct * 100).toFixed(1)}%`);
  lines.push(
    `- claim-count exact: ${(m.claimCountExactPct * 100).toFixed(1)}% (mean |Δ|=${m.claimCountAbsDiffMean.toFixed(2)})`,
  );
  lines.push(
    `- citation validity raw: ${m.citationValidityRaw === null ? 'n/a' : m.citationValidityRaw.toFixed(3)}; final: ${m.citationValidityFinal.toFixed(3)}`,
  );
  lines.push(
    `- citation agreement: ${m.citationAgreement === null ? 'n/a' : m.citationAgreement.toFixed(3)}`,
  );
  lines.push(
    `- latency p50/p95: ${m.latencyMs.p50.toFixed(0)} / ${m.latencyMs.p95.toFixed(0)} ms`,
  );
  lines.push(
    `- tokens in/out per case: ${m.tokens.perCaseInput.toFixed(0)} / ${m.tokens.perCaseOutput.toFixed(0)}`,
  );
  lines.push(`- LLM calls per case: ${m.llmCallsPerCase.toFixed(2)}`);
  lines.push('');
  lines.push('## Per-class F1');
  for (const [k, v] of Object.entries(m.perClass)) {
    lines.push(
      `- ${k}: P=${v.precision.toFixed(3)} R=${v.recall.toFixed(3)} F1=${v.f1.toFixed(3)} (support=${v.support})`,
    );
  }
  lines.push('');
  lines.push('## Confusion matrix');
  lines.push(formatConfusionMarkdown(m.confusion.matrix));
  lines.push('');
  lines.push('## Failures');
  if (report.failures.length === 0) lines.push('_none_');
  else lines.push(...report.failures);
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const datasetAbs = resolveDatasetPath(args.dataset);
  const datasetMeta = {
    path: args.dataset.replace(/\\/g, '/'),
    sha256: sha256File(datasetAbs),
  };
  let cases = loadCases(args.dataset);
  if (args.ids?.length) cases = cases.filter((c) => args.ids!.includes(c.id));
  if (args.limit) cases = cases.slice(0, args.limit);

  const verifier = await getVerifier(args.approach);
  const runs: Awaited<ReturnType<typeof runOnce>>[] = [];
  for (let i = 0; i < args.repeat; i++) {
    console.log(
      `Run ${i + 1}/${args.repeat}: ${args.approach} on ${cases.length} cases (${datasetMeta.path})…`,
    );
    runs.push(await runOnce(verifier, cases, args.label, datasetMeta));
  }

  const primary = runs[0]!;
  const outDir = join(ROOT, 'results');
  mkdirSync(outDir, { recursive: true });
  const base = args.outBase ?? `${args.approach}-${stamp()}`;
  const jsonPath = join(outDir, `${base}.json`);
  const mdPath = join(outDir, `${base}.md`);

  const multi =
    args.repeat === 1
      ? undefined
      : {
          repeats: runs.map((r) => r.metrics.macroF1),
          macroF1Mean:
            runs.reduce((a, r) => a + r.metrics.macroF1, 0) / runs.length,
          macroF1Min: Math.min(...runs.map((r) => r.metrics.macroF1)),
          macroF1Max: Math.max(...runs.map((r) => r.metrics.macroF1)),
          endToEndMean:
            runs.reduce((a, r) => a + r.metrics.endToEndAccuracy, 0) /
            runs.length,
          endToEndMin: Math.min(
            ...runs.map((r) => r.metrics.endToEndAccuracy),
          ),
          endToEndMax: Math.max(
            ...runs.map((r) => r.metrics.endToEndAccuracy),
          ),
        };

  const payload =
    args.repeat === 1
      ? primary
      : {
          ...primary,
          ...multi,
          /** Full per-run payloads for bootstrap / byGroup (do not re-call LLM). */
          runDetails: runs.map((r) => ({
            metrics: r.metrics,
            failures: r.failures,
            perCase: r.perCase,
          })),
        };

  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  writeFileSync(mdPath, toMarkdown(primary, multi), 'utf8');
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  if (multi) {
    console.log(
      `macro-F1 mean=${multi.macroF1Mean.toFixed(3)} (min=${multi.macroF1Min.toFixed(3)} max=${multi.macroF1Max.toFixed(3)})`,
    );
  } else {
    console.log(`macro-F1=${primary.metrics.macroF1.toFixed(3)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Per-group descriptive stats over eval result JSON(s).
 * Usage:
 *   pnpm tsx eval/byGroup.ts --groups eval/cases_test_grouped.jsonl \
 *     --runs results/4-prompt2.json results/4-prompt3.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadRuns, type EvalResultFile, type RunSlice } from './bootstrap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function resolvePath(p: string): string {
  return isAbsolute(p) ? p : join(ROOT, p);
}

function parseArgs(argv: string[]) {
  const out: { groups?: string; runs: string[]; out?: string } = { runs: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--groups') out.groups = argv[++i]!;
    else if (a === '--runs') {
      while (i + 1 < argv.length && !argv[i + 1]!.startsWith('--')) {
        out.runs.push(argv[++i]!);
      }
    } else if (a === '--out') out.out = argv[++i]!;
  }
  if (!out.groups || out.runs.length === 0) {
    throw new Error(
      'Usage: --groups <jsonl> --runs <result.json> [...] [--out path.md]',
    );
  }
  return out as { groups: string; runs: string[]; out?: string };
}

export function loadGroupMap(groupsPath: string): Map<string, string> {
  const abs = resolvePath(groupsPath);
  const map = new Map<string, string>();
  for (const line of readFileSync(abs, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const row = JSON.parse(t) as { id: string; group: string };
    map.set(row.id, row.group);
  }
  return map;
}

export interface GroupStats {
  group: string;
  goldTotal: number;
  correct: number;
  missed: number;
  extra: number;
  verdictWrong: number;
  caseExact: number;
  caseTotal: number;
  failedCaseIds: string[];
}

export function statsForGroup(
  run: RunSlice,
  group: string,
  idToGroup: Map<string, string>,
): GroupStats {
  const rows = run.perCase.filter((c) => idToGroup.get(c.id) === group);
  let goldTotal = 0;
  let correct = 0;
  let missed = 0;
  let extra = 0;
  let verdictWrong = 0;
  let caseExact = 0;
  const failedCaseIds: string[] = [];

  for (const row of rows) {
    goldTotal += row.gold.length;
    missed += row.match.missedGold.length;
    extra += row.match.extraPred.length;
    for (const m of row.match.matches) {
      if (m.goldVerdict === m.predVerdict) correct += 1;
      else verdictWrong += 1;
    }
    if (row.caseExact) caseExact += 1;
    else failedCaseIds.push(row.id);
  }

  return {
    group,
    goldTotal,
    correct,
    missed,
    extra,
    verdictWrong,
    caseExact,
    caseTotal: rows.length,
    failedCaseIds,
  };
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

function fmtMeanRange(xs: number[], digits = 3): string {
  if (xs.length === 0) return 'n/a';
  if (xs.length === 1) return xs[0]!.toFixed(digits);
  const mn = Math.min(...xs);
  const mx = Math.max(...xs);
  return `${mean(xs).toFixed(digits)} (${mn.toFixed(digits)}–${mx.toFixed(digits)})`;
}

function approachLabel(path: string, file: EvalResultFile): string {
  const base = path.replace(/\\/g, '/').split('/').pop()!.replace(/\.json$/, '');
  const cfg = (file as { config?: { label?: string | null; approach?: string } })
    .config;
  if (cfg?.label) return String(cfg.label);
  if (cfg?.approach) return cfg.approach;
  return base;
}

function summarizeApproach(
  label: string,
  runs: RunSlice[],
  idToGroup: Map<string, string>,
  groups: string[],
): string[] {
  const lines: string[] = [];
  lines.push(`### ${label} (${runs.length} run${runs.length === 1 ? '' : 's'})`);
  lines.push('');
  lines.push(
    '| Group | correct/gold | missed | extra | verdict wrong | case exact | failed case ids |',
  );
  lines.push('| --- | --- | ---: | ---: | ---: | --- | --- |');

  for (const g of groups) {
    const perRun = runs.map((r) => statsForGroup(r, g, idToGroup));
    const correctGold = perRun.map(
      (s) => `${s.correct}/${s.goldTotal}`,
    );
    // show mean of ratios + case exact mean
    const ratios = perRun.map((s) =>
      s.goldTotal === 0 ? 0 : s.correct / s.goldTotal,
    );
    const missed = perRun.map((s) => s.missed);
    const extra = perRun.map((s) => s.extra);
    const wrong = perRun.map((s) => s.verdictWrong);
    const exact = perRun.map((s) =>
      s.caseTotal === 0 ? 0 : s.caseExact / s.caseTotal,
    );
    const failedUnion = [
      ...new Set(perRun.flatMap((s) => s.failedCaseIds)),
    ].sort();
    const caseN = perRun[0]?.caseTotal ?? 0;
    const goldN = perRun[0]?.goldTotal ?? 0;
    lines.push(
      `| ${g} (n=${caseN}, gold=${goldN}) | ${fmtMeanRange(ratios)} [${correctGold.join('; ')}] | ${fmtMeanRange(missed, 1)} | ${fmtMeanRange(extra, 1)} | ${fmtMeanRange(wrong, 1)} | ${fmtMeanRange(exact)} | ${failedUnion.length ? failedUnion.join(', ') : '_none_'} |`,
    );
  }
  lines.push('');
  return lines;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const idToGroup = loadGroupMap(args.groups);
  const groups = [...new Set(idToGroup.values())].sort((a, b) => {
    const order = ['T1', 'T2', 'T3', 'general'];
    return (order.indexOf(a) + 100) - (order.indexOf(b) + 100) || a.localeCompare(b);
  });

  const lines: string[] = [];
  lines.push('# Per-group breakdown');
  lines.push('');
  lines.push(
    `Groups from \`${args.groups.replace(/\\/g, '/')}\`. Descriptive only; n per group too small for significance.`,
  );
  lines.push('');

  for (const runPath of args.runs) {
    const file = JSON.parse(
      readFileSync(resolvePath(runPath), 'utf8'),
    ) as EvalResultFile;
    const label = approachLabel(runPath, file);
    const runs = loadRuns(file);
    lines.push(...summarizeApproach(label, runs, idToGroup, groups));
  }

  const md = lines.join('\n');
  console.log(md);
  if (args.out) {
    const outAbs = resolvePath(args.out);
    mkdirSync(dirname(outAbs), { recursive: true });
    writeFileSync(outAbs, md, 'utf8');
    console.log(`Wrote ${outAbs}`);
  }
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

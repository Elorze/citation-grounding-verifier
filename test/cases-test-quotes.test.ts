import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EvalCase } from '../src/schema.js';

function loadRawLines(rel: string): string[] {
  return readFileSync(join(process.cwd(), rel), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function checkDataset(rel: string): void {
  const lines = loadRawLines(rel);
  const ids = new Set<string>();

  for (const line of lines) {
    const raw = JSON.parse(line) as unknown;
    const parsed = EvalCase.safeParse(raw);
    expect(parsed.success, `schema fail in ${rel}`).toBe(true);
    if (!parsed.success) continue;
    const c = parsed.data;

    expect(ids.has(c.id), `duplicate id ${c.id}`).toBe(false);
    ids.add(c.id);

    for (const g of c.gold_claims) {
      if (g.verdict === 'UNSUPPORTED') {
        expect(g.citations).toEqual([]);
      } else {
        expect(g.citations.length).toBeGreaterThanOrEqual(1);
      }
      for (const cit of g.citations) {
        expect(cit.index).toBeGreaterThanOrEqual(0);
        expect(cit.index).toBeLessThan(c.context_passages.length);
        const passage = c.context_passages[cit.index]!;
        expect(
          passage.includes(cit.quote),
          `${c.id}: quote not verbatim in passage ${cit.index}`,
        ).toBe(true);
      }
    }
  }
}

describe('eval case gold quotes (verbatim)', () => {
  it('validates eval/1-1.jsonl (dev set)', () => {
    checkDataset('eval/1-1.jsonl');
  });

  it('validates eval/cases_test.jsonl', () => {
    checkDataset('eval/cases_test.jsonl');
  });
});

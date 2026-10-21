import type { Claim, Verdict } from './schema.js';

export interface CheckResult {
  errors: string[];
  claims: Claim[];
}

/**
 * Deterministic checks: index bounds, verbatim quotes, verdict↔citation rules.
 * Fills start_char / end_char when a quote is found.
 */
export function checkClaims(
  claims: Claim[],
  passages: string[],
): CheckResult {
  const errors: string[] = [];
  const seen = new Set<string>();
  const out: Claim[] = [];

  for (let i = 0; i < claims.length; i++) {
    const c = claims[i]!;
    const claimLabel = `claim ${i}`;

    if (!c.claim_text?.trim()) {
      errors.push(`${claimLabel}: claim_text is empty`);
      continue;
    }

    const dedupeKey = c.claim_text.trim();
    if (seen.has(dedupeKey)) {
      // Drop exact-duplicate claims silently (not an LLM feedback error).
      continue;
    }
    seen.add(dedupeKey);

    const citations = c.citations.map((cit) => ({ ...cit }));

    for (let j = 0; j < citations.length; j++) {
      const cit = citations[j]!;
      if (cit.index < 0 || cit.index >= passages.length) {
        errors.push(
          `${claimLabel}: citation index ${cit.index} out of range (0..${Math.max(0, passages.length - 1)})`,
        );
        continue;
      }
      const passage = passages[cit.index]!;
      const pos = passage.indexOf(cit.quote);
      if (pos < 0) {
        const preview =
          cit.quote.length > 80 ? `${cit.quote.slice(0, 80)}…` : cit.quote;
        errors.push(
          `${claimLabel}: quote not found verbatim in passage ${cit.index}: "${preview}"`,
        );
      } else {
        cit.start_char = pos;
        cit.end_char = pos + cit.quote.length;
      }
    }

    if (c.verdict === 'UNSUPPORTED') {
      if (citations.length > 0) {
        errors.push(
          `${claimLabel}: UNSUPPORTED must have empty citations, got ${citations.length}`,
        );
      }
    } else if (citations.length === 0) {
      errors.push(
        `${claimLabel}: ${c.verdict} requires at least one citation`,
      );
    }

    out.push({
      claim_text: c.claim_text,
      verdict: c.verdict,
      reasoning: c.reasoning ?? '',
      citations,
    });
  }

  return { errors, claims: out };
}

/**
 * After retries are exhausted: drop bad citations, downgrade S/C with none left,
 * clear citations on UNSUPPORTED.
 */
export function repair(
  claims: Claim[],
  passages: string[],
): { claims: Claim[]; repairedClaims: number } {
  let repairedClaims = 0;
  const result: Claim[] = [];

  for (const c of claims) {
    const validCitations = c.citations.filter((cit) => {
      if (cit.index < 0 || cit.index >= passages.length) return false;
      const passage = passages[cit.index]!;
      const pos = passage.indexOf(cit.quote);
      if (pos < 0) return false;
      cit.start_char = pos;
      cit.end_char = pos + cit.quote.length;
      return true;
    });

    let verdict: Verdict = c.verdict;
    let reasoning = c.reasoning ?? '';
    let citations = validCitations;
    let changed = validCitations.length !== c.citations.length;

    if (verdict === 'UNSUPPORTED') {
      if (citations.length > 0) {
        citations = [];
        changed = true;
      }
    } else if (citations.length === 0) {
      verdict = 'UNSUPPORTED';
      reasoning = `${reasoning} [auto: citation could not be verified]`.trim();
      changed = true;
    }

    if (changed) repairedClaims += 1;

    result.push({
      claim_text: c.claim_text,
      verdict,
      reasoning,
      citations,
    });
  }

  return { claims: result, repairedClaims };
}

/** Final guard: response must always satisfy invariants. */
export function assertInvariants(claims: Claim[], passages: string[]): void {
  const { errors } = checkClaims(claims, passages);
  if (errors.length > 0) {
    throw new Error(
      `Invariant violation after repair: ${errors.join('; ')}`,
    );
  }
}

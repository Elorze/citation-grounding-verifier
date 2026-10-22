/**
 * Ablation: minimal verdict instructions + claim wording / coref rule only
 * (no atomic-split rules from M6a).
 */
import { callWithValidation } from '../llm.js';
import type { VerifyRequest } from '../schema.js';
import { emptyStats, type Verifier } from './types.js';

const SYSTEM = `You are a fact-checking assistant. Split the answer into atomic factual claims. For each claim, decide whether the context passages SUPPORT it, CONTRADICT it, or whether it is UNSUPPORTED (not stated in the passages). For SUPPORTED or CONTRADICTED claims, give the passage index and copy an exact quote from that passage. For UNSUPPORTED claims, citations must be an empty list. If the answer contains no factual claims, return an empty claims list.

Claim wording rule:
- Prefer the answer's original wording when writing each claim. Resolve pronouns to full names so each claim is self-contained.

Return only JSON in this format:
{"claims":[{"claim_text":"...","verdict":"SUPPORTED|CONTRADICTED|UNSUPPORTED","reasoning":"...","citations":[{"index":0,"quote":"..."}]}]}`;

function buildUser(req: VerifyRequest): string {
  const lines = req.context_passages.map((p, i) => `[${i}] ${p}`);
  return `Context passages:\n${lines.join('\n')}\n\nAnswer:\n${req.generated_answer}`;
}

export const llmWordingVerifier: Verifier = {
  name: 'wording',
  async verify(req) {
    const started = Date.now();
    if (!req.generated_answer.trim()) {
      return {
        response: { claims: [] },
        stats: emptyStats({ latencyMs: Date.now() - started }),
      };
    }

    if (req.context_passages.length === 0) {
      const { claims, stats } = await callWithValidation({
        system: SYSTEM,
        user: buildUser(req),
        passages: req.context_passages,
        withValidation: true,
      });
      const forced = claims.map((c) => ({
        ...c,
        verdict: 'UNSUPPORTED' as const,
        citations: [],
        reasoning: `${c.reasoning} [forced: empty context]`.trim(),
      }));
      return {
        response: { claims: forced },
        stats: { ...stats, latencyMs: Date.now() - started },
      };
    }

    const { claims, stats } = await callWithValidation({
      system: SYSTEM,
      user: buildUser(req),
      passages: req.context_passages,
      withValidation: true,
    });
    return {
      response: { claims },
      stats: { ...stats, latencyMs: Date.now() - started },
    };
  },
};

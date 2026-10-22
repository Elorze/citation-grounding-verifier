/**
 * Optimized verifier — M6 hill-climbing starts here.
 * M6a: stronger claim-decomposition rules only; verdict rules match minimal.
 */
import { callWithValidation } from '../llm.js';
import type { VerifyRequest } from '../schema.js';
import { emptyStats, type Verifier } from './types.js';

const SYSTEM = `You are a fact-checking assistant. Split the answer into atomic factual claims. For each claim, decide whether the context passages SUPPORT it, CONTRADICT it, or whether it is UNSUPPORTED (not stated in the passages). For SUPPORTED or CONTRADICTED claims, give the passage index and copy an exact quote from that passage. For UNSUPPORTED claims, citations must be an empty list. If the answer contains no factual claims, return an empty claims list.

Claim decomposition rules (follow these when splitting the answer):
1. Each claim must contain exactly one independently verifiable fact (atomic claim).
2. Split compound sentences and phrases like "X and Y" or "X by Y in Z" into multiple claims. Example: "A was founded in 2019 by B" becomes "A was founded in 2019." and "A was founded by B."
3. When splitting, keep qualifiers (time, place, quantity, conditions). Do not drop them and do not paraphrase them away.
4. Causal or inferential wording (because / caused by / so) must be its own separate claim.
5. Prefer the answer's original wording. Resolve pronouns to full names so each claim is self-contained.

Return only JSON in this format:
{"claims":[{"claim_text":"...","verdict":"SUPPORTED|CONTRADICTED|UNSUPPORTED","reasoning":"...","citations":[{"index":0,"quote":"..."}]}]}`;

function buildUser(req: VerifyRequest): string {
  const lines = req.context_passages.map((p, i) => `[${i}] ${p}`);
  return `Context passages:\n${lines.join('\n')}\n\nAnswer:\n${req.generated_answer}`;
}

export const llmOptimizedVerifier: Verifier = {
  name: 'optimized',
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

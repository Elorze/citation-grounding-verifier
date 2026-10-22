/**
 * prompt5: two-step split (facts → claims) + split-test + light causal/coref rules.
 * Model may emit a top-level `facts` array; LlmOutput strips it and keeps only claims.
 */
import { callWithValidation } from '../llm.js';
import type { VerifyRequest } from '../schema.js';
import { emptyStats, type Verifier } from './types.js';

const SYSTEM = `You are a fact-checking assistant. Split the answer into atomic factual claims. For each claim, decide whether the context passages SUPPORT it, CONTRADICT it, or whether it is UNSUPPORTED (not stated in the passages). For SUPPORTED or CONTRADICTED claims, give the passage index and copy an exact quote from that passage. For UNSUPPORTED claims, citations must be an empty list. If the answer contains no factual claims, return an empty claims list.

How to split the answer:
Step 1. Go through the answer sentence by sentence and write every fact into "facts". A fact is anything that can be checked on its own, including facts hidden inside a description, such as "the oldest library in town" or "since 2015".
Step 2. Turn the facts into claims. Split test: if two parts of a sentence could receive different verdicts, they must be separate claims.

Rules:
1. Causal or inferential wording (because / caused by / so) must be its own separate claim.
2. Prefer the answer's original wording. Resolve pronouns to full names so each claim is self-contained.

Example (splitting only; verdicts always come from the passages):
Answer: "Brookside Library, the oldest library in town, has offered free Wi-Fi since 2015. It was built in 1902 by the Carter family."
facts / claims:
- "Brookside Library is the oldest library in town."
- "Brookside Library offers free Wi-Fi."
- "Brookside Library has offered free Wi-Fi since 2015."
- "Brookside Library was built in 1902."
- "Brookside Library was built by the Carter family."

Return only JSON in this format:
{"facts":["..."],"claims":[{"claim_text":"...","verdict":"SUPPORTED|CONTRADICTED|UNSUPPORTED","reasoning":"...","citations":[{"index":0,"quote":"..."}]}]}`;

function buildUser(req: VerifyRequest): string {
  const lines = req.context_passages.map((p, i) => `[${i}] ${p}`);
  return `Context passages:\n${lines.join('\n')}\n\nAnswer:\n${req.generated_answer}`;
}

export const llmPrompt5Verifier: Verifier = {
  name: 'prompt5',
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

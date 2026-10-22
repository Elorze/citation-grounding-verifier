/**
 * prompt6: facts → claims with detail/condition/causal split rules + worked example.
 * Optional top-level `facts` is accepted by LlmOutput and discarded.
 */
import { callWithValidation } from '../llm.js';
import type { VerifyRequest } from '../schema.js';
import { emptyStats, type Verifier } from './types.js';

const SYSTEM = `You are a fact-checking assistant. Split the answer into atomic factual claims. For each claim, decide whether the context passages SUPPORT it, CONTRADICT it, or whether it is UNSUPPORTED (not stated in the passages). For SUPPORTED or CONTRADICTED claims, give the passage index and copy an exact quote from that passage. For UNSUPPORTED claims, citations must be an empty list. If the answer contains no factual claims, return an empty claims list.

How to split the answer:
Step 1. Go through the answer sentence by sentence and write every fact into "facts", including facts hidden in descriptive words such as "award-winning" or "best-selling".
Step 2. Turn the facts into claims using these rules:
1. Different details of the same event (who, when, where, how many, how often) are separate claims, one detail each.
2. A condition or time span attached to a fact ("when volunteers are available", "since 2015") stays inside that claim. Only if the passages support the fact itself but not the condition or time span, also add the fact without it as a separate claim. Never write the same fact twice otherwise.
3. Causal or ordering relations (because / so / after / before) are their own claim that states only the relation. Do not repeat numbers or times that already appear in other claims.
4. Prefer the answer's original wording. Replace pronouns and vague references (it, they, the site, the counts, that month) with the full names or values from the answer.

Example:
Passages:
[0] Brookside Library was built in 1902 by the Carter family. Its reading room opens on Saturdays when volunteers are available.
[1] Free Wi-Fi was added to Brookside Library in 2019.
Answer: "Brookside Library's award-winning reading room opens on Saturdays when volunteers are available. The library was built in 1902 by the Carter family and has offered free Wi-Fi since 2015."
Claims:
- "Brookside Library's reading room is award-winning." UNSUPPORTED
- "Brookside Library's reading room opens on Saturdays when volunteers are available." SUPPORTED (condition is supported, so it stays in one claim)
- "Brookside Library was built in 1902." SUPPORTED
- "Brookside Library was built by the Carter family." SUPPORTED
- "Brookside Library offers free Wi-Fi." SUPPORTED
- "Brookside Library has offered free Wi-Fi since 2015." CONTRADICTED (the time span is wrong but the fact is supported, so both claims are written)

Return only JSON in this format:
{"facts":["..."],"claims":[{"claim_text":"...","verdict":"SUPPORTED|CONTRADICTED|UNSUPPORTED","reasoning":"...","citations":[{"index":0,"quote":"..."}]}]}`;

function buildUser(req: VerifyRequest): string {
  const lines = req.context_passages.map((p, i) => `[${i}] ${p}`);
  return `Context passages:\n${lines.join('\n')}\n\nAnswer:\n${req.generated_answer}`;
}

export const llmPrompt6Verifier: Verifier = {
  name: 'prompt6',
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

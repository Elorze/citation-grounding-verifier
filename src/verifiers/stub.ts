import type { VerifyRequest } from '../schema.js';
import { assertInvariants } from '../validate.js';
import { emptyStats, type Verifier } from './types.js';

/** M1 only: always returns one fixed SUPPORTED claim (for wiring checks). */
export const stubVerifier: Verifier = {
  name: 'stub',
  async verify(req: VerifyRequest) {
    const started = Date.now();
    const passages = req.context_passages;

    if (!req.generated_answer.trim()) {
      return {
        response: { claims: [] },
        stats: emptyStats({ latencyMs: Date.now() - started }),
      };
    }

    const quote =
      passages[0] && passages[0].length > 0
        ? passages[0].slice(0, Math.min(80, passages[0].length))
        : 'N/A';

    const claims =
      passages.length === 0
        ? [
            {
              claim_text: req.generated_answer.trim().slice(0, 200) || 'stub claim',
              verdict: 'UNSUPPORTED' as const,
              reasoning: 'Stub: empty context forces UNSUPPORTED.',
              citations: [],
            },
          ]
        : [
            {
              claim_text:
                'Stub claim: this is a fixed response for milestone M1 wiring.',
              verdict: 'SUPPORTED' as const,
              reasoning: 'Stub verifier always returns one fixed SUPPORTED claim.',
              citations: [
                {
                  index: 0,
                  quote,
                  start_char: 0,
                  end_char: quote.length,
                },
              ],
            },
          ];

    assertInvariants(claims, passages);

    return {
      response: { claims },
      stats: emptyStats({ latencyMs: Date.now() - started }),
    };
  },
};

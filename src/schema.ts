import { z } from 'zod';

export const Verdict = z.enum(['SUPPORTED', 'CONTRADICTED', 'UNSUPPORTED']);
export type Verdict = z.infer<typeof Verdict>;

export const Citation = z.object({
  index: z.number().int().nonnegative(),
  quote: z.string().min(1),
  start_char: z.number().int().nonnegative().optional(),
  end_char: z.number().int().nonnegative().optional(),
});
export type Citation = z.infer<typeof Citation>;

export const Claim = z.object({
  claim_text: z.string().min(1),
  verdict: Verdict,
  reasoning: z.string(),
  citations: z.array(Citation),
});
export type Claim = z.infer<typeof Claim>;

/** Align with 1 MB HTTP body: cap passage count and per-passage size. Empty array still allowed (forces UNSUPPORTED). */
export const MAX_CONTEXT_PASSAGES = 64;
export const MAX_PASSAGE_CHARS = 100_000;
export const MAX_ANSWER_CHARS = 100_000;

export const VerifyRequest = z.object({
  context_passages: z
    .array(z.string().max(MAX_PASSAGE_CHARS))
    .max(MAX_CONTEXT_PASSAGES),
  generated_answer: z.string().max(MAX_ANSWER_CHARS),
});
export type VerifyRequest = z.infer<typeof VerifyRequest>;

export const VerifyResponse = z.object({
  claims: z.array(Claim),
});
export type VerifyResponse = z.infer<typeof VerifyResponse>;

/** Lenient LLM output; validate.ts enforces real invariants. */
export const LlmOutput = z.object({
  /** Optional scratchpad from prompt5+; parsed then discarded (not part of Claim). */
  facts: z.array(z.string()).optional(),
  claims: z.array(
    z.object({
      claim_text: z.string(),
      verdict: Verdict,
      reasoning: z.string().default(''),
      citations: z
        .array(z.object({ index: z.number().int(), quote: z.string() }))
        .default([]),
    }),
  ),
});
export type LlmOutput = z.infer<typeof LlmOutput>;

export const Category = z.enum([
  'supported',
  'subtle_distortion',
  'extrinsic_hallucination',
  'multi_passage',
  'edge_case',
  'mixed',
]);
export type Category = z.infer<typeof Category>;

export const EvalCase = z.object({
  id: z.string(),
  category: Category,
  context_passages: z.array(z.string()),
  generated_answer: z.string(),
  gold_claims: z.array(
    z.object({
      claim_text: z.string(),
      verdict: Verdict,
      citations: z.array(
        z.object({ index: z.number().int(), quote: z.string() }),
      ),
    }),
  ),
});
export type EvalCase = z.infer<typeof EvalCase>;

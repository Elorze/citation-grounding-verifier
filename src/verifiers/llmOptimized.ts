/**
 * Optimized verifier = best hill-climbed prompt (prompt8).
 * Assignment approaches are baseline / minimal / optimized; ablation aliases
 * (wording, prompt5–8) remain available for reproduction.
 */
import type { VerifyRequest } from '../schema.js';
import { llmPrompt8Verifier } from './llmPrompt8.js';
import type { Verifier } from './types.js';

export const llmOptimizedVerifier: Verifier = {
  name: 'optimized',
  verify(req: VerifyRequest) {
    return llmPrompt8Verifier.verify(req);
  },
};

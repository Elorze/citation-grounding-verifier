/**
 * Starts as a copy of minimal (M4 state). M6 optimizations are applied later,
 * one change at a time — do not add them here yet.
 */
import { llmMinimalVerifier } from './llmMinimal.js';
import type { Verifier } from './types.js';

export const llmOptimizedVerifier: Verifier = {
  name: 'optimized',
  async verify(req) {
    const result = await llmMinimalVerifier.verify(req);
    return result;
  },
};

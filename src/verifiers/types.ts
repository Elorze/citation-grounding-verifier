import type { VerifyRequest, VerifyResponse } from '../schema.js';

export interface VerifyStats {
  llmCalls: number;
  validationRetries: number;
  inputTokens: number;
  outputTokens: number;
  rawInvalidCitations: number;
  repairedClaims: number;
  latencyMs: number;
}

export interface Verifier {
  name:
    | 'stub'
    | 'baseline'
    | 'minimal'
    | 'optimized'
    | 'wording'
    | 'prompt5';
  verify(
    req: VerifyRequest,
  ): Promise<{ response: VerifyResponse; stats: VerifyStats }>;
}

export function emptyStats(partial?: Partial<VerifyStats>): VerifyStats {
  return {
    llmCalls: 0,
    validationRetries: 0,
    inputTokens: 0,
    outputTokens: 0,
    rawInvalidCitations: 0,
    repairedClaims: 0,
    latencyMs: 0,
    ...partial,
  };
}

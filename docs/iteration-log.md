# Iteration log

## M1 stub wiring

Hypothesis: empty HTTP shell + schema is enough to prove request/response path.
Change: Hono `POST /verify`, Zod schemas, stub verifier, validate unit tests.
Result: health/verify/400 bad-JSON OK on port 3100; unit tests green.
Decision: keep.

## M2 eval harness

Hypothesis: Jaccard matching + confusion metrics give a stable scorer for all approaches.
Change: `eval/match.ts`, `eval/metrics.ts`, `eval/run.ts`, 24-case JSONL.
Result: `pnpm eval --approach stub` writes json/md; macro-F1 ≈ 0 (expected).
Decision: keep.

## M5 baseline (non-LLM)

Hypothesis: BM25 + coverage heuristics give a weak but deterministic floor.
Change: `verifiers/baseline.ts` with hand-picked thresholds (not tuned on test set). Later: protect `a.m.`-style abbreviations in sentence split.
Result: macro-F1 **0.217** on 24 cases (`results/baseline-20261021-180348.md`). CONTRADICTED F1 = 0.
Decision: keep as approach 1.

## M3/M4 minimal LLM + validate/retry

Hypothesis: plain text JSON + Zod + citation repair beats trusting provider JSON mode.
Change: Zhipu via `@ai-sdk/openai-compatible`; **no** `Output.object` (unsupported); `instructions` for system prompt (AI SDK v7); validate/retry/repair + 429 cooldown in `llm.ts`.
Result: 3-case subset macro-F1 **0.556** (`results/minimal-20261021-180653.md`). Full 24 blocked by sustained 429 on free tier.
Decision: keep. M3-without-validation skipped as separate artifact — shipped M4-state minimal once the provider path worked.

## Dataset fix (v1 → v1.1): case_021 ambiguous label

**Why (annotation quality, not score chasing):** case_021 is an `edge_case` meant to stress **long-answer claim decomposition**. The original first claim treated “green space” as UNSUPPORTED while the answer mixed it with a clearly supported “120 hectares” clause. Whether “park” entails “green space” is contested and unrelated to the long-split goal, so it added label noise.

| | Before (v1) | After (v1.1) |
| --- | --- | --- |
| Answer first sentence | `Lakeview Park is a large green space covering 120 hectares.` | `Lakeview Park is the largest park in the city and covers 120 hectares.` |
| Gold claim | `Lakeview Park is a green space.` → UNSUPPORTED | `Lakeview Park is the largest park in the city.` → UNSUPPORTED |
| Kept | `Lakeview Park covers 120 hectares.` → SUPPORTED (quote unchanged) | same |

**Note:** Older `results/` snapshots on dataset v1 were removed. Current `results/` keeps only the v1.1 full-run pair below.

## Small fix: claim matcher (CJK / mixed-script)

Eval harness bug: shorter Chinese claims failed to align with longer gold (false missed+extra). Hybrid tokenize + containment; not part of the hill-climbing story.

## Fresh full evals on dataset v1.1 (DeepSeek)

| Approach | Label | macro-F1 | File |
| --- | --- | ---: | --- |
| baseline | M5 baseline v1.1 | 0.192 | `results/baseline-20261021-224717.*` |
| minimal | M4 minimal deepseek v1.1 | 0.922 | `results/minimal-20261021-224802.*` |

## M6 (not run yet)

See `docs/status-and-next-steps.md`. One change per step; re-eval after each.

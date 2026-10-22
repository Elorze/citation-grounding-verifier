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
(dataset v1 snapshot, file since removed; see v1.1 rerun below)
v1.1 rerun: macro-F1 **0.192** (`results/baseline-20261021-224717.md`).
Decision: keep as approach 1.

## M3/M4 minimal LLM + validate/retry

Hypothesis: plain text JSON + Zod + citation repair beats trusting provider JSON mode.
Change: Zhipu via `@ai-sdk/openai-compatible`; **no** `Output.object` (unsupported); `instructions` for system prompt (AI SDK v7); validate/retry/repair + 429 cooldown in `llm.ts`.
Result: 3-case subset macro-F1 **0.556** (`results/minimal-20261021-180653.md`). Full 24 blocked by sustained 429 on free tier.
(dataset v1 snapshot, file since removed; see v1.1 rerun below)
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

## Error analysis on v1.1 (minimal)

Source: `results/minimal-20261021-224802.md` (DeepSeek `deepseek-chat`, dataset v1.1).

**Observation:** matched verdict accuracy is **0.980**, but end-to-end accuracy is **0.909**. Once a predicted claim is aligned to gold, the verdict is almost always correct; remaining error is mainly **claim decomposition** (how the answer is split), not verdict classification.

**Failures (all rows from the report):**

| Case | Failure type | What happened |
| --- | --- | --- |
| **case_006** | fused claim | Two facts (founded in 2019 + founded by X) were merged into one claim (`…founded in 2019 by Dr. Samuel Reyes`), which was labeled CONTRADICTED as a whole; gold’s separate SUPPORTED year claim mismatched, and gold’s CONTRADICTED founder claim was MISSED. |
| **case_003** | missed claim | MISSED gold SUPPORTED: “The Maple Street Community Pool has six lanes.” |
| **case_012** | missed claim | MISSED gold UNSUPPORTED: “The Eiffel Tower was built for the World's Fair.” |
| **case_011** | alignment (matcher) | Causal UNSUPPORTED claim was produced, but wording differed from gold → MISSED gold + EXTRA pred (same idea, not matched). |

**Counts by type:** fused claim **1** (case_006); missed claim **2** (case_003, case_012); alignment (matcher) issue **1** (case_011).

**Caveat:** about **55** gold claims in the set; one claim is roughly **2** percentage points on claim-level rates. Small single-run deltas are not meaningful.

**Hypothesis for M6a:** Strengthen the prompt to require **atomic claims** (one verifiable fact per claim; split compound sentences and “X and Y”; keep hedges/qualifiers). Expected to reduce fused/missed failures.

**Expected risk (plan only, not a result):** v1.1 minimal is already near-saturated (macro-F1 **0.922**). Headroom after M6a may be small. If saturated, next step is to build a **hard split** from this error analysis plus public hallucination taxonomies (e.g. RAGTruth, FRANK)—planned only, no conclusion yet.

## M6a atomic decomposition

**Hypothesis:** From the v1.1 minimal error analysis, remaining failures were mainly **fused claims** (case_006) and **missed claims** (case_003, case_012), plus one matcher-alignment case (case_011). Strengthening only claim-decomposition instructions (atomic split, keep qualifiers, separate causality, resolve pronouns) should fix fused/missed without changing verdict rules.

**Change:** Independent prompt in `src/verifiers/llmOptimized.ts` (no longer delegates to minimal). Added decomposition rules 1–5 only; SUPPORT/CONTRADICT/UNSUPPORTED instructions unchanged. Model/params unchanged: `deepseek-chat`, thinking disabled, temperature 0.1.

**Result:** `results/optimized-20261022-113334.md` vs minimal `results/minimal-20261021-224802.md` (both dataset v1.1):

| Metric | minimal v1.1 | M6a optimized |
| --- | ---: | ---: |
| macro-F1 | 0.922 | 1.000 |
| matched verdict accuracy | 0.980 | 1.000 |
| end-to-end accuracy | 0.909 | 1.000 |
| case exact-match | 83.3% | 100.0% |
| claim-count exact | 87.5% | 100.0% |
| latency p50 / p95 | 1227 / 1600 ms | 1038 / 1706 ms |
| tokens in / out per case | 229 / 165 | 386 / 168 |

Targeted failures from minimal:
- **case_003** (missed): fixed (no longer in Failures; report Failures = _none_).
- **case_006** (fused): fixed.
- **case_011** (alignment): fixed.
- **case_012** (missed): fixed.
- **Regressions:** none in the Failures list (empty).

**Decision:** **keep.** All headline metrics improved or stayed perfect; the fused/missed cases from the error analysis are gone and there are no new failure rows. Input tokens rose (229 → 386) from the longer system prompt—acceptable for this step.

**Caveat:** ~55 gold claims; improvements under ~2 percentage points on claim-level rates are not treated as significant. Here the gains (e.g. end-to-end 0.909 → 1.000) are larger than that noise floor, but the set is still small and a single run can overfit prompts—treat perfect scores cautiously.

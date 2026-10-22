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

## Hard test split v1 (frozen)

Purpose: held-out test split to check whether the M6a prompt rules (atomic definition; split compound incl. by/in/for/with; keep qualifiers; causal as separate claim; full subject, no pronouns) generalize beyond the 24 dev cases they were tuned on.

- File: `eval/cases_test.jsonl` — 20 cases (hard_001..hard_020), 78 gold claims: SUPPORTED 36 / CONTRADICTED 25 / UNSUPPORTED 17.
- sha256: `c83ab8c18eb70e1b8943ef8430294078ffe614d5543b7d32673cb66631463a58`
- Frozen at commit: `576ece8` (the commit that added the file).
- Taxonomy: each case carries `taxonomy` labels from RAGTruth (Niu et al., 2024) and FRANK (Pagnoni et al., 2021), plus `targets_rule` (which M6a rule it stresses) and `intent`.
- Annotation rules: same as dev (no world knowledge; CONTRADICTED only if passages state something incompatible; atomic claims with full subject and qualifiers; causal/temporal relations as their own claim).
- Provenance: cases were drafted with AI assistance and reviewed/edited by the author (single annotator). All entities are fictional and do not overlap with the dev set.
- Rules: no prompt/verifier/scoring change is evaluated on this file; the file is not edited after this commit; each approach is run once.

## Test results on hard split v1

One run each (`--repeat 1`), DeepSeek `deepseek-chat`, thinking disabled, temperature 0.1. Numbers copied from the result files below (not hand-edited).

| Metric | baseline | minimal | optimized (M6a) |
| --- | ---: | ---: | ---: |
| macro-F1 | 0.253 | 0.913 | 0.942 |
| matched verdict acc | 0.500 | 1.000 | 0.986 |
| e2e acc | 0.192 | 0.872 | 0.897 |
| case exact | 0.0% | 65.0% | 60.0% |
| claim-count exact | 5.0% | 70.0% | 65.0% |
| SUPPORTED F1 | 0.311 | 0.879 | 0.866 |
| CONTRADICTED F1 | 0.176 | 0.920 | 0.960 |
| UNSUPPORTED F1 | 0.270 | 0.941 | 1.000 |
| latency p50 / p95 (ms) | 1 / 28 | 1459 / 3120 | 1859 / 3239 |
| tokens in / out per case | 0 / 0 | 268 / 290 | 425 / 306 |
| results file | `baseline-20261022-144630.json` | `minimal-20261022-144812.json` | `optimized-20261022-144923.json` |

**vs dev v1.1 macro-F1** (same model/config): baseline 0.192 → hard 0.253; minimal 0.922 → hard 0.913; optimized 1.000 → hard 0.942.

### Failures (case not exact)

**optimized (M6a)** — 8 / 20 cases not exact:

| Case | taxonomy | targets_rule | Failure shape |
| --- | --- | --- | --- |
| hard_002 | FRANK:CorefE, FRANK:EntE, RAGTruth:evident_baseless | R5_coref_subject, R2_prepositional_split | 漏拆 (MISSED signed-by claim) |
| hard_003 | FRANK:LinkE, FRANK:CorefE, RAGTruth:subtle_conflict, RAGTruth:evident_baseless | R2_prepositional_split, R4_causal, R5_coref_subject | 融合+漏拆 (temporal “after” fused with send-off; MISSED separate CONTRADICTED) |
| hard_004 | FRANK:LinkE, RAGTruth:subtle_conflict, RAGTruth:evident_baseless, FRANK:CorefE | R4_causal, R5_coref_subject | 漏拆 (MISSED doubling fact; causal covered but year claim missed) |
| hard_014 | FRANK:PredE, FRANK:CircE, RAGTruth:evident_conflict | R1_atomic, R3_qualifier | 漏拆 (MISSED 23:40 leave time) |
| hard_016 | FRANK:OutE, RAGTruth:subtle_baseless, RAGTruth:evident_baseless, FRANK:CorefE, RAGTruth:evident_conflict | R2_prepositional_split, R5_coref_subject, R1_atomic | 漏拆 (MISSED best-selling jacket fact in modifier) |
| hard_017 | control:supported_paraphrase | R3_qualifier, R5_coref_subject | 多拆 (EXTRA paraphrase of public-night claim) |
| hard_018 | RAGTruth:subtle_conflict, FRANK:CircE, RAGTruth:evident_baseless | R2_prepositional_split, R3_qualifier | 对齐错 (MISSED day-pass gold + EXTRA near-paraphrase) |
| hard_020 | FRANK:CircE, RAGTruth:subtle_conflict | R2_prepositional_split, R3_qualifier, R1_atomic | 漏拆 (MISSED book-via-app fact when year wrong) |

**minimal** — 7 / 20 cases not exact: hard_002 (漏拆), hard_003 (漏拆), hard_004 (漏拆+对齐/措辞), hard_014 (漏拆), hard_016 (漏拆), hard_019 (对齐错：代词 They 未换成全名 → missed+extra), hard_020 (漏拆).

**Counts on optimized non-exact cases — by taxonomy label (case can contribute to multiple):** FRANK:CorefE 4; FRANK:CircE 3; RAGTruth:subtle_conflict 3; RAGTruth:evident_baseless 4; FRANK:LinkE 2; RAGTruth:evident_conflict 2; FRANK:EntE 1; FRANK:PredE 1; FRANK:OutE 1; RAGTruth:subtle_baseless 1; control:supported_paraphrase 1.

**By targets_rule (optimized non-exact):** R2_prepositional_split 6; R5_coref_subject 5; R3_qualifier 4; R1_atomic 3; R4_causal 2.

Disclosure: test cases drafted with AI assistance, reviewed by the author; results not hand-edited.

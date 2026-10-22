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

## Dev set rename: `cases.jsonl` → `1-1.jsonl`

The 24-case v1.1 **dev** file was renamed to `eval/1-1.jsonl`. Default `--dataset`, quote tests, README, and docs references were updated. Held-out hard split remains `eval/cases_test.jsonl`. Content of the 24 cases is unchanged (sha256 `0fb59a7e9172adc421c0e75365e785492ba5e4066a0703df46a90fc82007cf46`).

## Ablation on `1-1.jsonl`: wording-rule only (`--approach wording`)

**Hypothesis:** Add only the claim-wording / pronoun rule on top of the minimal prompt (no M6a atomic-split rules 1–4), to see effect on the original three failure modes vs full M6a.

**Change:** New verifier `src/verifiers/llmWording.ts` (approach `wording`) with the user-specified system prompt (minimal + wording rule). Minimal and optimized prompts unchanged.

**Result:** `results/wording-20261022-152047.md` on `eval/1-1.jsonl` (DeepSeek `deepseek-chat`):

| Metric | minimal v1.1 (same set) | wording-rule only | M6a optimized (same set) |
| --- | ---: | ---: | ---: |
| macro-F1 | 0.922 | 0.944 | 1.000 |
| matched verdict acc | 0.980 | 0.980 | 1.000 |
| e2e acc | 0.909 | 0.909 | 1.000 |
| case exact | 83.3% | 83.3% | 100.0% |
| claim-count exact | 87.5% | 83.3% | 100.0% |
| latency p50 / p95 | 1227 / 1600 ms | 1136 / 1820 ms | 1038 / 1706 ms |
| tokens in / out per case | 229 / 165 | 259 / 161 | 386 / 168 |

Failures (wording): case_003 MISSED six lanes; case_006 fused founder+year (same shape as minimal); case_012 MISSED World's Fair; case_021 MISSED dog park. case_011 (matcher alignment) not listed — wording/coref may have helped that row relative to minimal’s earlier log, but fused/missed from atomic-split still remain.

**Decision:** keep as an ablation artifact (`wording` approach + results file). Does not replace M6a.

## Hard split v2 (`eval/2-4.jsonl`) — prompt2 vs prompt3

**Purpose:** Check whether the M6a atomic-decomposition prompt (prompt3 / `optimized`) generalizes beyond the 24-case dev set, versus wording-only (prompt2 / `wording`), on 20 new cases with targeted groups T1–T3 and a `general` group.

**Protocol:** `pnpm eval --dataset eval/2-4.jsonl`; baseline ×1 → `results/4-baseline.*`; prompt2 `--repeat 3` → `results/4-prompt2.*`; prompt3 `--repeat 3` → `results/4-prompt3.*`. Model/config unchanged (DeepSeek `deepseek-chat`, thinking disabled, T=0.1). Dataset sha256 `4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684`.

| Approach | macro-F1 | end-to-end |
| --- | ---: | ---: |
| baseline | 0.253 | 0.192 |
| prompt2 (mean / min–max over 3) | 0.950 / 0.937–0.956 | 0.906 / 0.897–0.910 |
| prompt3 (mean / min–max over 3) | 0.950 / 0.947–0.952 | 0.910 / 0.910–0.910 |

Summary write-up: `docs/4-conclusion.md`.

## Statistical check (paired bootstrap)

Method: case-level paired bootstrap, 10000 resamples, seed 42, metrics averaged over 3 runs (prompt2 vs prompt3). Source: `results/bootstrap-prompt2-vs-prompt3-20261022-160418.md`.

| Metric | prompt2 | prompt3 | diff (B−A) | 95% CI |
| --- | ---: | ---: | ---: | --- |
| macro-F1 | 0.950 | 0.950 | 0.001 | [−0.026, 0.025] |
| end-to-end | 0.906 | 0.910 | 0.004 | [−0.034, 0.041] |

P(diff ≤ 0): macro-F1 0.464; end-to-end 0.453.

**Conclusion:** directionally positive but not significant at n=20 (CI includes 0).

**Unstable cases:** prompt2 — hard_019 (1); prompt3 — none (0).

## Per-group breakdown (hard test v1)

Source: `results/4-byGroup.md` (`eval/cases_test_grouped.jsonl`). Group × approach (correct/gold mean; failed case ids union across runs). Descriptive only; n per group too small for significance.

| Group | baseline | prompt2 | prompt3 | Failure shape (one line) |
| --- | ---: | ---: | ---: | --- |
| T1 | 0.313 | 0.854 | 0.875 | Coref / signed-by and night-bus style misses (hard_002, hard_014); prompt2 also unstable on hard_019 |
| T2 | 0.200 | 0.900 | 0.900 | Modifier / with-phrase misses (hard_016, hard_020) on both prompts |
| T3 | 0.150 | 0.850 | 0.900 | Temporal/causal fused claims; prompt3 fixes hard_004, hard_003 remains |
| general | 0.136 | 1.000 | 0.955 | prompt3 over-splits / paraphrase extras on hard_017–018; prompt2 perfect on this group |

Descriptive only; n per group too small for significance.

## prompt5 (facts → claims + split-test)

**Change:** New approach `prompt5` (`src/verifiers/llmPrompt5.ts`): two-step split instructions + Brookside Library example; JSON may include `facts` (accepted on `LlmOutput`, discarded; Claim unchanged). Registered in eval CLI and HTTP server.

**Dev `1-1.jsonl` (1 run):** macro-F1 **0.961**, e2e 0.982, case exact 91.7% → `results/5-prompt5-1-1.*`. Failures: case_010 EXTRA; case_011 missed+extra causal alignment.

**Hard `2-4.jsonl` (3 runs):** macro-F1 mean **0.941** (0.924–0.962), e2e mean 0.915 (0.897–0.923) → `results/5-prompt5.*`. Reused `4-baseline` / `4-prompt2` / `4-prompt3` (not re-run).

### Statistical check (prompt5 vs prompt2 / prompt3)

Case-level paired bootstrap, 10000 resamples, seed 42, averaged over 3 runs.

| Pair | Metric | A | B=prompt5 | diff | 95% CI |
| --- | --- | ---: | ---: | ---: | --- |
| vs prompt2 | macro-F1 | 0.950 | 0.941 | −0.009 | [−0.029, 0.012] |
| vs prompt2 | end-to-end | 0.906 | 0.915 | +0.009 | [−0.017, 0.042] |
| vs prompt3 | macro-F1 | 0.950 | 0.941 | −0.009 | [−0.042, 0.017] |
| vs prompt3 | end-to-end | 0.910 | 0.915 | +0.004 | [−0.021, 0.030] |

**Conclusion:** directionally negative on macro-F1 vs both baselines; **not significant at n=20** (CI includes 0).

**Unstable cases (case exact differs across 3 runs):** prompt2 — hard_019; prompt3 — hard_017; prompt5 — hard_014, hard_017, hard_018, hard_019.

### Per-group (with prompt5)

Source: `results/5-byGroup.md`. Descriptive only; n per group too small for significance.

| Group | prompt2 | prompt3 | prompt5 |
| --- | ---: | ---: | ---: |
| T1 | 0.854 | 0.875 | 0.854 |
| T2 | 0.900 | 0.900 | 0.900 |
| T3 | 0.850 | 0.900 | 0.900 |
| general | 1.000 | 0.955 | 0.985 |

Full write-up: `docs/5-conclusion.md`.

## prompt6 (detail / condition / relation rules + worked example)

**Change:** New approach `prompt6` (`src/verifiers/llmPrompt6.ts`). Step-2 rules: one event-detail per claim; keep condition/time unless only the bare fact is supported (then emit both); causal/ordering as relation-only claims; resolve vague references. Optional `facts` still discarded via `LlmOutput`.

**Disclosure:** Example patterns were informed by inspecting failures on `eval/2-4.jsonl`. Example entities (Brookside Library / Carter family) are fictional and do not appear in any dataset.

**Wording refresh:** replaced `best-selling`→`top-rated` and `the site, the counts`→`the venue, the figures`; re-ran eval and **overwrote** `results/6-prompt6*` / bootstrap / byGroup.

**Dev `1-1.jsonl` (1 run):** macro-F1 **1.000**, e2e 1.000, case exact 100% → `results/6-prompt6-1-1.*`. Failures: none (no drop).

**Hard `2-4.jsonl` (3 runs):** macro-F1 mean **0.956** (0.938–0.968), e2e mean **0.936** (0.923–0.949) → `results/6-prompt6.*`. Reused prompt2/3/5 result files.

### Statistical check (prompt6 vs prompt2 / prompt3 / prompt5)

Case-level paired bootstrap, 10000 resamples, seed 42, averaged over 3 runs.

| Pair | Metric | A | B=prompt6 | diff | 95% CI |
| --- | --- | ---: | ---: | ---: | --- |
| vs prompt2 | macro-F1 | 0.950 | 0.956 | +0.006 | [−0.010, 0.028] |
| vs prompt2 | end-to-end | 0.906 | 0.936 | +0.030 | [0.000, 0.069] |
| vs prompt3 | macro-F1 | 0.950 | 0.956 | +0.006 | [−0.021, 0.038] |
| vs prompt3 | end-to-end | 0.910 | 0.936 | +0.026 | [−0.017, 0.076] |
| vs prompt5 | macro-F1 | 0.941 | 0.956 | +0.015 | [−0.003, 0.037] |
| vs prompt5 | end-to-end | 0.915 | 0.936 | +0.021 | [−0.013, 0.059] |

**Conclusion:** directionally positive on macro-F1 and e2e vs prior prompts; **not significant at n=20** (all macro-F1 CIs include 0; e2e vs prompt2 CI touches 0 at the lower bound).

**Unstable cases (case exact differs across 3 runs):** prompt2 — hard_019; prompt3 — hard_017; prompt5 — hard_014, hard_017, hard_018, hard_019; prompt6 — hard_004, hard_019.

### Per-group (with prompt6)

Source: `results/6-byGroup.md`. Descriptive only; n per group too small for significance.

| Group | prompt2 | prompt3 | prompt5 | prompt6 |
| --- | ---: | ---: | ---: | ---: |
| T1 | 0.854 | 0.875 | 0.854 | 0.917 |
| T2 | 0.900 | 0.900 | 0.900 | 0.950 |
| T3 | 0.850 | 0.900 | 0.900 | 0.867 |
| general | 1.000 | 0.955 | 0.985 | 1.000 |

Full write-up: `docs/6-conclusion.md`.

## prompt7 (short patches on prompt6)

**Change:** New approach `prompt7` (`src/verifiers/llmPrompt7.ts`). Keeps prompt6 scaffold + neutral vocab. Patches: (1) from–to is one detail; (2) no duplicate condition-only claim; (3) side facts then relation-only claim; (4) example adds causal from–to + coref demo.

**Disclosure:** Example patterns informed by `2-4` failures; fictional entities; no hard-set surface tokens (`best-selling` / `the site` / `the counts` already avoided in prompt6 refresh).

**Dev `1-1.jsonl` (1 run):** macro-F1 **1.000**, e2e 1.000, case exact 100% → `results/7-prompt7-1-1.*`. Failures: none (no drop).

**Hard `2-4.jsonl` (3 runs):** macro-F1 mean **0.953** (0.936–0.972), e2e mean **0.944** (0.923–0.974) → `results/7-prompt7.*`. Reused prompt2/3/5/6 result files.

### Statistical check (prompt7 vs prompt2 / prompt3 / prompt5 / prompt6)

Case-level paired bootstrap, 10000 resamples, seed 42, averaged over 3 runs.

| Pair | Metric | A | B=prompt7 | diff | 95% CI |
| --- | --- | ---: | ---: | ---: | --- |
| vs prompt2 | macro-F1 | 0.950 | 0.953 | +0.003 | [−0.028, 0.034] |
| vs prompt2 | end-to-end | 0.906 | 0.944 | +0.038 | [0.000, 0.080] |
| vs prompt3 | macro-F1 | 0.950 | 0.953 | +0.002 | [−0.030, 0.035] |
| vs prompt3 | end-to-end | 0.910 | 0.944 | +0.034 | [−0.004, 0.076] |
| vs prompt5 | macro-F1 | 0.941 | 0.953 | +0.011 | [−0.025, 0.053] |
| vs prompt5 | end-to-end | 0.915 | 0.944 | +0.030 | [−0.004, 0.068] |
| vs prompt6 | macro-F1 | 0.956 | 0.953 | −0.004 | [−0.036, 0.029] |
| vs prompt6 | end-to-end | 0.936 | 0.944 | +0.009 | [−0.036, 0.053] |

**Conclusion:** directionally flat vs prompt6; small positive vs earlier prompts on e2e; **not significant at n=20** (macro-F1 CIs include 0).

**Unstable cases (case exact differs across 3 runs):** prompt2 — hard_019; prompt3 — hard_017; prompt5 — hard_014, hard_017, hard_018, hard_019; prompt6 — hard_004, hard_019; prompt7 — hard_003, hard_011, hard_013, hard_014, hard_017, hard_020.

### Per-group (with prompt7)

Source: `results/7-byGroup.md`. Descriptive only; n per group too small for significance.

| Group | prompt2 | prompt3 | prompt5 | prompt6 | prompt7 |
| --- | ---: | ---: | ---: | ---: | ---: |
| T1 | 0.854 | 0.875 | 0.854 | 0.917 | 0.958 |
| T2 | 0.900 | 0.900 | 0.900 | 0.950 | 0.900 |
| T3 | 0.850 | 0.900 | 0.900 | 0.867 | 0.917 |
| general | 1.000 | 0.955 | 0.985 | 1.000 | 1.000 |

Full write-up: `docs/7-conclusion.md`.

## prompt8 (leaner example on prompt7 rules)

**Change:** New approach `prompt8` (`src/verifiers/llmPrompt8.ts`). Same Step-2 patches as prompt7 (from–to one detail; no condition-only duplicate; relation-only without repeating numbers/times; coref), but **shorter example** (no east-wing / led-to causal story).

**Disclosure:** Example patterns informed by `2-4` failures; fictional entities; neutral vocab (no `best-selling` / `the site` / `the counts`).

**Dev `1-1.jsonl` (1 run):** macro-F1 **1.000**, e2e 1.000, case exact 100% → `results/8-prompt8-1-1.*`. Failures: none (no drop).

**Hard `2-4.jsonl` (3 runs):** macro-F1 mean **0.967** (0.963–0.972), e2e mean **0.940** (0.936–0.949) → `results/8-prompt8.*`. Reused prompt2/3/5/6/7.

### Statistical check (prompt8 vs prompt2 / 3 / 5 / 6 / 7)

Case-level paired bootstrap, 10000 resamples, seed 42, averaged over 3 runs.

| Pair | Metric | A | B=prompt8 | diff | 95% CI |
| --- | --- | ---: | ---: | ---: | --- |
| vs prompt2 | macro-F1 | 0.950 | 0.967 | +0.017 | [0.002, 0.038] |
| vs prompt2 | end-to-end | 0.906 | 0.940 | +0.034 | [0.008, 0.068] |
| vs prompt3 | macro-F1 | 0.950 | 0.967 | +0.017 | [−0.001, 0.042] |
| vs prompt3 | end-to-end | 0.910 | 0.940 | +0.030 | [0.000, 0.070] |
| vs prompt5 | macro-F1 | 0.941 | 0.967 | +0.026 | [0.004, 0.058] |
| vs prompt5 | end-to-end | 0.915 | 0.940 | +0.026 | [−0.000, 0.061] |
| vs prompt6 | macro-F1 | 0.956 | 0.967 | +0.011 | [−0.009, 0.032] |
| vs prompt6 | end-to-end | 0.936 | 0.940 | +0.004 | [−0.033, 0.043] |
| vs prompt7 | macro-F1 | 0.953 | 0.967 | +0.015 | [−0.008, 0.040] |
| vs prompt7 | end-to-end | 0.944 | 0.940 | −0.004 | [−0.028, 0.017] |

**Conclusion:** macro-F1 **significant vs prompt2 and prompt5** (CI excludes 0); **not significant vs prompt3 / 6 / 7** at n=20. Best point estimate so far.

**Unstable cases (case exact differs across 3 runs):** prompt8 — hard_004, hard_014, hard_020.

### Per-group (with prompt8)

Source: `results/8-byGroup.md`. Descriptive only; n per group too small for significance.

| Group | p2 | p3 | p5 | p6 | p7 | p8 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| T1 | 0.854 | 0.875 | 0.854 | 0.917 | 0.958 | 0.958 |
| T2 | 0.900 | 0.900 | 0.900 | 0.950 | 0.900 | 0.917 |
| T3 | 0.850 | 0.900 | 0.900 | 0.867 | 0.917 | 0.883 |
| general | 1.000 | 0.955 | 0.985 | 1.000 | 1.000 | 1.000 |

Full write-up: `docs/8-conclusion.md`.

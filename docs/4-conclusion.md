# Round 4 conclusion: does atomic decomposition generalize?

**Dataset:** `eval/2-4.jsonl` (20 held-out cases, sha256 `4d799be6…4410a684`).  
**Groups:** T1 / T2 / T3 = targeted at prior failure modes; `general` = other hallucination types (see `eval/cases_test_grouped.jsonl`).  
**Prompts:** prompt2 = wording/coref only (`wording`); prompt3 = M6a atomic rules 1–5 (`optimized`). Baseline = BM25 lexical.  
**Protocol:** baseline ×1; prompt2 / prompt3 ×3 (`--repeat 3`, one JSON with `runDetails`). DeepSeek `deepseek-chat`, thinking off, T=0.1.

## Headline (numbers from result files)

| Approach | Result file | macro-F1 | end-to-end | Notes |
| --- | --- | ---: | ---: | --- |
| baseline | `results/4-baseline.*` | 0.253 | 0.192 | single run |
| prompt2 | `results/4-prompt2.*` | **0.950** mean (0.937–0.956) | 0.906 mean | 3 runs |
| prompt3 | `results/4-prompt3.*` | **0.950** mean (0.947–0.952) | 0.910 mean | 3 runs |

Mean case-exact ≈ **0.683** for both LLM prompts.

## Paired bootstrap (prompt2 vs prompt3)

From `results/bootstrap-prompt2-vs-prompt3-*.md` (B=10000, seed 42, case-level, metrics averaged over 3 runs):

| Metric | prompt2 | prompt3 | diff (3−2) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.950 | 0.001 | [−0.026, 0.025] | 0.464 |
| end-to-end | 0.906 | 0.910 | 0.004 | [−0.034, 0.041] | 0.453 |

**Verdict:** CI includes 0 → **directionally flat / tiny positive, not significant at n=20**. Overall scores do not show a clear win for atomic rules on this split.

**Unstable cases:** prompt2 = `hard_019` (1); prompt3 = none.

## Per-group (descriptive only)

Full table: `results/4-byGroup.md`. Correct/gold mean (3 runs):

| Group | prompt2 | prompt3 | Side-effect note |
| --- | ---: | ---: | --- |
| T1 | 0.854 | **0.875** | Slightly fewer misses; both still fail hard_002 / hard_014 |
| T2 | 0.900 | 0.900 | Same misses (hard_016, hard_020) |
| T3 | 0.850 | **0.900** | prompt3 recovers hard_004; hard_003 remains |
| general | **1.000** | 0.955 | prompt3 adds EXTRA / miss on hard_017, hard_018 (finer split / paraphrase) |

So on **targeted** groups, prompt3 is as good or better; on **general**, finer decomposition shows a **small descriptive downside** (over-split / alignment), which washes out the overall macro-F1 gap.

## Takeaways

1. On this 20-case hard split, **prompt3 does not beat prompt2 on aggregate macro-F1** in a statistically meaningful way.
2. Gains look concentrated in **T3** (and slightly T1); **general** is where atomic rules can hurt case-exact via extras.
3. prompt3 is **more run-stable** (0 unstable cases vs 1).
4. Baseline remains far below both LLMs (sanity check).

Artifacts: `4-baseline`, `4-prompt2`, `4-prompt3`, `4-byGroup.md`, `bootstrap-prompt2-vs-prompt3-*.md`. Also logged under `docs/iteration-log.md`.

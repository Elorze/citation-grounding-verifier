# Round 6: prompt6 (detail / condition / relation split rules)

**prompt6** keeps the facts→claims scaffold, but Step 2 spells out: one detail per claim; keep conditions/time spans unless only the bare fact is supported (then emit both); causal/ordering as relation-only claims; resolve vague references. Worked example uses **fictional** Brookside Library entities (not present in any eval set).

**Disclosure:** The split patterns shown in the example (descriptive adjectives, who/when split, condition retention vs bare-fact twin, wrong time span → both claims) were added after inspecting failures on `eval/2-4.jsonl`. The example entities themselves are invented and do not appear in `1-1` or `2-4`.

**Config:** DeepSeek `deepseek-chat`, thinking off, T=0.1. Reused `4-prompt2` / `4-prompt3` / `5-prompt5` (not re-run).

## Dev `eval/1-1.jsonl` (1 run)

| | prompt6 |
| --- | ---: |
| macro-F1 | **1.000** |
| end-to-end | 1.000 |
| case exact | 100% |

Failures: _none_. Restored the clean 1.000 neighborhood after prompt5’s 0.961.

Artifact: `results/6-prompt6-1-1.*`

## Hard `eval/2-4.jsonl` (3 runs)

| Approach | macro-F1 mean (min–max) | end-to-end mean (min–max) |
| --- | ---: | ---: |
| prompt2 | 0.950 (0.937–0.956) | 0.906 (0.897–0.910) |
| prompt3 | 0.950 (0.947–0.952) | 0.910 (0.910–0.910) |
| prompt5 | 0.941 (0.924–0.962) | 0.915 (0.897–0.923) |
| **prompt6** | **0.955 (0.949–0.963)** | **0.944 (0.936–0.949)** |

Artifact: `results/6-prompt6.*`

## Paired bootstrap (B=10000, seed 42, 3-run average)

| Pair | Metric | A | prompt6 | diff | 95% CI | P(diff≤0) |
| --- | --- | ---: | ---: | ---: | --- | ---: |
| vs prompt2 | macro-F1 | 0.950 | 0.955 | +0.005 | [−0.018, 0.031] | 0.324 |
| vs prompt2 | end-to-end | 0.906 | 0.944 | +0.038 | [0.000, 0.082] | 0.025 |
| vs prompt3 | macro-F1 | 0.950 | 0.955 | +0.004 | [−0.036, 0.044] | 0.395 |
| vs prompt3 | end-to-end | 0.910 | 0.944 | +0.034 | [−0.022, 0.092] | 0.125 |
| vs prompt5 | macro-F1 | 0.941 | 0.955 | +0.013 | [−0.005, 0.034] | 0.080 |
| vs prompt5 | end-to-end | 0.915 | 0.944 | +0.030 | [−0.016, 0.074] | 0.101 |

**Significance rule:** CI must exclude 0. All macro-F1 CIs include 0 → **not significant**. End-to-end vs prompt2 has lower bound **0.000** (touches 0) → treat as **not significant** at n=20; directionally the strongest lift is coverage (e2e), not macro-F1.

## Unstable cases (case exact differs across 3 runs)

| Approach | Unstable case ids |
| --- | --- |
| prompt2 | hard_019 |
| prompt3 | hard_017 |
| prompt5 | hard_014, hard_017, hard_018, hard_019 |
| prompt6 | hard_002, hard_011, hard_016, hard_017, hard_019 |

## Per-group (descriptive; correct/gold mean)

Source: `results/6-byGroup.md`.

| Group | prompt2 | prompt3 | prompt5 | prompt6 |
| --- | ---: | ---: | ---: | ---: |
| T1 | 0.854 | 0.875 | 0.854 | **0.938** |
| T2 | 0.900 | 0.900 | 0.900 | **0.983** |
| T3 | 0.850 | 0.900 | 0.900 | 0.850 |
| general | 1.000 | 0.955 | 0.985 | **1.000** |

T1/T2/general look stronger; T3 regresses vs prompt3/5 (hard_003/004/011).

## Takeaway

prompt6 **recovers 1.000 on dev** and posts the best hard-split **mean macro-F1 (0.955)** and **e2e (0.944)** among the LLM prompts tried, but bootstrap does **not** clear significance on macro-F1 at n=20. Gains concentrate on targeted T1/T2 and restoring general; T3 remains a weak spot / trade-off.

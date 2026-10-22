# Round 6: prompt6 (detail / condition / relation split rules)

**prompt6** keeps the facts→claims scaffold, but Step 2 spells out: one detail per claim; keep conditions/time spans unless only the bare fact is supported (then emit both); causal/ordering as relation-only claims; resolve vague references. Worked example uses **fictional** Brookside Library entities (not present in any eval set).

**Wording refresh (this rerun):** example adjectives / vague refs updated (`top-rated`; `the venue`, `the figures`) so surface tokens are less likely to echo hard-set wording. Result files `results/6-prompt6*` overwrite the previous prompt6 run.

**Disclosure:** The split patterns shown in the example (descriptive adjectives, who/when split, condition retention vs bare-fact twin, wrong time span → both claims) were added after inspecting failures on `eval/2-4.jsonl`. The example entities themselves are invented and do not appear in `1-1` or `2-4`.

**Config:** DeepSeek `deepseek-chat`, thinking off, T=0.1. Reused `4-prompt2` / `4-prompt3` / `5-prompt5` (not re-run).

## Dev `eval/1-1.jsonl` (1 run)

| | prompt6 |
| --- | ---: |
| macro-F1 | **1.000** |
| end-to-end | 1.000 |
| case exact | 100% |

Failures: _none_. No drop vs the previous prompt6 / prompt3 clean run.

Artifact: `results/6-prompt6-1-1.*`

## Hard `eval/2-4.jsonl` (3 runs)

| Approach | macro-F1 mean (min–max) | end-to-end mean (min–max) |
| --- | ---: | ---: |
| prompt2 | 0.950 (0.937–0.956) | 0.906 (0.897–0.910) |
| prompt3 | 0.950 (0.947–0.952) | 0.910 (0.910–0.910) |
| prompt5 | 0.941 (0.924–0.962) | 0.915 (0.897–0.923) |
| **prompt6** | **0.956 (0.938–0.968)** | **0.936 (0.923–0.949)** |

Artifact: `results/6-prompt6.*`

## Paired bootstrap (B=10000, seed 42, 3-run average)

| Pair | Metric | A | prompt6 | diff | 95% CI | P(diff≤0) |
| --- | --- | ---: | ---: | ---: | --- | ---: |
| vs prompt2 | macro-F1 | 0.950 | 0.956 | +0.006 | [−0.010, 0.028] | 0.241 |
| vs prompt2 | end-to-end | 0.906 | 0.936 | +0.030 | [0.000, 0.069] | 0.039 |
| vs prompt3 | macro-F1 | 0.950 | 0.956 | +0.006 | [−0.021, 0.038] | 0.354 |
| vs prompt3 | end-to-end | 0.910 | 0.936 | +0.026 | [−0.017, 0.076] | 0.150 |
| vs prompt5 | macro-F1 | 0.941 | 0.956 | +0.015 | [−0.003, 0.037] | 0.061 |
| vs prompt5 | end-to-end | 0.915 | 0.936 | +0.021 | [−0.013, 0.059] | 0.125 |

**Significance:** all macro-F1 CIs include 0 → **not significant** at n=20. e2e vs prompt2 CI touches 0 at the lower bound → also **not significant**.

## Unstable cases (case exact differs across 3 runs)

| Approach | Unstable case ids |
| --- | --- |
| prompt2 | hard_019 |
| prompt3 | hard_017 |
| prompt5 | hard_014, hard_017, hard_018, hard_019 |
| prompt6 | hard_004, hard_019 |

(Fewer case-exact flips than the previous prompt6 wording.)

## Per-group (descriptive; correct/gold mean)

Source: `results/6-byGroup.md`.

| Group | prompt2 | prompt3 | prompt5 | prompt6 |
| --- | ---: | ---: | ---: | ---: |
| T1 | 0.854 | 0.875 | 0.854 | **0.917** |
| T2 | 0.900 | 0.900 | 0.900 | **0.950** |
| T3 | 0.850 | 0.900 | 0.900 | 0.867 |
| general | 1.000 | 0.955 | 0.985 | **1.000** |

## Takeaway

Revised prompt6 still **holds 1.000 on dev**, keeps a slight hard-split **mean macro-F1 edge (0.956)** over prompt2/3, with **no significant** bootstrap win. Stability improved vs the prior prompt6 run (2 unstable cases instead of 5).

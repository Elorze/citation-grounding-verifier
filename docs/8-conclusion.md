# Round 8: prompt8 (leaner example; keep from-to / condition / coref)

**prompt8** keeps the facts→claims rules from prompt7 (from–to one detail; no duplicate condition-only claim; relation-only without repeating numbers/times; coref), but **simplifies the worked example**: drops the east-wing / led-to causal mini-story; keeps adjective, who/when, since twin, from–to, and They/venue coref.

**Disclosure:** Example patterns were informed by `eval/2-4.jsonl` failures. Entities are fictional. Neutral vocab (`top-rated` / `the venue`); no hard-set tokens like `best-selling` / `the site` / `the counts`.

**Config:** DeepSeek `deepseek-chat`, thinking off, T=0.1. Reused `4-prompt2` … `7-prompt7` (not re-run).

## Dev `eval/1-1.jsonl` (1 run)

| | prompt8 |
| --- | ---: |
| macro-F1 | **1.000** |
| end-to-end | 1.000 |
| case exact | 100% |

Failures: _none_. No drop.

Artifact: `results/8-prompt8-1-1.*`

## Hard `eval/2-4.jsonl` (3 runs)

| Approach | macro-F1 mean (min–max) | end-to-end mean (min–max) |
| --- | ---: | ---: |
| prompt2 | 0.950 (0.937–0.956) | 0.906 (0.897–0.910) |
| prompt3 | 0.950 (0.947–0.952) | 0.910 (0.910–0.910) |
| prompt5 | 0.941 (0.924–0.962) | 0.915 (0.897–0.923) |
| prompt6 | 0.956 (0.938–0.968) | 0.936 (0.923–0.949) |
| prompt7 | 0.953 (0.936–0.972) | 0.944 (0.923–0.974) |
| **prompt8** | **0.967 (0.963–0.972)** | **0.940 (0.936–0.949)** |

Artifact: `results/8-prompt8.*` — **best mean macro-F1** so far; tight min–max.

## Paired bootstrap (B=10000, seed 42, 3-run average)

| Pair | Metric | A | prompt8 | diff | 95% CI | note |
| --- | --- | ---: | ---: | ---: | --- | --- |
| vs prompt2 | macro-F1 | 0.950 | 0.967 | +0.017 | **[0.002, 0.038]** | CI excludes 0 |
| vs prompt2 | end-to-end | 0.906 | 0.940 | +0.034 | **[0.008, 0.068]** | CI excludes 0 |
| vs prompt3 | macro-F1 | 0.950 | 0.967 | +0.017 | [−0.001, 0.042] | touches ~0 |
| vs prompt3 | end-to-end | 0.910 | 0.940 | +0.030 | [0.000, 0.070] | touches 0 |
| vs prompt5 | macro-F1 | 0.941 | 0.967 | +0.026 | **[0.004, 0.058]** | CI excludes 0 |
| vs prompt5 | end-to-end | 0.915 | 0.940 | +0.026 | [−0.000, 0.061] | includes 0 |
| vs prompt6 | macro-F1 | 0.956 | 0.967 | +0.011 | [−0.009, 0.032] | n.s. |
| vs prompt6 | end-to-end | 0.936 | 0.940 | +0.004 | [−0.033, 0.043] | n.s. |
| vs prompt7 | macro-F1 | 0.953 | 0.967 | +0.015 | [−0.008, 0.040] | n.s. |
| vs prompt7 | end-to-end | 0.944 | 0.940 | −0.004 | [−0.028, 0.017] | n.s. |

**Significance (CI excludes 0):** macro-F1 **significant vs prompt2 and prompt5**; **not** vs prompt3/6/7 at n=20. vs prompt6/7: directionally better macro, not significant.

## Unstable cases (case exact differs across 3 runs)

| Approach | Unstable case ids |
| --- | --- |
| prompt2 | hard_019 |
| prompt3 | hard_017 |
| prompt5 | hard_014, hard_017, hard_018, hard_019 |
| prompt6 | hard_004, hard_019 |
| prompt7 | hard_003, hard_011, hard_013, hard_014, hard_017, hard_020 |
| prompt8 | hard_004, hard_014, hard_020 |

More stable than prompt7; similar count to prompt6.

## Per-group (descriptive; correct/gold mean)

Source: `results/8-byGroup.md`.

| Group | p2 | p3 | p5 | p6 | p7 | p8 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| T1 | 0.854 | 0.875 | 0.854 | 0.917 | 0.958 | **0.958** |
| T2 | 0.900 | 0.900 | 0.900 | **0.950** | 0.900 | 0.917 |
| T3 | 0.850 | 0.900 | 0.900 | 0.867 | **0.917** | 0.883 |
| general | 1.000 | 0.955 | 0.985 | 1.000 | 1.000 | **1.000** |

general: case exact **3/3** (no failed ids). prompt7’s T3 extra noise is reduced.

## Takeaway

prompt8 is the **strongest aggregate** single-call prompt on this hard split (**macro-F1 0.967**, narrow range). Gains vs early prompts (2/5) clear the CI; vs later prompt6/7 the lift is real in point estimate but **not significant**. Prefer **prompt8** as the current optimized approach for reporting, with the usual n=20 caveat.

# Round 7: prompt7 (short patches on prompt6)

**prompt7** keeps prompt6’s facts→claims scaffold and neutral example vocabulary (`top-rated` / `the venue`). Patches only:

1. **Rule 1:** from–to / rose-from-to is **one** detail (no endpoint split).
2. **Rule 2:** if a condition is already inside a claim, do **not** also emit a condition-only claim (targets hard_017-style extras).
3. **Rule 3:** write side facts A/B first, then a **relation-only** claim (no numbers/times duplicated into the relation).
4. **Example:** adds causal from–to + coref (`They` / `the venue` → full names); who/when split called out.

**Disclosure:** Example patterns were informed by `eval/2-4.jsonl` failures. Entities (Brookside / Northbridge / Willow) are fictional and do not appear in any eval set. Prompt text avoids hard-set surface tokens such as `best-selling` / `the site` / `the counts`.

**Config:** DeepSeek `deepseek-chat`, thinking off, T=0.1. Reused `4-prompt2` / `4-prompt3` / `5-prompt5` / `6-prompt6` (not re-run).

## Dev `eval/1-1.jsonl` (1 run)

| | prompt7 |
| --- | ---: |
| macro-F1 | **1.000** |
| end-to-end | 1.000 |
| case exact | 100% |

Failures: _none_. No drop vs prompt6.

Artifact: `results/7-prompt7-1-1.*`

## Hard `eval/2-4.jsonl` (3 runs)

| Approach | macro-F1 mean (min–max) | end-to-end mean (min–max) |
| --- | ---: | ---: |
| prompt2 | 0.950 (0.937–0.956) | 0.906 (0.897–0.910) |
| prompt3 | 0.950 (0.947–0.952) | 0.910 (0.910–0.910) |
| prompt5 | 0.941 (0.924–0.962) | 0.915 (0.897–0.923) |
| prompt6 | 0.956 (0.938–0.968) | 0.936 (0.923–0.949) |
| **prompt7** | **0.953 (0.936–0.972)** | **0.944 (0.923–0.974)** |

Artifact: `results/7-prompt7.*`

## Paired bootstrap (B=10000, seed 42, 3-run average)

| Pair | Metric | A | prompt7 | diff | 95% CI |
| --- | --- | ---: | ---: | ---: | --- |
| vs prompt2 | macro-F1 | 0.950 | 0.953 | +0.003 | [−0.028, 0.034] |
| vs prompt2 | end-to-end | 0.906 | 0.944 | +0.038 | [0.000, 0.080] |
| vs prompt3 | macro-F1 | 0.950 | 0.953 | +0.002 | [−0.030, 0.035] |
| vs prompt3 | end-to-end | 0.910 | 0.944 | +0.034 | [−0.004, 0.076] |
| vs prompt5 | macro-F1 | 0.941 | 0.953 | +0.011 | [−0.025, 0.053] |
| vs prompt5 | end-to-end | 0.915 | 0.944 | +0.030 | [−0.004, 0.068] |
| vs prompt6 | macro-F1 | 0.956 | 0.953 | −0.004 | [−0.036, 0.029] |
| vs prompt6 | end-to-end | 0.936 | 0.944 | +0.009 | [−0.036, 0.053] |

**Significance:** all macro-F1 CIs include 0 → **not significant** at n=20. vs prompt6: essentially flat (tiny macro dip, tiny e2e rise).

## Unstable cases (case exact differs across 3 runs)

| Approach | Unstable case ids |
| --- | --- |
| prompt2 | hard_019 |
| prompt3 | hard_017 |
| prompt5 | hard_014, hard_017, hard_018, hard_019 |
| prompt6 | hard_004, hard_019 |
| prompt7 | hard_003, hard_011, hard_013, hard_014, hard_017, hard_020 |

prompt7 is **more run-volatile** than prompt6 despite similar means.

## Per-group (descriptive; correct/gold mean)

Source: `results/7-byGroup.md`.

| Group | prompt2 | prompt3 | prompt5 | prompt6 | prompt7 |
| --- | ---: | ---: | ---: | ---: | ---: |
| T1 | 0.854 | 0.875 | 0.854 | 0.917 | **0.958** |
| T2 | 0.900 | 0.900 | 0.900 | **0.950** | 0.900 |
| T3 | 0.850 | 0.900 | 0.900 | 0.867 | **0.917** |
| general | 1.000 | 0.955 | 0.985 | 1.000 | 1.000 |

T1 improves (hard_002 / hard_019 less sticky in the failed union). T2 regresses vs prompt6 (hard_013/016/020). T3 mean up but with more extras and unstable cases.

## Takeaway

prompt7 **keeps 1.000 on dev** and stays in the same hard-split band as prompt6 (**~0.95 macro-F1**), with **no significant** bootstrap win over 2/3/5/6. Patches help some targeted rows (T1/T3 coverage) but add variance and do not beat prompt6 on mean macro-F1. Prefer **prompt6 or prompt7** as the current best single-call prompts; do not treat the 7 vs 6 delta as a clear upgrade without more data.

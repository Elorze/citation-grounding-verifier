# Round 5: prompt5 (facts → claims + split-test)

**prompt5** teaches a two-step split (list `facts`, then claims) plus a split-test (“different verdicts → separate claims”), with a concrete Brookside Library example. Causal + wording/coref rules remain; the old numbered compound/prepositional checklist from prompt3 is dropped. Optional `facts` in the model JSON is accepted by `LlmOutput` and discarded (Claim schema unchanged).

**Config:** DeepSeek `deepseek-chat`, thinking off, T=0.1. No dataset/label edits; baseline / prompt2 / prompt3 **not** re-run (reuse `results/4-*`).

## Dev `eval/1-1.jsonl` (1 run)

| | prompt5 |
| --- | ---: |
| macro-F1 | **0.961** |
| end-to-end | 0.982 |
| case exact | 91.7% |

Failures: case_010 EXTRA free-shipping paraphrase; case_011 causal claim missed+extra (alignment/wording). Not a full clean on the set where prompt3 previously hit 1.000.

Artifact: `results/5-prompt5-1-1.*`

## Hard `eval/2-4.jsonl` (3 runs)

| Approach | macro-F1 mean (min–max) | end-to-end mean (min–max) |
| --- | ---: | ---: |
| baseline (reuse) | 0.253 | 0.192 |
| prompt2 (reuse) | 0.950 (0.937–0.956) | 0.906 (0.897–0.910) |
| prompt3 (reuse) | 0.950 (0.947–0.952) | 0.910 (0.910–0.910) |
| **prompt5** | **0.941 (0.924–0.962)** | **0.915 (0.897–0.923)** |

Artifact: `results/5-prompt5.*`

## Paired bootstrap (B=10000, seed 42, 3-run average)

**prompt5 − prompt2** (`bootstrap-prompt2-vs-prompt5-*.md`):

| Metric | prompt2 | prompt5 | diff | 95% CI | P(diff≤0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.941 | −0.009 | [−0.029, 0.012] | 0.799 |
| end-to-end | 0.906 | 0.915 | +0.009 | [−0.017, 0.042] | 0.360 |

**prompt5 − prompt3** (`bootstrap-prompt3-vs-prompt5-*.md`):

| Metric | prompt3 | prompt5 | diff | 95% CI | P(diff≤0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.941 | −0.009 | [−0.042, 0.017] | 0.704 |
| end-to-end | 0.910 | 0.915 | +0.004 | [−0.021, 0.030] | 0.424 |

**Significance:** both macro-F1 CIs include 0 → **not significant** at n=20. Headline macro-F1 mean is slightly **below** prompt2/prompt3; e2e is slightly above but also not significant.

## Unstable cases (case exact differs across 3 runs)

| Approach | Unstable case ids |
| --- | --- |
| prompt2 | hard_019 |
| prompt3 | hard_017 |
| prompt5 | hard_014, hard_017, hard_018, hard_019 |

(Bootstrap’s gold-claim-outcome unstable list for prompt5: hard_014, hard_018, hard_019.)

## Per-group (descriptive counts only)

Source: `results/5-byGroup.md`. correct/gold mean:

| Group | prompt2 | prompt3 | prompt5 |
| --- | ---: | ---: | ---: |
| T1 | 0.854 | 0.875 | 0.854 |
| T2 | 0.900 | 0.900 | 0.900 |
| T3 | 0.850 | 0.900 | 0.900 |
| general | 1.000 | 0.955 | 0.985 |

prompt5 matches prompt3 on T3, sits between prompt2 and prompt3 on general, and is more run-volatile.

## Takeaway

On this hard split, **prompt5 does not improve aggregate macro-F1** over prompt2/prompt3 (mean 0.941 vs 0.950; CI includes 0). The facts→claims procedure helps coverage a little (e2e) but adds extras/variance. Prefer keeping prompt3 (or prompt2) as the production prompt until a clearer win shows up.

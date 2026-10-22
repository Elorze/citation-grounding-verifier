# Paired bootstrap: prompt6 vs optimized

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt6 | optimized | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.942 | 0.932 | -0.010 | [-0.063, 0.018] | 0.630 |
| end-to-end | 0.983 | 0.978 | -0.004 | [-0.027, 0.012] | 0.727 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt6**: 1 — conf_005
- **optimized**: 1 — conf_019

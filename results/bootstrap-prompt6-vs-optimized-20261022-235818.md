# Paired bootstrap: prompt6 vs optimized

Case-level paired bootstrap, B=10000, seed=42, averaged over 1/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt6 | optimized | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.948 | 0.932 | -0.016 | [-0.068, 0.007] | 0.759 |
| end-to-end | 0.987 | 0.978 | -0.009 | [-0.028, 0.000] | 0.965 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt6**: 0 — _none_
- **optimized**: 1 — conf_019

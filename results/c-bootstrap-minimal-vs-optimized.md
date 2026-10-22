# Paired bootstrap: minimal vs optimized

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | minimal | optimized | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.943 | 0.932 | -0.011 | [-0.068, 0.019] | 0.637 |
| end-to-end | 0.896 | 0.978 | 0.082 | [0.018, 0.149] | 0.006 |

## Unstable cases (gold-claim outcome differs across runs)

- **minimal**: 2 — conf_005, conf_017
- **optimized**: 1 — conf_019

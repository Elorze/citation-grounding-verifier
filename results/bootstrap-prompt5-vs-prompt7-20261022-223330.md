# Paired bootstrap: prompt5 vs prompt7

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt5 | prompt7 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.941 | 0.953 | 0.011 | [-0.025, 0.053] | 0.283 |
| end-to-end | 0.915 | 0.944 | 0.030 | [-0.004, 0.068] | 0.052 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt5**: 3 — hard_014, hard_018, hard_019
- **prompt7**: 5 — hard_003, hard_011, hard_013, hard_014, hard_020

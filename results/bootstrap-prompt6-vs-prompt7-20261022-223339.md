# Paired bootstrap: prompt6 vs prompt7

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt6 | prompt7 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.956 | 0.953 | -0.004 | [-0.036, 0.029] | 0.581 |
| end-to-end | 0.936 | 0.944 | 0.009 | [-0.036, 0.053] | 0.390 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt6**: 2 — hard_004, hard_019
- **prompt7**: 5 — hard_003, hard_011, hard_013, hard_014, hard_020

# Paired bootstrap: prompt2 vs prompt6

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt2 | prompt6 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.956 | 0.006 | [-0.010, 0.028] | 0.241 |
| end-to-end | 0.906 | 0.936 | 0.030 | [0.000, 0.069] | 0.039 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt2**: 1 — hard_019
- **prompt6**: 2 — hard_004, hard_019

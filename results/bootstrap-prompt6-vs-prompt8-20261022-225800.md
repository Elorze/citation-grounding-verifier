# Paired bootstrap: prompt6 vs prompt8

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt6 | prompt8 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.956 | 0.967 | 0.011 | [-0.009, 0.032] | 0.151 |
| end-to-end | 0.936 | 0.940 | 0.004 | [-0.033, 0.043] | 0.452 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt6**: 2 — hard_004, hard_019
- **prompt8**: 3 — hard_004, hard_014, hard_020

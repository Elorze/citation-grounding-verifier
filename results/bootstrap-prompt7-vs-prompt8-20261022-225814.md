# Paired bootstrap: prompt7 vs prompt8

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt7 | prompt8 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.953 | 0.967 | 0.015 | [-0.008, 0.040] | 0.118 |
| end-to-end | 0.944 | 0.940 | -0.004 | [-0.028, 0.017] | 0.699 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt7**: 5 — hard_003, hard_011, hard_013, hard_014, hard_020
- **prompt8**: 3 — hard_004, hard_014, hard_020

# Paired bootstrap: prompt5 vs prompt8

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt5 | prompt8 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.941 | 0.967 | 0.026 | [0.004, 0.058] | 0.006 |
| end-to-end | 0.915 | 0.940 | 0.026 | [-0.000, 0.061] | 0.054 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt5**: 3 — hard_014, hard_018, hard_019
- **prompt8**: 3 — hard_004, hard_014, hard_020

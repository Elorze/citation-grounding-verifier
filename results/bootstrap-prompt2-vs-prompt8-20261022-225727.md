# Paired bootstrap: prompt2 vs prompt8

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt2 | prompt8 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.967 | 0.017 | [0.002, 0.038] | 0.009 |
| end-to-end | 0.906 | 0.940 | 0.034 | [0.008, 0.068] | 0.003 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt2**: 1 — hard_019
- **prompt8**: 3 — hard_004, hard_014, hard_020

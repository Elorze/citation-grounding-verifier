# Paired bootstrap: prompt3 vs prompt8

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt3 | prompt8 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.967 | 0.017 | [-0.001, 0.042] | 0.044 |
| end-to-end | 0.910 | 0.940 | 0.030 | [0.000, 0.070] | 0.050 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt3**: 0 — _none_
- **prompt8**: 3 — hard_004, hard_014, hard_020

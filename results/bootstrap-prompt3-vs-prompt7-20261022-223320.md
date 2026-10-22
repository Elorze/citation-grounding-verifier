# Paired bootstrap: prompt3 vs prompt7

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt3 | prompt7 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.953 | 0.002 | [-0.030, 0.035] | 0.435 |
| end-to-end | 0.910 | 0.944 | 0.034 | [-0.004, 0.076] | 0.047 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt3**: 0 — _none_
- **prompt7**: 5 — hard_003, hard_011, hard_013, hard_014, hard_020

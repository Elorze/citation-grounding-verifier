# Paired bootstrap: prompt3 vs prompt6

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt3 | prompt6 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.956 | 0.006 | [-0.021, 0.038] | 0.354 |
| end-to-end | 0.910 | 0.936 | 0.026 | [-0.017, 0.076] | 0.150 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt3**: 0 — _none_
- **prompt6**: 2 — hard_004, hard_019

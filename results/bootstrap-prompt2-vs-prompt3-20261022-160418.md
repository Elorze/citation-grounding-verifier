# Paired bootstrap: prompt2 vs prompt3

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt2 | prompt3 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.950 | 0.001 | [-0.026, 0.025] | 0.464 |
| end-to-end | 0.906 | 0.910 | 0.004 | [-0.034, 0.041] | 0.453 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt2**: 1 — hard_019
- **prompt3**: 0 — _none_

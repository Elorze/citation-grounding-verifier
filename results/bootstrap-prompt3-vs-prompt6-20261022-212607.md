# Paired bootstrap: prompt3 vs prompt6

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt3 | prompt6 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.955 | 0.004 | [-0.036, 0.044] | 0.395 |
| end-to-end | 0.910 | 0.944 | 0.034 | [-0.022, 0.092] | 0.125 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt3**: 0 — _none_
- **prompt6**: 3 — hard_002, hard_016, hard_019

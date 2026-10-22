# Paired bootstrap: prompt3 vs prompt5

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt3 | prompt5 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.941 | -0.009 | [-0.042, 0.017] | 0.704 |
| end-to-end | 0.910 | 0.915 | 0.004 | [-0.021, 0.030] | 0.424 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt3**: 0 — _none_
- **prompt5**: 3 — hard_014, hard_018, hard_019

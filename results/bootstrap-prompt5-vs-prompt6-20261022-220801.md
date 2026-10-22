# Paired bootstrap: prompt5 vs prompt6

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt5 | prompt6 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.941 | 0.956 | 0.015 | [-0.003, 0.037] | 0.061 |
| end-to-end | 0.915 | 0.936 | 0.021 | [-0.013, 0.059] | 0.125 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt5**: 3 — hard_014, hard_018, hard_019
- **prompt6**: 2 — hard_004, hard_019

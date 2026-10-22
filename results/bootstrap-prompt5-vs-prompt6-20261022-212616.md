# Paired bootstrap: prompt5 vs prompt6

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt5 | prompt6 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.941 | 0.955 | 0.013 | [-0.005, 0.034] | 0.080 |
| end-to-end | 0.915 | 0.944 | 0.030 | [-0.016, 0.074] | 0.101 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt5**: 3 — hard_014, hard_018, hard_019
- **prompt6**: 3 — hard_002, hard_016, hard_019

# Paired bootstrap: prompt2 vs prompt6

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt2 | prompt6 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.955 | 0.005 | [-0.018, 0.031] | 0.324 |
| end-to-end | 0.906 | 0.944 | 0.038 | [0.000, 0.082] | 0.025 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt2**: 1 — hard_019
- **prompt6**: 3 — hard_002, hard_016, hard_019

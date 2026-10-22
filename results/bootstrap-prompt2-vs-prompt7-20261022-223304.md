# Paired bootstrap: prompt2 vs prompt7

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt2 | prompt7 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.953 | 0.003 | [-0.028, 0.034] | 0.417 |
| end-to-end | 0.906 | 0.944 | 0.038 | [0.000, 0.080] | 0.027 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt2**: 1 — hard_019
- **prompt7**: 5 — hard_003, hard_011, hard_013, hard_014, hard_020

# Paired bootstrap: prompt2 vs prompt5

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | prompt2 | prompt5 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.950 | 0.941 | -0.009 | [-0.029, 0.012] | 0.799 |
| end-to-end | 0.906 | 0.915 | 0.009 | [-0.017, 0.042] | 0.360 |

## Unstable cases (gold-claim outcome differs across runs)

- **prompt2**: 1 — hard_019
- **prompt5**: 3 — hard_014, hard_018, hard_019

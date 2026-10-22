# Paired bootstrap: minimal vs prompt6

Case-level paired bootstrap, B=10000, seed=42, averaged over 3/3 runs (n=20 cases).

## Point estimates and 95% CI on diff (B − A)

| Metric | minimal | prompt6 | diff (B−A) | 95% CI | P(diff ≤ 0) |
| --- | ---: | ---: | ---: | --- | ---: |
| macro-F1 | 0.943 | 0.942 | -0.001 | [-0.018, 0.013] | 0.538 |
| end-to-end | 0.896 | 0.983 | 0.087 | [0.029, 0.148] | 0.001 |

## Unstable cases (gold-claim outcome differs across runs)

- **minimal**: 2 — conf_005, conf_017
- **prompt6**: 1 — conf_005

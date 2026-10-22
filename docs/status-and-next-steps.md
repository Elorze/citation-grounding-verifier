# Status

Assignment three-way comparison is live: **baseline / minimal / optimized**.

- **`optimized` ≡ prompt8** (`src/verifiers/llmOptimized.ts` delegates to `llmPrompt8Verifier`).
- Evaluation report (quality, latency/cost, key failures, hill-climbing): **[`README.md`](../README.md)**.
- Full climb log + bootstrap: [`iteration-log.md`](iteration-log.md), [`8-conclusion.md`](8-conclusion.md).

Climbing stopped after prompt8 (plateau / n=20 variance). Ablation aliases `wording` / `prompt5`…`prompt8` remain for reproduction.

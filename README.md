# Citation Grounding & Faithfulness Verifier

HTTP service that splits an LLM answer into atomic claims, checks each against source passages (`SUPPORTED` / `CONTRADICTED` / `UNSUPPORTED`), and attaches **verbatim** citations. Includes a 24-case benchmark and three approaches: non-LLM baseline, minimal LLM, and optimized LLM (currently same as minimal until M6).

## Quick start

```bash
pnpm i
cp .env.example .env   # set ZHIPU_API_KEY
pnpm dev               # http://localhost:3100
pnpm test
pnpm eval -- --approach baseline
pnpm eval -- --approach minimal --label "M4 minimal+validate"
```

Example:

```bash
curl -s -X POST "http://localhost:3100/verify?approach=baseline" \
  -H "Content-Type: application/json" \
  --data-binary @sample.json
```

## Approaches

| Name | Description |
| --- | --- |
| `baseline` | Sentence split + hand-rolled BM25 + coverage / number / negation heuristics (no API) |
| `minimal` | Single GLM-4.7-Flash call with the assignment’s minimal prompt + Zod parse + citation validate/retry/repair |
| `optimized` | Starts as a copy of `minimal`; M6 hill-climbing not applied yet (see `docs/status-and-next-steps.md`) |
| `stub` | Fixed response for wiring tests |

## Design notes

- **JSON mode is not trusted.** Zhipu `glm-4.7-flash` does not support strict structured outputs via the OpenAI-compatible SDK (`responseFormat` unsupported). We use plain `generateText`, extract JSON, validate with Zod, then enforce quote/index invariants in `src/validate.ts`.
- **Empty context** → every claim forced to `UNSUPPORTED` with `[]` citations.
- **Empty / non-factual answer** → `{ "claims": [] }`.
- Eval runs **in-process** (no HTTP), sequentially, with optional `EVAL_DELAY_MS` for free-tier rate limits.

## Dataset

`eval/cases.jsonl` — 24 labeled cases (categories: supported, subtle_distortion, extrinsic_hallucination, multi_passage, edge_case, mixed). Gold quotes are verbatim substrings. See `示范用例库.md` for labeling rules.

## Metrics

Claim matching: Jaccard over tokens (CJK bigrams), greedy 1:1, threshold **0.5**. Headline metric: **macro-F1** over S/C/U. See `eval/metrics.ts`. Limitation: differently split / paraphrased claims may fail to match even when the verdict is right.

## Results (this run)

See `results/` and `docs/status-and-next-steps.md` for the latest numbers and the planned M6 optimization ladder (not executed yet).

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` / `pnpm start` | HTTP server |
| `pnpm eval -- --approach <name>` | Benchmark |
| `pnpm test` | Unit tests |
| `pnpm typecheck` | `tsc --noEmit` |

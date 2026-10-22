# Citation Grounding & Faithfulness Verifier

HTTP service that splits an LLM answer into atomic claims, checks each against source passages (`SUPPORTED` / `CONTRADICTED` / `UNSUPPORTED`), and attaches **verbatim** citations. Includes a 24-case benchmark and three approaches: non-LLM baseline, minimal LLM, and optimized LLM (currently same as minimal until M6).

## Quick start

```bash
pnpm i
cp .env.example .env   # set LLM_API_KEY (and optionally LLM_BASE_URL / LLM_MODEL)
pnpm dev               # http://localhost:3100
pnpm test
pnpm eval -- --approach baseline
pnpm eval -- --approach minimal --label "M4 minimal deepseek v1.1"
```

Current benchmark provider: **DeepSeek `deepseek-chat`** (`LLM_THINKING=disabled`, `LLM_TEMPERATURE=0.1`). The client is OpenAI-compatible; legacy `ZHIPU_API_KEY` still works if `LLM_API_KEY` is unset.

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
| `minimal` | Single LLM call (`LLM_MODEL`, currently DeepSeek `deepseek-chat`) with the assignment’s minimal prompt + Zod parse + citation validate/retry/repair |
| `optimized` | Starts as a copy of `minimal`; M6 hill-climbing not applied yet (see `docs/status-and-next-steps.md`) |
| `stub` | Fixed response for wiring tests |

## Design notes

- **Structured output is not trusted.** Early integration used Zhipu, which did not support strict structured outputs via the OpenAI-compatible SDK, so the path is plain `generateText` → extract JSON → Zod → enforce quote/index invariants in `src/validate.ts`. That path remains for DeepSeek as well.
- **Empty context** → every claim forced to `UNSUPPORTED` with `[]` citations.
- **Empty / non-factual answer** → `{ "claims": [] }`.
- Eval runs **in-process** (no HTTP), sequentially, with optional `EVAL_DELAY_MS` for rate limits.

## Dataset

`eval/1-1.jsonl` — 24 labeled **dev** cases (formerly `cases.jsonl`; categories: supported, subtle_distortion, extrinsic_hallucination, multi_passage, edge_case, mixed), **dataset v1.1**. Held-out hard split: `eval/cases_test.jsonl`. Gold quotes are verbatim substrings. See `示范用例库.md` for labeling rules.

## Metrics

Claim matching: Jaccard over hybrid tokens (Latin words + CJK bigrams) with a containment boost, greedy 1:1, threshold **0.5**. Headline metric: **macro-F1** over S/C/U. See `eval/metrics.ts`. Limitation: differently split / paraphrased claims may fail to match even when the verdict is right.

## Current results (dataset v1.1)

Numbers from the full 24-case runs (no invented values):

| Approach | macro-F1 | matched verdict acc. | end-to-end acc. | case exact-match | citation validity | latency p50 / p95 | tokens in / out per case | Report |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| baseline | 0.192 | 0.344 | 0.200 | 4.2% | 1.000 | 0 / 1 ms | 0 / 0 | [md](results/baseline-20261021-224717.md) · [json](results/baseline-20261021-224717.json) |
| minimal (DeepSeek) | 0.922 | 0.980 | 0.909 | 83.3% | 1.000 | 1227 / 1600 ms | 229 / 165 | [md](results/minimal-20261021-224802.md) · [json](results/minimal-20261021-224802.json) |
| optimized | same as minimal; M6 not run yet | — | — | — | — | — | — | — |

Error analysis for minimal (decomposition vs verdict): see [`docs/iteration-log.md`](docs/iteration-log.md) → **Error analysis on v1.1 (minimal)**.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` / `pnpm start` | HTTP server |
| `pnpm eval -- --approach <name>` | Benchmark |
| `pnpm test` | Unit tests |
| `pnpm typecheck` | `tsc --noEmit` |

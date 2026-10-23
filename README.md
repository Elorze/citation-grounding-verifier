# Citation Grounding & Faithfulness Verifier

[![CI](https://github.com/Elorze/citation-grounding-verifier/actions/workflows/ci.yml/badge.svg)](https://github.com/Elorze/citation-grounding-verifier/actions/workflows/ci.yml)

HTTP service that splits an LLM answer into atomic claims, checks each against source passages (`SUPPORTED` / `CONTRADICTED` / `UNSUPPORTED`), and attaches **verbatim** citations. Benchmarks three required approaches: non-LLM **baseline**, **minimal** LLM, and **optimized** LLM (best prompt after eval-driven hill-climbing).

## Quick start

```bash
pnpm i
cp .env.example .env   # set LLM_API_KEY (and optionally LLM_BASE_URL / LLM_MODEL)
pnpm dev               # http://localhost:3100
pnpm test
pnpm eval -- --approach baseline --dataset eval/1-1.jsonl
pnpm eval -- --approach minimal --dataset eval/1-1.jsonl
pnpm eval -- --approach optimized --dataset eval/1-1.jsonl
# held-out hard split (20 cases):
pnpm eval -- --approach optimized --dataset eval/2-4.jsonl --repeat 3
```

### Reading order

1. **README** (this report) — three-way scores + [Design decisions](#design-decisions) + [Limitations](#limitations) / [Reproduce](#reproduce)
2. **`src/validate.ts` + `src/verifiers/`** — citation invariants + prompts
3. **[`docs/iteration-log.md`](docs/iteration-log.md)** — Scoreboard, Why prompt8, [Architecture trade-off](docs/iteration-log.md#architecture-trade-off)
4. **[`docs/annotation-protocol.md`](docs/annotation-protocol.md)** — how gold claims were labeled
5. **[`docs/confirmation-report.md`](docs/confirmation-report.md)** — blind confirmation (analysis only)

Provider used for reported numbers: **DeepSeek `deepseek-chat`** (`LLM_THINKING=disabled`, `LLM_TEMPERATURE=0.1`). OpenAI-compatible client; legacy `ZHIPU_API_KEY` still works if `LLM_API_KEY` is unset.

```bash
curl -s -X POST "http://localhost:3100/verify?approach=optimized" \
  -H "Content-Type: application/json" \
  --data-binary @sample.json
```

## Approaches

| Name | Description |
| --- | --- |
| `baseline` | Sentence split + BM25 + coverage / number / negation heuristics (**no** LLM) |
| `minimal` | Single LLM call with the assignment’s **minimal** system prompt + Zod parse + citation validate/retry/repair |
| `optimized` | **Same stack as minimal**, but the system prompt is the best hill-climbed version (**prompt8**: facts→claims, from–to as one detail, condition handling, relation-only claims, coref; worked example with fictional entities). Alias of `prompt8` in code; full EN+CN text: [`docs/prompts/prompt8.md`](docs/prompts/prompt8.md) |
| `stub` | Fixed response for wiring tests |

Ablation aliases used during climbing (`wording`, `prompt5`…`prompt8`) remain registered for reproduction; the assignment’s public three-way comparison is **baseline / minimal / optimized**.

## Design notes

- **Structured output is not trusted.** Path: `generateText` → extract JSON → Zod (`LlmOutput`; optional `facts` scratchpad discarded) → enforce quote/index invariants in `src/validate.ts` with retry/repair.
- **Empty context** → every claim forced to `UNSUPPORTED` with `[]` citations.
- **Empty / non-factual answer** → `{ "claims": [] }`.
- Eval runs **in-process** (no HTTP), sequentially; optional `EVAL_DELAY_MS` for rate limits.

## Design decisions

Same rationale as [`docs/iteration-log.md`](docs/iteration-log.md) § Architecture trade-off. Numbers below match existing result files; no multi-stage verifier was implemented.

### Architecture: single-pass vs multi-stage

Early on I weighed multi-stage pipelines (separate calls for draft facts / verdicts / repair) against one structured **single-pass** call.

- Multi-stage can help on very long, multi-hop answers by splitting attention, but cost and latency scale roughly with the number of calls, and errors compound across stages.
- This take-home prioritizes a reproducible, comparable verifier for RAG-style checks, not a production orchestrator. I therefore pushed the **single-pass** ceiling: a `facts` scratchpad in the prompt, anti-over-split rules (including from–to as one detail), and Zod + citation repair after the model returns.
- Measured single-call latency on our evals is on the order of **~1–2s p50** (e.g. minimal on 1-1 ≈ 1.2s; optimized on 2-4 run 1 ≈ 1.6s — see result tables). I did **not** implement a multi-stage baseline in-repo; the trade-off is reasoned, not A/B’d against a half-finished pipeline.
- Shipped point estimates: held-out `2-4` optimized macro-F1 **0.967**; blind `3-confirmation` optimized e2e **0.978**. Freeze = prompt8; no prompt9; confirmation does not rename the ship decision.

### Eval design: controlled splits vs dumping public benchmarks as gold

Public suites (e.g. RAGTruth) are useful for **failure taxonomies**, but gold granularity differs across papers—blind-scoring a whole dump can measure annotation mismatch more than system quality.

Controlled ladder instead:

1. Dev `eval/1-1.jsonl` (24) — prompt2…prompt8 hill-climb
2. Held-out `eval/2-4.jsonl` (20) — generalization + paired bootstrap (B=10000, seed 42)
3. Blind `eval/3-confirmation.jsonl` (20; real tech-doc excerpts; sha256 in the Datasets table) — freeze-then-check only

Hard-set cases may carry RAGTruth/FRANK-style taxonomy **labels**; we do not treat an external corpus wholesale as our gold.

## Datasets

| File | Role | sha256 (frozen content) |
| --- | --- | --- |
| `eval/1-1.jsonl` | 24-case **dev** set (v1.1); primary tuning surface | `0fb59a7e9172adc421c0e75365e785492ba5e4066a0703df46a90fc82007cf46` |
| `eval/2-4.jsonl` | 20-case **held-out** hard split (groups T1/T2/T3/general) | `4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684` |
| `eval/3-confirmation.jsonl` | 20-case **blind confirmation** after prompt8 freeze (do not retune); [`confirmation-report`](docs/confirmation-report.md) | `1fa1ea8c976265df8c4687e3664c14d75d399af5ac948f0628b77b9d605efb2c` |
| `eval/cases_test.jsonl` | Earlier freeze of a hard split (related content) | `c83ab8c18eb70e1b8943ef8430294078ffe614d5543b7d32673cb66631463a58` |

Gold quotes are verbatim substrings. Labeling protocol: [`docs/annotation-protocol.md`](docs/annotation-protocol.md). Human-readable case cards: [`示范用例库.md`](示范用例库.md).

## Metrics

Claim matching: Jaccard over hybrid tokens (Latin words + CJK bigrams) + containment boost, greedy 1:1, threshold **0.5**. Headline: **macro-F1** over S/C/U. Also report end-to-end accuracy (correct verdicts / gold claims), latency, and tokens. See `eval/metrics.ts`. Limitation: differently split / paraphrased claims may fail to match even when the idea is right.

---

## Evaluation report

### Quality (headline)

**Dev `1-1.jsonl` (24 cases, 1 run)** — numbers from result files (not hand-edited):

| Approach | macro-F1 | matched verdict acc. | end-to-end | case exact | Report |
| --- | ---: | ---: | ---: | ---: | --- |
| baseline | 0.192 | 0.344 | 0.200 | 4.2% | [md](results/baseline-20261021-224717.md) |
| minimal | 0.922 | 0.980 | 0.909 | 83.3% | [md](results/minimal-20261021-224802.md) |
| optimized (=prompt8) | **1.000** | 1.000 | 1.000 | 100% | [md](results/8-prompt8-1-1.md) |

**Held-out `2-4.jsonl` (20 cases)** — baseline ×1; LLM means over 3 runs where available:

| Approach | macro-F1 | end-to-end | Notes | Report |
| --- | ---: | ---: | --- | --- |
| baseline | 0.253 | 0.192 | lexical; weak on CONTRADICTED | [md](results/4-baseline.md) |
| minimal (related hard freeze) | 0.913 | 0.872 | single run on `cases_test.jsonl` | [md](results/minimal-20261022-144812.md) |
| optimized (=prompt8) | **0.967** mean (0.963–0.972) | **0.940** mean | 3 runs | [md](results/8-prompt8.md) |

Paired bootstrap on `2-4` (10000 resamples, seed 42): optimized/prompt8 vs wording-only (prompt2) and vs prompt5 — macro-F1 CI **excludes 0**; vs early M6a-style prompt3 / intermediate prompt6–7 — directionally better, not always significant at n=20. Details: `docs/8-conclusion.md`, `docs/iteration-log.md`.

**Blind confirmation `3-confirmation.jsonl`** (frozen sha256 `1fa1ea8c…`; analysis only, no prompt retune): baseline macro-F1 **0.425**; minimal **0.943** mean; optimized **0.932** mean / e2e **0.978** mean (3 runs). Appendix prompt6 ×3 is **slightly higher** than optimized on macro-F1 / e2e (**not significant**); we **do not** swap `optimized` to prompt6. Full tables: [`docs/confirmation-report.md`](docs/confirmation-report.md).

### Latency / cost (same model)

| Approach | Dataset | latency p50 / p95 | tokens in / out per case | LLM calls / case |
| --- | --- | ---: | ---: | ---: |
| baseline | 1-1 / 2-4 | ~0–14 ms | 0 / 0 | 0 |
| minimal | 1-1 | 1227 / 1600 ms | 229 / 165 | 1.00 |
| optimized | 2-4 (run 1) | 1559 / 1936 ms | 998 / 389 | 1.00 |

Optimized spends more **input** tokens (longer system prompt + example) for higher quality; still **one** LLM call per case (same as minimal). No second-pass / multi-agent pipeline in the shipped optimized path.

### Key failure modes

| Approach | Typical failures |
| --- | --- |
| **baseline** | Misses most CONTRADICTED; fuses compound claims; BM25 coverage ≠ grounding |
| **minimal** | On dev: fused compounds (e.g. year+founder), facts buried in *with* / *for* modifiers dropped, long-answer under-split (see `docs/iteration-log.md` error analysis) |
| **optimized** | On hard `2-4`, remaining misses concentrate on hard relation/order cases and occasional under-split modifiers (unstable across runs: hard_004, hard_014, hard_020). General group often exact |

### Eval-driven hill-climbing (minimal → optimized)

Causal chain (short):

- Minimal errors on 1-1 were mostly **fused/missed claims** (decomposition), not wrong verdicts once matched → atomic-split and later rule patches.
- **prompt7** raised run-to-run variance on 2-4 → **prompt8** leaner example, best 2-4 mean macro-F1 → freeze.
- **Confirmation:** optimized macro-F1 slightly under minimal/prompt6 (**n.s.**) but e2e higher vs minimal (**significant**); ship stays prompt8; no retune from the blind set.

One change class at a time; keep if quality improves (or holds while cost drops). Intermediate prompts (`prompt2`…`prompt7`) are in the iteration-log Scoreboard only—not in the main quality table above. Full tables: [`docs/iteration-log.md`](docs/iteration-log.md).

| Split | baseline | minimal | optimized (=prompt8) |
| --- | ---: | ---: | ---: |
| 1-1 macro-F1 | 0.192 | 0.922 | 1.000 |
| 2-4 macro-F1 (mean) | 0.253 | — (related hard freeze 0.913; prompt2 on 2-4 → iteration-log) | **0.967** |
| 3-confirmation macro-F1 (mean) | 0.425 | 0.943 | 0.932 |

1. **minimal** — assignment short prompt; validate/retry/repair only.
2. **M6a / early optimized** — atomic-split rules (compound / and / by–in); cleared fused/missed failures on `1-1` (macro-F1 → 1.000 on that set).
3. **Held-out hard set** (`2-4`) — M6a alone did not fully generalize; wording-only ablation (prompt2) ≈ M6a on aggregate.
4. **prompt5–8** — facts→claims + worked example; patches for from–to, conditions, relation-only claims, coref; removed topic-word leakage; stopped when gains plateaued.
5. **Ship `optimized` = prompt8** — (1) freeze before confirmation, not by blind-set rank; (2) best 2-4 mean macro-F1 **0.967** (tight range; significant vs prompt2/5); (3) confirmation dip vs prompt6 is small and **n.s.**—no rename; (4) fuller rules + leaner example than prompt6, stabler than prompt7. No prompt9. Confirmation caveat: [`docs/confirmation-report.md`](docs/confirmation-report.md).

**Full climb tables + freeze rationale → [`docs/iteration-log.md`](docs/iteration-log.md) § Scoreboard.** Confirmation caveat → [`docs/confirmation-report.md`](docs/confirmation-report.md).

## Limitations

- Held-out `2-4` and blind `3-confirmation` are **n=20** each; paired bootstrap CIs often include 0 — expected at this size. We report CIs, not only point estimates.
- Gold is **single-annotator** (author); some cases were AI-assisted drafts then edited — see [`docs/annotation-protocol.md`](docs/annotation-protocol.md). No second-annotator agreement.
- Claim matching is Jaccard ≥ 0.5 (+ containment); near-paraphrase splits can show as MISSED+EXTRA even when the idea is right (`eval/metrics.ts`).
- The multi-stage architecture trade-off is **reasoned**, not A/B’d in-repo (no multi-stage verifier shipped).
- Confirmation uses real tech-doc excerpts (SQLite / Postgres / Redis / Git / Docker / MDN-style) but remains a small blind check — not a claim of industrial-scale generalization.
- Dev `1-1` can saturate (optimized macro-F1 **1.000**); do not over-read perfect scores on the tuning surface.

## Reproduce

- **Model:** DeepSeek `deepseek-chat`, `LLM_THINKING=disabled`, `LLM_TEMPERATURE=0.1`
- **Bootstrap:** B=10000, seed 42 (`eval/bootstrap.ts`)
- **Datasets + sha256:** table under [Datasets](#datasets)
- **Main commands:** `pnpm test`, `pnpm typecheck`, `pnpm eval -- --approach optimized --dataset eval/2-4.jsonl --repeat 3`
- **HTTP:** `GET /healthz`; `POST /verify?approach=optimized&debug=1` returns `request_id` and optional `stats` (tokens only when `debug=1`)
- **CI** (`.github/workflows/ci.yml`): typecheck + test + stub `pnpm eval` — **no** live LLM eval / no API key

---

## Scripts

CI runs `pnpm typecheck`, `pnpm test`, and stub `pnpm eval` on push/PR (no live LLM / no API key).

| Script | Purpose |
| --- | --- |
| `pnpm dev` / `pnpm start` | HTTP server (`/health`, `/healthz`, `/verify?debug=1`) |
| `pnpm eval -- --approach <name> [--dataset …] [--repeat N]` | Benchmark |
| `pnpm test` | Unit tests |
| `pnpm typecheck` | `tsc --noEmit` |

Statistical helpers: `pnpm tsx eval/bootstrap.ts …`, `pnpm tsx eval/byGroup.ts …`.

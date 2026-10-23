# Citation Grounding & Faithfulness Verifier

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

1. **README** (this report) — three-way scores + design
2. **`src/validate.ts` + `src/verifiers/`** — citation invariants + prompts
3. **[`docs/iteration-log.md`](docs/iteration-log.md)** — Scoreboard + climb details
4. **[`docs/confirmation-report.md`](docs/confirmation-report.md)** — blind confirmation (analysis only)

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

## Datasets

| File | Role |
| --- | --- |
| `eval/1-1.jsonl` | 24-case **dev** set (v1.1); primary tuning surface |
| `eval/2-4.jsonl` | 20-case **held-out** hard split (groups T1/T2/T3/general); used to check generalization |
| `eval/3-confirmation.jsonl` | 20-case **blind confirmation** set after prompt8 freeze (do not retune on it); see [`docs/confirmation-report.md`](docs/confirmation-report.md) |
| `eval/cases_test.jsonl` | Earlier freeze of a hard split (related content) |

Gold quotes are verbatim substrings. Labeling notes: `示范用例库.md`.

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

One change class at a time; keep if quality improves (or holds while cost drops). Intermediate prompts (`prompt2`…`prompt7`) are in the iteration-log Scoreboard only—not in the main quality table above.

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

---

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` / `pnpm start` | HTTP server |
| `pnpm eval -- --approach <name> [--dataset …] [--repeat N]` | Benchmark |
| `pnpm test` | Unit tests |
| `pnpm typecheck` | `tsc --noEmit` |

Statistical helpers: `pnpm tsx eval/bootstrap.ts …`, `pnpm tsx eval/byGroup.ts …`.

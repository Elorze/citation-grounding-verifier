# Confirmation blind set (post–prompt8 freeze)

**Purpose:** Score frozen approaches on a held-out confirmation hard set. **No prompt / repair / prompt9 changes** from these results.

| Field | Value |
| --- | --- |
| Dataset | [`eval/3-confirmation.jsonl`](../eval/3-confirmation.jsonl) |
| Cases | 20 (`conf_001`…) |
| SHA256 | `1fa1ea8c976265df8c4687e3664c14d75d399af5ac948f0628b77b9d605efb2c` |
| Freeze note | [`confirmation-freeze.md`](confirmation-freeze.md) |
| Config | DeepSeek `deepseek-chat`, thinking off, T=0.1 (same as `2-4`) |
| Protocol | baseline ×1; `minimal` / `optimized` / `prompt6` ×3 + paired bootstrap (B=10000, seed 42); prompt6 is appendix-only |

`optimized` = prompt8 (alias). Gold was not edited after hashing.

---

## 1. Main comparison (README three-way)

| Approach | macro-F1 | end-to-end | Protocol | Artifact |
| --- | ---: | ---: | --- | --- |
| baseline | **0.425** | 0.442 | ×1 | [`c-baseline.md`](../results/c-baseline.md) |
| minimal | **0.943** mean (0.939–0.945) | 0.896 mean (0.883–0.909) | ×3 | [`c-minimal.md`](../results/c-minimal.md) |
| optimized (=prompt8) | **0.932** mean (0.922–0.950) | **0.978** mean (0.974–0.987) | ×3 | [`c-optimized.md`](../results/c-optimized.md) |

### vs `2-4` (context only; different gold)

| Split | baseline F1 | minimal F1 | optimized F1 |
| --- | ---: | ---: | ---: |
| hard `2-4` | 0.253 | ~0.91 (related freeze) | **0.967** mean |
| confirmation | 0.425 | **0.943** mean | 0.932 mean |

On confirmation, **minimal leads macro-F1**; **optimized leads end-to-end**. Ranking differs from the climb set — expected for a blind split; not used to re-open the prompt.

### Paired bootstrap: minimal vs optimized

Source: [`c-bootstrap-minimal-vs-optimized.md`](../results/c-bootstrap-minimal-vs-optimized.md). Diff = optimized − minimal.

| Metric | minimal | optimized | diff | 95% CI | note |
| --- | ---: | ---: | ---: | --- | --- |
| macro-F1 | 0.943 | 0.932 | **−0.011** ↓ | [−0.068, 0.019] | CI includes 0 (n.s.) |
| end-to-end | 0.896 | 0.978 | **+0.082** ↑ | **[0.018, 0.149]** | CI excludes 0 |

Unstable (gold-claim outcomes differ across 3 runs): minimal — `conf_005`, `conf_017`; optimized — `conf_019`.

**Readout:** Confirmation does **not** show a significant macro-F1 win for optimized over minimal; it **does** show a significant e2e lift. No SYSTEM change from this.

---

## 2. Appendix: prompt6 vs optimized (freeze vs mid-climb)

prompt6 re-run with **`--repeat 3`** (same protocol as minimal / optimized). Diff = optimized − prompt6. Arrows: **↑** better for optimized (=prompt8), **↓** worse.

| Metric | prompt6 (×3) | optimized (=prompt8, ×3) | Δ | |
| --- | ---: | ---: | ---: | --- |
| macro-F1 | **0.942** mean (0.940–0.943) | 0.932 mean (0.922–0.950) | **−0.010** | **↓** |
| end-to-end | **0.983** mean (0.974–0.987) | 0.978 mean (0.974–0.987) | **−0.004** | **↓** |

Per-run macro-F1 (prompt6): 0.943, 0.943, 0.940. Artifact: [`c-prompt6.md`](../results/c-prompt6.md).

### Paired bootstrap: prompt6 vs optimized

Source: [`c-bootstrap-prompt6-vs-optimized.md`](../results/c-bootstrap-prompt6-vs-optimized.md). B=10000, seed 42, 3/3 runs.

| Metric | prompt6 | optimized | diff (opt − p6) | 95% CI | note |
| --- | ---: | ---: | ---: | --- | --- |
| macro-F1 | 0.942 | 0.932 | **−0.010** ↓ | [−0.063, 0.018] | CI includes 0 (n.s.) |
| end-to-end | 0.983 | 0.978 | **−0.004** ↓ | [−0.027, 0.012] | CI includes 0 (n.s.) |

Unstable: prompt6 — `conf_005`; optimized — `conf_019`.

### Paired bootstrap: minimal vs prompt6 (optional)

Source: [`c-bootstrap-minimal-vs-prompt6.md`](../results/c-bootstrap-minimal-vs-prompt6.md). Diff = prompt6 − minimal.

| Metric | minimal | prompt6 | diff | 95% CI | note |
| --- | ---: | ---: | ---: | --- | --- |
| macro-F1 | 0.943 | 0.942 | **−0.001** | [−0.018, 0.013] | n.s. (≈ flat) |
| end-to-end | 0.896 | 0.983 | **+0.087** ↑ | **[0.029, 0.148]** | CI excludes 0 |

**Readout:** With matched ×3 protocol, frozen prompt8 remains **directionally slightly below** mid-climb prompt6 on confirmation (macro **↓**, e2e **↓**); both gaps **not significant**. prompt6 ≈ minimal on macro-F1, but **significantly better** e2e (same pattern as optimized vs minimal). Still **analysis-only** — do not reopen climb or swap `optimized` to prompt6.

---

## 3. Latency / cost (run-1 headlines)

| Approach | latency p50 / p95 | tokens in / out per case | LLM calls |
| --- | ---: | ---: | ---: |
| baseline | 0 / 1 ms | 0 / 0 | 0 |
| minimal | 1728 / 2067 ms | 366 / 381 | 1.00 |
| optimized | 1878 / 2295 ms | 1096 / 486 | 1.00 |
| prompt6 (×3 run 1) | 1777 / 2197 ms | 823 / 449 | 1.00 |

---

## 4. Decision

- Keep **`optimized` = prompt8**. Selection is the **held-out `2-4` climb freeze** (best mean macro-F1 among single-call prompts tried)—**not** whichever approach scores highest on confirmation.
- On confirmation: vs **minimal**, macro-F1 is slightly lower (bootstrap **n.s.**) while e2e is **significantly higher**; vs appendix **prompt6** (×3), macro-F1 and e2e are directionally slightly lower (**both n.s.**).
- Therefore: do **not** rename `optimized` back to prompt6, do **not** open prompt9, do **not** edit SYSTEM / repair from this split. Confirmation is **analysis / generalization caveat** only.

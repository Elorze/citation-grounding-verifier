# Confirmation blind set (post–prompt8 freeze)

**Purpose:** Score frozen approaches on a held-out confirmation hard set. **No prompt / repair / prompt9 changes** from these results.

| Field | Value |
| --- | --- |
| Dataset | [`eval/3-confirmation.jsonl`](../eval/3-confirmation.jsonl) |
| Cases | 20 (`conf_001`…) |
| SHA256 | `1fa1ea8c976265df8c4687e3664c14d75d399af5ac948f0628b77b9d605efb2c` |
| Freeze note | [`confirmation-freeze.md`](confirmation-freeze.md) |
| Config | DeepSeek `deepseek-chat`, thinking off, T=0.1 (same as `2-4`) |
| Protocol | baseline ×1; `minimal` / `optimized` ×3 + paired bootstrap (B=10000, seed 42); `prompt6` ×1 appendix only |

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

Single-run prompt6 vs optimized (3-run mean). Diff = optimized − prompt6. Arrows: **↑** better for optimized, **↓** worse.

| Metric | prompt6 (×1) | optimized (=prompt8, ×3 mean) | Δ | |
| --- | ---: | ---: | ---: | --- |
| macro-F1 | **0.948** | 0.932 | **−0.016** | **↓** |
| end-to-end | **0.987** | 0.978 | **−0.009** | **↓** |

Artifact: [`c-prompt6.md`](../results/c-prompt6.md). Bootstrap: [`c-bootstrap-prompt6-vs-optimized.md`](../results/c-bootstrap-prompt6-vs-optimized.md).

| Metric | diff (opt − p6) | 95% CI | note |
| --- | ---: | --- | --- |
| macro-F1 | −0.016 ↓ | [−0.068, 0.007] | includes 0 (n.s.); prompt6 single-run |
| end-to-end | −0.009 ↓ | [−0.028, 0.000] | touches 0 |

**Readout:** Relative to mid-climb prompt6, frozen prompt8 is **directionally slightly lower** on both headline metrics on this blind set (↓ / ↓). Drop is **not** significant at n=20 (and prompt6 was only one run). Treat as a **variance / generalization caveat**, not a reason to reopen the climb or ship prompt6 instead.

---

## 3. Latency / cost (run-1 headlines)

| Approach | latency p50 / p95 | tokens in / out per case | LLM calls |
| --- | ---: | ---: | ---: |
| baseline | 0 / 1 ms | 0 / 0 | 0 |
| minimal | 1728 / 2067 ms | 366 / 381 | 1.00 |
| optimized | 1878 / 2295 ms | 1096 / 486 | 1.00 |
| prompt6 | 1689 / 2141 ms | 823 / 436 | 1.00 |

---

## 4. Decision

- Keep **`optimized` = prompt8** as the shipped approach (assignment + prior `2-4` best mean).
- Confirmation is **analysis-only**: scores recorded; **no** prompt9, **no** SYSTEM / repair edits from failure cases.
- Document the blind-set nuance: on confirmation, minimal ≈ / slightly above optimized on macro-F1; optimized clearly better on e2e.

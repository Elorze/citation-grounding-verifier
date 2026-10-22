# Eval: minimal
Label: confirmation minimal

## Config
```json
{
  "approach": "minimal",
  "label": "confirmation minimal",
  "model": "deepseek-chat",
  "thinking": "disabled",
  "temperature": 0.1,
  "matchThreshold": 0.5,
  "gitCommit": "3e01b80",
  "caseCount": 20,
  "dataset": "eval/3-confirmation.jsonl",
  "datasetSha256": "1fa1ea8c976265df8c4687e3664c14d75d399af5ac948f0628b77b9d605efb2c"
}
```

Dataset: `eval/3-confirmation.jsonl` (sha256 `1fa1ea8c976265df8c4687e3664c14d75d399af5ac948f0628b77b9d605efb2c`)

## Repeat summary
- runs: 3 (macro-F1 per run: 0.945, 0.939, 0.945)
- macro-F1 mean / min–max: **0.943** / 0.939–0.945
- end-to-end mean / min–max: 0.896 / 0.883–0.909

## Headline (run 1)
- macro-F1: **0.945**
- verdict accuracy (matched): 0.986
- end-to-end accuracy: 0.896
- case exact-match: 65.0%
- claim-count exact: 70.0% (mean |Δ|=0.35)
- citation validity raw: 1.000; final: 1.000
- citation agreement: 1.000
- latency p50/p95: 1728 / 2067 ms
- tokens in/out per case: 366 / 381
- LLM calls per case: 1.00

## Per-class F1
- SUPPORTED: P=1.000 R=0.862 F1=0.926 (support=58)
- CONTRADICTED: P=1.000 R=1.000 F1=1.000 (support=14)
- UNSUPPORTED: P=0.833 R=1.000 F1=0.909 (support=5)

## Confusion matrix
| gold \ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |
| --- | ---: | ---: | ---: | ---: |
| SUPPORTED | 50 | 0 | 1 | 7 |
| CONTRADICTED | 0 | 14 | 0 | 0 |
| UNSUPPORTED | 0 | 0 | 5 | 0 |
| (extra) | 0 | 0 | 0 | 0 |

## Failures
- **conf_003** (subtle_distortion): MISSED gold=SUPPORTED "There is a window for data loss if the primary fails under file-based log shipping."
- **conf_005** (extrinsic_hallucination): MISSED gold=SUPPORTED "WAL requires processes to share memory on the same host."
- **conf_006** (extrinsic_hallucination): MISSED gold=SUPPORTED "The maximum restart delay is 1 minute."
- **conf_012** (multi_passage): gold=SUPPORTED pred=UNSUPPORTED | gold="git rebase --onto master next topic transplants topic as if it forked from master instead of next." | pred="git rebase --onto master next topic transplants topic as if it forked from master instead of next." | reasoning="The context passages mention the command but do not describe its effect in terms of transplanting topic as if it forked from master instead of next."
- **conf_014** (subtle_distortion): MISSED gold=SUPPORTED "Replaying commits in rebase is similar to running git cherry-pick for each commit."
- **conf_017** (mixed): MISSED gold=SUPPORTED "s-maxage overrides max-age for shared caches."
- **conf_020** (supported): MISSED gold=SUPPORTED "Earlier names in the FIRST list have higher priority."
- **conf_020** (supported): MISSED gold=SUPPORTED "With FIRST 2 (s1, s2, s3), s1 and s2 are synchronous standbys."

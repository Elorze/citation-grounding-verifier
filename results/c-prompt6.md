# Eval: prompt6
Label: confirmation prompt6 (appendix)

## Config
```json
{
  "approach": "prompt6",
  "label": "confirmation prompt6 (appendix)",
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

## Headline
- macro-F1: **0.948**
- verdict accuracy (matched): 0.987
- end-to-end accuracy: 0.987
- case exact-match: 70.0%
- claim-count exact: 75.0% (mean |Δ|=0.35)
- citation validity raw: 1.000; final: 1.000
- citation agreement: 0.986
- latency p50/p95: 1689 / 2141 ms
- tokens in/out per case: 823 / 436
- LLM calls per case: 1.00

## Per-class F1
- SUPPORTED: P=0.891 R=0.983 F1=0.934 (support=58)
- CONTRADICTED: P=1.000 R=1.000 F1=1.000 (support=14)
- UNSUPPORTED: P=0.833 R=1.000 F1=0.909 (support=5)

## Confusion matrix
| gold \ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |
| --- | ---: | ---: | ---: | ---: |
| SUPPORTED | 57 | 0 | 1 | 0 |
| CONTRADICTED | 0 | 14 | 0 | 0 |
| UNSUPPORTED | 0 | 0 | 5 | 0 |
| (extra) | 7 | 0 | 0 | 0 |

## Failures
- **conf_005** (extrinsic_hallucination): EXTRA pred=SUPPORTED "WAL does not work over a network filesystem because processes must share memory on the same host."
- **conf_006** (extrinsic_hallucination): EXTRA pred=SUPPORTED "With the no restart policy, the container is not restarted automatically."
- **conf_006** (extrinsic_hallucination): EXTRA pred=SUPPORTED "The restart backoff doubles each time."
- **conf_012** (multi_passage): gold=SUPPORTED pred=UNSUPPORTED | gold="git rebase --onto master next topic transplants topic as if it forked from master instead of next." | pred="git rebase --onto master next topic transplants topic as if it forked from master instead of next." | reasoning="The passages give the command git rebase --onto master next topic but do not state that it transplants topic as if it forked from master instead of next."
- **conf_014** (subtle_distortion): EXTRA pred=SUPPORTED "git rebase then replays commits one by one in order"
- **conf_019** (mixed): EXTRA pred=SUPPORTED "Beginning with version 3.22.0, a read-only WAL-mode database can be opened if the database is immutable."
- **conf_020** (supported): EXTRA pred=SUPPORTED "s4 is asynchronous because it is not in the list."
- **conf_020** (supported): EXTRA pred=SUPPORTED "ANY waits for at least the requested number of listed standbys."

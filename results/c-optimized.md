# Eval: optimized
Label: confirmation optimized=prompt8

## Config
```json
{
  "approach": "optimized",
  "label": "confirmation optimized=prompt8",
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
- runs: 3 (macro-F1 per run: 0.922, 0.950, 0.922)
- macro-F1 mean / min–max: **0.932** / 0.922–0.950
- end-to-end mean / min–max: 0.978 / 0.974–0.987

## Headline (run 1)
- macro-F1: **0.922**
- verdict accuracy (matched): 0.974
- end-to-end accuracy: 0.974
- case exact-match: 70.0%
- claim-count exact: 75.0% (mean |Δ|=0.30)
- citation validity raw: 1.000; final: 1.000
- citation agreement: 0.986
- latency p50/p95: 1878 / 2295 ms
- tokens in/out per case: 1096 / 486
- LLM calls per case: 1.00

## Per-class F1
- SUPPORTED: P=0.903 R=0.966 F1=0.933 (support=58)
- CONTRADICTED: P=1.000 R=1.000 F1=1.000 (support=14)
- UNSUPPORTED: P=0.714 R=1.000 F1=0.833 (support=5)

## Confusion matrix
| gold \ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |
| --- | ---: | ---: | ---: | ---: |
| SUPPORTED | 56 | 0 | 2 | 0 |
| CONTRADICTED | 0 | 14 | 0 | 0 |
| UNSUPPORTED | 0 | 0 | 5 | 0 |
| (extra) | 6 | 0 | 0 | 0 |

## Failures
- **conf_005** (extrinsic_hallucination): EXTRA pred=SUPPORTED "WAL does not work over a network filesystem because processes must share memory on the same host."
- **conf_006** (extrinsic_hallucination): EXTRA pred=SUPPORTED "With the no restart policy, the container is not restarted automatically."
- **conf_006** (extrinsic_hallucination): EXTRA pred=SUPPORTED "The restart backoff doubles each time."
- **conf_012** (multi_passage): gold=SUPPORTED pred=UNSUPPORTED | gold="git rebase --onto master next topic transplants topic as if it forked from master instead of next." | pred="git rebase --onto master next topic transplants topic as if it forked from master instead of next." | reasoning="The passages mention the command git rebase --onto master next topic but do not state that it transplants topic as if it forked from master instead of next."
- **conf_014** (subtle_distortion): EXTRA pred=SUPPORTED "git rebase replays commits one by one in order."
- **conf_019** (mixed): gold=SUPPORTED pred=UNSUPPORTED | gold="Older SQLite builds could not open read-only WAL databases." | pred="Older SQLite builds could not open read-only WAL databases." | reasoning="The passages do not mention 'older SQLite builds' or any version-based distinction about older builds being unable to open read-only WAL databases; passage [1] only describes the general rule and the exception beginning with version 3.22.0."
- **conf_019** (mixed): EXTRA pred=SUPPORTED "Beginning with version 3.22.0, a read-only WAL-mode database can be opened if the database is immutable."
- **conf_020** (supported): EXTRA pred=SUPPORTED "ANY waits for at least the requested number of listed standbys."

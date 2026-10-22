# Eval: prompt5
Label: prompt5 on 1-1

## Config
```json
{
  "approach": "prompt5",
  "label": "prompt5 on 1-1",
  "model": "deepseek-chat",
  "thinking": "disabled",
  "temperature": 0.1,
  "matchThreshold": 0.5,
  "gitCommit": "b3f49cc",
  "caseCount": 24,
  "dataset": "eval/1-1.jsonl",
  "datasetSha256": "0fb59a7e9172adc421c0e75365e785492ba5e4066a0703df46a90fc82007cf46"
}
```

Dataset: `eval/1-1.jsonl` (sha256 `0fb59a7e9172adc421c0e75365e785492ba5e4066a0703df46a90fc82007cf46`)

## Headline
- macro-F1: **0.961**
- verdict accuracy (matched): 1.000
- end-to-end accuracy: 0.982
- case exact-match: 91.7%
- claim-count exact: 95.8% (mean |Δ|=0.04)
- citation validity raw: 1.000; final: 1.000
- citation agreement: 1.000
- latency p50/p95: 1061 / 2429 ms
- tokens in/out per case: 488 / 218
- LLM calls per case: 1.00

## Per-class F1
- SUPPORTED: P=1.000 R=1.000 F1=1.000 (support=28)
- CONTRADICTED: P=0.938 R=1.000 F1=0.968 (support=15)
- UNSUPPORTED: P=0.917 R=0.917 F1=0.917 (support=12)

## Confusion matrix
| gold \ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |
| --- | ---: | ---: | ---: | ---: |
| SUPPORTED | 28 | 0 | 0 | 0 |
| CONTRADICTED | 0 | 15 | 0 | 0 |
| UNSUPPORTED | 0 | 0 | 11 | 1 |
| (extra) | 0 | 1 | 1 | 0 |

## Failures
- **case_010** (subtle_distortion): EXTRA pred=CONTRADICTED "Orders over $50 ship for free no matter where they are going."
- **case_011** (mixed): MISSED gold=UNSUPPORTED "The Juniper Street store's 20% sales rise in March was caused by the loyalty app."
- **case_011** (mixed): EXTRA pred=UNSUPPORTED "The sales rise at the Juniper Street store was because the store launched a loyalty app that month."

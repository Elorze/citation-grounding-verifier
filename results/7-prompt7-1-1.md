# Eval: prompt7
Label: prompt7 on 1-1

## Config
```json
{
  "approach": "prompt7",
  "label": "prompt7 on 1-1",
  "model": "deepseek-chat",
  "thinking": "disabled",
  "temperature": 0.1,
  "matchThreshold": 0.5,
  "gitCommit": "09f2fb1",
  "caseCount": 24,
  "dataset": "eval/1-1.jsonl",
  "datasetSha256": "0fb59a7e9172adc421c0e75365e785492ba5e4066a0703df46a90fc82007cf46"
}
```

Dataset: `eval/1-1.jsonl` (sha256 `0fb59a7e9172adc421c0e75365e785492ba5e4066a0703df46a90fc82007cf46`)

## Headline
- macro-F1: **1.000**
- verdict accuracy (matched): 1.000
- end-to-end accuracy: 1.000
- case exact-match: 100.0%
- claim-count exact: 100.0% (mean |Δ|=0.00)
- citation validity raw: 1.000; final: 1.000
- citation agreement: 1.000
- latency p50/p95: 1144 / 1482 ms
- tokens in/out per case: 1047 / 207
- LLM calls per case: 1.00

## Per-class F1
- SUPPORTED: P=1.000 R=1.000 F1=1.000 (support=28)
- CONTRADICTED: P=1.000 R=1.000 F1=1.000 (support=15)
- UNSUPPORTED: P=1.000 R=1.000 F1=1.000 (support=12)

## Confusion matrix
| gold \ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |
| --- | ---: | ---: | ---: | ---: |
| SUPPORTED | 28 | 0 | 0 | 0 |
| CONTRADICTED | 0 | 15 | 0 | 0 |
| UNSUPPORTED | 0 | 0 | 12 | 0 |
| (extra) | 0 | 0 | 0 | 0 |

## Failures
_none_

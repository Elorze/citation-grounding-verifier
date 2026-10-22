# Eval: prompt7
Label: prompt7

## Config
```json
{
  "approach": "prompt7",
  "label": "prompt7",
  "model": "deepseek-chat",
  "thinking": "disabled",
  "temperature": 0.1,
  "matchThreshold": 0.5,
  "gitCommit": "09f2fb1",
  "caseCount": 20,
  "dataset": "eval/2-4.jsonl",
  "datasetSha256": "4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684"
}
```

Dataset: `eval/2-4.jsonl` (sha256 `4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684`)

## Repeat summary
- runs: 3 (macro-F1 per run: 0.972, 0.936, 0.950)
- macro-F1 mean / min–max: **0.953** / 0.936–0.972
- end-to-end mean / min–max: 0.944 / 0.923–0.974

## Headline (run 1)
- macro-F1: **0.972**
- verdict accuracy (matched): 0.987
- end-to-end accuracy: 0.974
- case exact-match: 85.0%
- claim-count exact: 90.0% (mean |Δ|=0.10)
- citation validity raw: 1.000; final: 1.000
- citation agreement: 1.000
- latency p50/p95: 1666 / 2113 ms
- tokens in/out per case: 1086 / 392
- LLM calls per case: 1.00

## Per-class F1
- SUPPORTED: P=1.000 R=0.944 F1=0.971 (support=36)
- CONTRADICTED: P=1.000 R=1.000 F1=1.000 (support=25)
- UNSUPPORTED: P=0.895 R=1.000 F1=0.944 (support=17)

## Confusion matrix
| gold \ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |
| --- | ---: | ---: | ---: | ---: |
| SUPPORTED | 34 | 0 | 1 | 1 |
| CONTRADICTED | 0 | 25 | 0 | 0 |
| UNSUPPORTED | 0 | 0 | 17 | 0 |
| (extra) | 0 | 0 | 1 | 0 |

## Failures
- **hard_013** (multi_passage): gold=SUPPORTED pred=UNSUPPORTED | gold="The Brask Valley Marathon ends in Vessmark." | pred="The Brask Valley Marathon ends in Vessmark." | reasoning="The passages state the marathon finishes at Corlan Stadium, which is located in Vessmark, but do not explicitly state the marathon ends in Vessmark."
- **hard_015** (subtle_distortion): EXTRA pred=UNSUPPORTED "Most of the Fenlow test plots showed higher nitrogen after the cover crop was planted, so the cover crop raised soil nitrogen."
- **hard_016** (extrinsic_hallucination): MISSED gold=SUPPORTED "Marrowby Outfitters' best-selling product is a waxed canvas jacket."

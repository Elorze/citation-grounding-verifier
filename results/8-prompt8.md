# Eval: prompt8
Label: prompt8

## Config
```json
{
  "approach": "prompt8",
  "label": "prompt8",
  "model": "deepseek-chat",
  "thinking": "disabled",
  "temperature": 0.1,
  "matchThreshold": 0.5,
  "gitCommit": "766c99f",
  "caseCount": 20,
  "dataset": "eval/2-4.jsonl",
  "datasetSha256": "4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684"
}
```

Dataset: `eval/2-4.jsonl` (sha256 `4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684`)

## Repeat summary
- runs: 3 (macro-F1 per run: 0.972, 0.963, 0.967)
- macro-F1 mean / min–max: **0.967** / 0.963–0.972
- end-to-end mean / min–max: 0.940 / 0.936–0.949

## Headline (run 1)
- macro-F1: **0.972**
- verdict accuracy (matched): 0.987
- end-to-end accuracy: 0.949
- case exact-match: 85.0%
- claim-count exact: 85.0% (mean |Δ|=0.15)
- citation validity raw: 1.000; final: 1.000
- citation agreement: 1.000
- latency p50/p95: 1559 / 1936 ms
- tokens in/out per case: 998 / 389
- LLM calls per case: 1.00

## Per-class F1
- SUPPORTED: P=1.000 R=0.917 F1=0.957 (support=36)
- CONTRADICTED: P=0.960 R=0.960 F1=0.960 (support=25)
- UNSUPPORTED: P=1.000 R=1.000 F1=1.000 (support=17)

## Confusion matrix
| gold \ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |
| --- | ---: | ---: | ---: | ---: |
| SUPPORTED | 33 | 1 | 0 | 2 |
| CONTRADICTED | 0 | 24 | 0 | 1 |
| UNSUPPORTED | 0 | 0 | 17 | 0 |
| (extra) | 0 | 0 | 0 | 0 |

## Failures
- **hard_003** (mixed): gold=SUPPORTED pred=CONTRADICTED | gold="Midfielder Rafe Okonjo was sent off in the 70th minute." | pred="Both of Tomas Ilves's goals came after midfielder Rafe Okonjo was sent off in the 70th minute." | reasoning="Passage 1 says Ilves scored in the 12th and 38th minutes, while Okonjo was sent off in the 70th minute, so the goals came before the sending-off, not after."
- **hard_003** (mixed): MISSED gold=CONTRADICTED "Both of Tomas Ilves's goals came after Rafe Okonjo was sent off."
- **hard_004** (subtle_distortion): MISSED gold=SUPPORTED "Brightfold Paper Co.'s delivery times doubled from 2 to 4 days."
- **hard_016** (extrinsic_hallucination): MISSED gold=SUPPORTED "Marrowby Outfitters' best-selling product is a waxed canvas jacket."

# Eval: prompt6
Label: prompt6

## Config
```json
{
  "approach": "prompt6",
  "label": "prompt6",
  "model": "deepseek-chat",
  "thinking": "disabled",
  "temperature": 0.1,
  "matchThreshold": 0.5,
  "gitCommit": "6c45515",
  "caseCount": 20,
  "dataset": "eval/2-4.jsonl",
  "datasetSha256": "4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684"
}
```

Dataset: `eval/2-4.jsonl` (sha256 `4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684`)

## Repeat summary
- runs: 3 (macro-F1 per run: 0.963, 0.949, 0.953)
- macro-F1 mean / min–max: **0.955** / 0.949–0.963
- end-to-end mean / min–max: 0.944 / 0.936–0.949

## Headline (run 1)
- macro-F1: **0.963**
- verdict accuracy (matched): 0.986
- end-to-end accuracy: 0.936
- case exact-match: 75.0%
- claim-count exact: 75.0% (mean |Δ|=0.25)
- citation validity raw: 1.000; final: 1.000
- citation agreement: 1.000
- latency p50/p95: 1675 / 2166 ms
- tokens in/out per case: 725 / 387
- LLM calls per case: 1.00

## Per-class F1
- SUPPORTED: P=0.970 R=0.889 F1=0.928 (support=36)
- CONTRADICTED: P=0.960 R=0.960 F1=0.960 (support=25)
- UNSUPPORTED: P=1.000 R=1.000 F1=1.000 (support=17)

## Confusion matrix
| gold \ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |
| --- | ---: | ---: | ---: | ---: |
| SUPPORTED | 32 | 1 | 0 | 3 |
| CONTRADICTED | 0 | 24 | 0 | 1 |
| UNSUPPORTED | 0 | 0 | 17 | 0 |
| (extra) | 1 | 0 | 0 | 0 |

## Failures
- **hard_002** (mixed): MISSED gold=SUPPORTED "The Saltmarsh Charter was signed by Abbot Edric Vane."
- **hard_003** (mixed): gold=SUPPORTED pred=CONTRADICTED | gold="Midfielder Rafe Okonjo was sent off in the 70th minute." | pred="Both of Tomas Ilves's goals came after midfielder Rafe Okonjo was sent off in the 70th minute." | reasoning="Ilves scored in the 12th and 38th minutes, while Okonjo was sent off in the 70th minute, so the goals came before the sending-off."
- **hard_003** (mixed): MISSED gold=CONTRADICTED "Both of Tomas Ilves's goals came after Rafe Okonjo was sent off."
- **hard_004** (subtle_distortion): MISSED gold=SUPPORTED "Brightfold Paper Co.'s delivery times doubled from 2 to 4 days."
- **hard_011** (mixed): EXTRA pred=SUPPORTED "Cycling injuries in Elsby were 31 in 2025."
- **hard_016** (extrinsic_hallucination): MISSED gold=SUPPORTED "Marrowby Outfitters' best-selling product is a waxed canvas jacket."

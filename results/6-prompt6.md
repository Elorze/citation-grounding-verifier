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
  "gitCommit": "c60f761",
  "caseCount": 20,
  "dataset": "eval/2-4.jsonl",
  "datasetSha256": "4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684"
}
```

Dataset: `eval/2-4.jsonl` (sha256 `4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684`)

## Repeat summary
- runs: 3 (macro-F1 per run: 0.968, 0.963, 0.938)
- macro-F1 mean / min–max: **0.956** / 0.938–0.968
- end-to-end mean / min–max: 0.936 / 0.923–0.949

## Headline (run 1)
- macro-F1: **0.968**
- verdict accuracy (matched): 0.987
- end-to-end accuracy: 0.949
- case exact-match: 80.0%
- claim-count exact: 80.0% (mean |Δ|=0.20)
- citation validity raw: 1.000; final: 1.000
- citation agreement: 1.000
- latency p50/p95: 1559 / 2020 ms
- tokens in/out per case: 725 / 361
- LLM calls per case: 1.00

## Per-class F1
- SUPPORTED: P=0.971 R=0.917 F1=0.943 (support=36)
- CONTRADICTED: P=0.960 R=0.960 F1=0.960 (support=25)
- UNSUPPORTED: P=1.000 R=1.000 F1=1.000 (support=17)

## Confusion matrix
| gold \ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |
| --- | ---: | ---: | ---: | ---: |
| SUPPORTED | 33 | 1 | 0 | 2 |
| CONTRADICTED | 0 | 24 | 0 | 1 |
| UNSUPPORTED | 0 | 0 | 17 | 0 |
| (extra) | 1 | 0 | 0 | 0 |

## Failures
- **hard_002** (mixed): MISSED gold=SUPPORTED "The Saltmarsh Charter was signed by Abbot Edric Vane."
- **hard_003** (mixed): gold=SUPPORTED pred=CONTRADICTED | gold="Midfielder Rafe Okonjo was sent off in the 70th minute." | pred="Both of Tomas Ilves's goals came after midfielder Rafe Okonjo was sent off in the 70th minute." | reasoning="Ilves scored in the 12th and 38th minutes, while Okonjo was sent off in the 70th minute, so the goals came before the sending-off."
- **hard_003** (mixed): MISSED gold=CONTRADICTED "Both of Tomas Ilves's goals came after Rafe Okonjo was sent off."
- **hard_016** (extrinsic_hallucination): MISSED gold=SUPPORTED "Marrowby Outfitters' best-selling product is a waxed canvas jacket."
- **hard_017** (supported): EXTRA pred=SUPPORTED "The Ombra Ridge observatory opens to the public when the weather allows."

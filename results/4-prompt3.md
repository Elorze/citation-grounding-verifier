# Eval: optimized
Label: prompt3

## Config
```json
{
  "approach": "optimized",
  "label": "prompt3",
  "model": "deepseek-chat",
  "thinking": "disabled",
  "temperature": 0.1,
  "matchThreshold": 0.5,
  "gitCommit": "f30638f",
  "caseCount": 20,
  "dataset": "eval/2-4.jsonl",
  "datasetSha256": "4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684"
}
```

Dataset: `eval/2-4.jsonl` (sha256 `4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684`)

## Repeat summary
- runs: 3 (macro-F1 per run: 0.952, 0.947, 0.952)
- macro-F1 mean / min–max: **0.950** / 0.947–0.952
- end-to-end mean / min–max: 0.910 / 0.910–0.910

## Headline (run 1)
- macro-F1: **0.952**
- verdict accuracy (matched): 0.986
- end-to-end accuracy: 0.910
- case exact-match: 70.0%
- claim-count exact: 75.0% (mean |Δ|=0.25)
- citation validity raw: 1.000; final: 1.000
- citation agreement: 1.000
- latency p50/p95: 1757 / 2493 ms
- tokens in/out per case: 425 / 293
- LLM calls per case: 1.00

## Per-class F1
- SUPPORTED: P=0.968 R=0.833 F1=0.896 (support=36)
- CONTRADICTED: P=0.960 R=0.960 F1=0.960 (support=25)
- UNSUPPORTED: P=1.000 R=1.000 F1=1.000 (support=17)

## Confusion matrix
| gold \ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |
| --- | ---: | ---: | ---: | ---: |
| SUPPORTED | 30 | 1 | 0 | 5 |
| CONTRADICTED | 0 | 24 | 0 | 1 |
| UNSUPPORTED | 0 | 0 | 17 | 0 |
| (extra) | 1 | 0 | 0 | 0 |

## Failures
- **hard_002** (mixed): MISSED gold=SUPPORTED "The Saltmarsh Charter was signed by Abbot Edric Vane."
- **hard_003** (mixed): gold=SUPPORTED pred=CONTRADICTED | gold="Midfielder Rafe Okonjo was sent off in the 70th minute." | pred="Both of Tomas Ilves's goals came after midfielder Rafe Okonjo was sent off in the 70th minute." | reasoning="Passage 1 places Ilves's goals in the 12th and 38th minutes, before Okonjo's 70th-minute sending off."
- **hard_003** (mixed): MISSED gold=CONTRADICTED "Both of Tomas Ilves's goals came after Rafe Okonjo was sent off."
- **hard_014** (subtle_distortion): MISSED gold=SUPPORTED "The Kelby–Arnsford night bus leaves at 23:40."
- **hard_016** (extrinsic_hallucination): MISSED gold=SUPPORTED "Marrowby Outfitters' best-selling product is a waxed canvas jacket."
- **hard_018** (multi_passage): MISSED gold=SUPPORTED "A Tesk Valley Folk Festival day pass costs 35 euros."
- **hard_018** (multi_passage): EXTRA pred=SUPPORTED "According to the final program, a day pass costs 35 euros."
- **hard_020** (mixed): MISSED gold=SUPPORTED "Dunleigh General Hospital patients can book appointments via the CareLink app."

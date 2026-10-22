# Eval: prompt5
Label: prompt5

## Config
```json
{
  "approach": "prompt5",
  "label": "prompt5",
  "model": "deepseek-chat",
  "thinking": "disabled",
  "temperature": 0.1,
  "matchThreshold": 0.5,
  "gitCommit": "b3f49cc",
  "caseCount": 20,
  "dataset": "eval/2-4.jsonl",
  "datasetSha256": "4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684"
}
```

Dataset: `eval/2-4.jsonl` (sha256 `4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684`)

## Repeat summary
- runs: 3 (macro-F1 per run: 0.924, 0.962, 0.938)
- macro-F1 mean / min–max: **0.941** / 0.924–0.962
- end-to-end mean / min–max: 0.915 / 0.897–0.923

## Headline (run 1)
- macro-F1: **0.924**
- verdict accuracy (matched): 0.986
- end-to-end accuracy: 0.897
- case exact-match: 60.0%
- claim-count exact: 75.0% (mean |Δ|=0.25)
- citation validity raw: 1.000; final: 1.000
- citation agreement: 1.000
- latency p50/p95: 1747 / 2853 ms
- tokens in/out per case: 527 / 420
- LLM calls per case: 1.00

## Per-class F1
- SUPPORTED: P=0.909 R=0.833 F1=0.870 (support=36)
- CONTRADICTED: P=0.960 R=0.960 F1=0.960 (support=25)
- UNSUPPORTED: P=0.941 R=0.941 F1=0.941 (support=17)

## Confusion matrix
| gold \ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |
| --- | ---: | ---: | ---: | ---: |
| SUPPORTED | 30 | 1 | 0 | 5 |
| CONTRADICTED | 0 | 24 | 0 | 1 |
| UNSUPPORTED | 0 | 0 | 16 | 1 |
| (extra) | 3 | 0 | 1 | 0 |

## Failures
- **hard_002** (mixed): MISSED gold=SUPPORTED "The Saltmarsh Charter was signed by Abbot Edric Vane."
- **hard_003** (mixed): gold=SUPPORTED pred=CONTRADICTED | gold="Midfielder Rafe Okonjo was sent off in the 70th minute." | pred="Both of Tomas Ilves's goals came after midfielder Rafe Okonjo was sent off in the 70th minute." | reasoning="Passage 1 says Ilves scored in the 12th and 38th minutes, while Okonjo was sent off in the 70th minute, so the goals came before the sending-off."
- **hard_003** (mixed): MISSED gold=CONTRADICTED "Both of Tomas Ilves's goals came after Rafe Okonjo was sent off."
- **hard_003** (mixed): EXTRA pred=SUPPORTED "Rafe Okonjo was sent off in the 70th minute."
- **hard_014** (subtle_distortion): MISSED gold=SUPPORTED "The Kelby–Arnsford night bus leaves at 23:40."
- **hard_016** (extrinsic_hallucination): MISSED gold=SUPPORTED "Marrowby Outfitters' best-selling product is a waxed canvas jacket."
- **hard_017** (supported): EXTRA pred=SUPPORTED "The observatory opens to the public on the first Friday of each month."
- **hard_018** (multi_passage): MISSED gold=SUPPORTED "A Tesk Valley Folk Festival day pass costs 35 euros."
- **hard_018** (multi_passage): EXTRA pred=SUPPORTED "According to the final program, a day pass costs 35 euros."
- **hard_019** (mixed): MISSED gold=UNSUPPORTED "The counts of 312 sea stars and 87 sea anemones were the highest totals ever recorded at the Arlo Tidepool."
- **hard_019** (mixed): EXTRA pred=UNSUPPORTED "The counts were the highest totals ever recorded at the site."
- **hard_020** (mixed): MISSED gold=SUPPORTED "Dunleigh General Hospital patients can book appointments via the CareLink app."

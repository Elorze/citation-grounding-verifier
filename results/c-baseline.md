# Eval: baseline
Label: confirmation baseline

## Config
```json
{
  "approach": "baseline",
  "label": "confirmation baseline",
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
- macro-F1: **0.425**
- verdict accuracy (matched): 0.576
- end-to-end accuracy: 0.442
- case exact-match: 5.0%
- claim-count exact: 30.0% (mean |Δ|=0.95)
- citation validity raw: 1.000; final: 1.000
- citation agreement: 0.750
- latency p50/p95: 0 / 1 ms
- tokens in/out per case: 0 / 0
- LLM calls per case: 0.00

## Per-class F1
- SUPPORTED: P=0.833 R=0.431 F1=0.568 (support=58)
- CONTRADICTED: P=0.333 R=0.286 F1=0.308 (support=14)
- UNSUPPORTED: P=0.250 R=1.000 F1=0.400 (support=5)

## Confusion matrix
| gold \ pred | SUPPORTED | CONTRADICTED | UNSUPPORTED | (missed) |
| --- | ---: | ---: | ---: | ---: |
| SUPPORTED | 25 | 8 | 9 | 16 |
| CONTRADICTED | 3 | 4 | 5 | 2 |
| UNSUPPORTED | 0 | 0 | 5 | 0 |
| (extra) | 2 | 0 | 1 | 0 |

## Failures
- **conf_001** (subtle_distortion): gold=CONTRADICTED pred=SUPPORTED | gold="SQLite automatically checkpoints when the WAL file reaches 100 pages." | pred="SQLite automatically checkpoints when the WAL file reaches 100 pages." | reasoning="BM25 best sentence coverage=0.78 ≥ 0.7."
- **conf_001** (subtle_distortion): gold=SUPPORTED pred=CONTRADICTED | gold="In WAL mode, readers do not block writers." | pred="In WAL mode, readers do not block writers and writing can proceed concurrently with reading." | reasoning="Partial coverage=0.44 with number/negation mismatch vs best sentence."
- **conf_001** (subtle_distortion): MISSED gold=SUPPORTED "In WAL mode, writing can proceed concurrently with reading."
- **conf_002** (subtle_distortion): gold=CONTRADICTED pred=SUPPORTED | gold="volatile-ttl evicts keys that have the longest remaining TTL." | pred="volatile-ttl evicts keys that have the longest remaining TTL." | reasoning="BM25 best sentence coverage=0.71 ≥ 0.7."
- **conf_003** (subtle_distortion): gold=SUPPORTED pred=CONTRADICTED | gold="File-based log shipping is asynchronous." | pred="File-based log shipping is asynchronous, so there is a window for data loss if the primary fails." | reasoning="Partial coverage=0.45 with number/negation mismatch vs best sentence."
- **conf_003** (subtle_distortion): MISSED gold=SUPPORTED "PostgreSQL WAL segment files are shipped one file at a time."
- **conf_003** (subtle_distortion): MISSED gold=SUPPORTED "There is a window for data loss if the primary fails under file-based log shipping."
- **conf_004** (subtle_distortion): gold=SUPPORTED pred=CONTRADICTED | gold="no-store forbids storing the response in any cache." | pred="no-store also forbids storing the response in any cache." | reasoning="Partial coverage=0.43 with number/negation mismatch vs best sentence."
- **conf_005** (extrinsic_hallucination): gold=SUPPORTED pred=UNSUPPORTED | gold="SQLite WAL mode does not work over a network filesystem." | pred="SQLite WAL mode does not work over a network filesystem because processes must share memory on the same host." | reasoning="Coverage=0.64 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_005** (extrinsic_hallucination): gold=SUPPORTED pred=UNSUPPORTED | gold="WAL has been available since version 3.7.0." | pred="WAL has been available since version 3." | reasoning="Coverage=0.40 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_005** (extrinsic_hallucination): MISSED gold=SUPPORTED "WAL requires processes to share memory on the same host."
- **conf_005** (extrinsic_hallucination): EXTRA pred=SUPPORTED "7."
- **conf_006** (extrinsic_hallucination): gold=SUPPORTED pred=CONTRADICTED | gold="Docker's default restart policy is no." | pred="Docker's default restart policy is no, meaning the container is not restarted automatically." | reasoning="Partial coverage=0.50 with number/negation mismatch vs best sentence."
- **conf_006** (extrinsic_hallucination): gold=SUPPORTED pred=UNSUPPORTED | gold="The restart backoff starts at 100 milliseconds and doubles each time." | pred="The restart backoff starts at 100 milliseconds and doubles each time up to a maximum delay of 1 minute." | reasoning="Coverage=0.38 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_006** (extrinsic_hallucination): MISSED gold=SUPPORTED "The maximum restart delay is 1 minute."
- **conf_008** (extrinsic_hallucination): gold=SUPPORTED pred=CONTRADICTED | gold="A 304 Not Modified response is returned for a conditional GET or HEAD when the condition evaluates to false." | pred="A 304 Not Modified response is returned for a conditional GET or HEAD when the condition evaluates to false, confirming the cached resource is still valid." | reasoning="Partial coverage=0.56 with number/negation mismatch vs best sentence."
- **conf_008** (extrinsic_hallucination): MISSED gold=SUPPORTED "A 304 response confirms the cached resource is still valid."
- **conf_009** (multi_passage): gold=SUPPORTED pred=UNSUPPORTED | gold="In SQLite WAL mode only one writer can run at a time." | pred="In SQLite WAL mode only one writer can run at a time, but writers and readers can run concurrently." | reasoning="Coverage=0.42 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_009** (multi_passage): gold=SUPPORTED pred=UNSUPPORTED | gold="Checkpoints can run concurrently with readers." | pred="Checkpoints can run concurrently with readers, yet a long-running read transaction can prevent a checkpointer from making progress." | reasoning="Coverage=0.62 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_009** (multi_passage): MISSED gold=SUPPORTED "In SQLite WAL mode writers and readers can run concurrently."
- **conf_009** (multi_passage): MISSED gold=SUPPORTED "A long-running read transaction can prevent a checkpointer from making progress."
- **conf_010** (multi_passage): gold=SUPPORTED pred=UNSUPPORTED | gold="PostgreSQL streaming replication is asynchronous by default." | pred="PostgreSQL streaming replication is asynchronous by default, which can cause data loss if the primary crashes before changes reach the standby." | reasoning="Coverage=0.33 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_010** (multi_passage): gold=SUPPORTED pred=CONTRADICTED | gold="With synchronous replication, write commits wait until the commit is on disk on both primary and standby." | pred="With synchronous replication, write commits wait until the commit is on disk on both primary and standby, but read-only transactions need not wait." | reasoning="Partial coverage=0.69 with number/negation mismatch vs best sentence."
- **conf_010** (multi_passage): MISSED gold=SUPPORTED "Asynchronous streaming replication can cause data loss if the primary crashes before changes reach the standby."
- **conf_010** (multi_passage): MISSED gold=SUPPORTED "Read-only transactions need not wait for standby replies under synchronous replication."
- **conf_011** (multi_passage): gold=SUPPORTED pred=UNSUPPORTED | gold="allkeys-lru is recommended when a subset of keys is accessed far more often than the rest." | pred="allkeys-lru is recommended when a subset of keys is accessed far more often than the rest and is a good default." | reasoning="Coverage=0.69 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_011** (multi_passage): MISSED gold=SUPPORTED "allkeys-lru is a good default option."
- **conf_012** (multi_passage): gold=SUPPORTED pred=UNSUPPORTED | gold="git rebase --onto master topicA topicB is useful when topicB does not depend on topicA." | pred="git rebase --onto master topicA topicB is useful when topicB does not depend on topicA." | reasoning="Coverage=0.64 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_013** (subtle_distortion): MISSED gold=CONTRADICTED "In WAL mode, reading and writing cannot proceed concurrently."
- **conf_014** (subtle_distortion): gold=CONTRADICTED pred=UNSUPPORTED | gold="git rebase first updates the branch tip, then replays commits one by one." | pred="git rebase first updates the branch tip, then replays commits one by one in order, similar to cherry-pick." | reasoning="Coverage=0.29 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_014** (subtle_distortion): gold=SUPPORTED pred=UNSUPPORTED | gold="If a conflict occurs, rebase stops at the first problematic commit." | pred="If a conflict occurs, rebase stops at the first problematic commit; git rebase --skip skips that commit." | reasoning="Coverage=0.58 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_014** (subtle_distortion): MISSED gold=SUPPORTED "Replaying commits in rebase is similar to running git cherry-pick for each commit."
- **conf_014** (subtle_distortion): MISSED gold=SUPPORTED "git rebase --skip skips the commit that caused the conflict."
- **conf_015** (mixed): gold=SUPPORTED pred=CONTRADICTED | gold="Cascading replication is asynchronous." | pred="Cascading replication is asynchronous, and synchronous replication settings also apply to cascading standbys." | reasoning="Partial coverage=0.60 with number/negation mismatch vs best sentence."
- **conf_015** (mixed): MISSED gold=CONTRADICTED "Synchronous replication settings also apply to cascading standbys."
- **conf_016** (mixed): gold=CONTRADICTED pred=UNSUPPORTED | gold="Detached containers keep running after the root process exits unless --rm is set." | pred="Detached containers keep running after the root process exits unless --rm is set." | reasoning="Coverage=0.64 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_016** (mixed): gold=CONTRADICTED pred=UNSUPPORTED | gold="--restart can be combined freely with --rm." | pred="--restart can be combined freely with --rm." | reasoning="Coverage=0.50 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_017** (mixed): gold=CONTRADICTED pred=UNSUPPORTED | gold="max-age measures freshness from when the browser received the response." | pred="max-age measures freshness from when the browser received the response." | reasoning="Coverage=0.50 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_017** (mixed): MISSED gold=SUPPORTED "s-maxage overrides max-age for shared caches."
- **conf_018** (mixed): gold=CONTRADICTED pred=UNSUPPORTED | gold="By default the LFU counter decays every one second." | pred="By default the LFU counter decays every one second." | reasoning="Coverage=0.43 below thresholds (hand-picked constants; not tuned on test set)."
- **conf_018** (mixed): EXTRA pred=UNSUPPORTED "0 or newer."
- **conf_019** (mixed): gold=CONTRADICTED pred=SUPPORTED | gold="You can change page_size with VACUUM after entering WAL mode." | pred="You can change page_size with VACUUM after entering WAL mode." | reasoning="BM25 best sentence coverage=0.89 ≥ 0.7."
- **conf_019** (mixed): gold=SUPPORTED pred=CONTRADICTED | gold="Older SQLite builds could not open read-only WAL databases." | pred="Older SQLite builds could not open read-only WAL databases, but beginning with version 3." | reasoning="Partial coverage=0.45 with number/negation mismatch vs best sentence."
- **conf_019** (mixed): EXTRA pred=SUPPORTED "22."
- **conf_020** (supported): MISSED gold=SUPPORTED "Earlier names in the FIRST list have higher priority."
- **conf_020** (supported): MISSED gold=SUPPORTED "With FIRST 2 (s1, s2, s3), s1 and s2 are synchronous standbys."

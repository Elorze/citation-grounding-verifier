# Annotation protocol

This page documents how gold claims were labeled for `eval/1-1.jsonl`, `eval/2-4.jsonl`, and `eval/3-confirmation.jsonl`. **Verdict and decomposition rules are the same across splits**; only provenance and freeze policy differ. Sources: `示范用例库.md`（标注约定）, hard-split notes in `docs/iteration-log.md`, and the shipped prompt8 claim-split conventions (`docs/prompts/prompt8.md`).

## Verdicts (assignment-aligned)

- **SUPPORTED** — the passages entail the claim (paraphrase OK if meaning matches).
- **CONTRADICTED** — the passages state something **incompatible** with the claim (not merely silence).
- **UNSUPPORTED** — the passages do not state the claim, **even if it is true in the real world**. Citations must be `[]`.

For SUPPORTED / CONTRADICTED, each citation needs a passage `index` and a **verbatim substring** `quote` from that passage. Quotes follow the passage language (English in these sets); `claim_text` follows the answer’s language.

## Claim decomposition

Plain-English rules used when writing gold (aligned with prompt8 / earlier R1–R5 notes; not a paste of the SYSTEM prompt):

- **R1 atomic** — one independently checkable piece of information per claim.
- **R2 modifier / detail split** — who / when / where / how many / how often of the same event are separate claims when each can be checked on its own. A **from–to** value change (“rose from 5 to 12”) is **one** detail, not two number claims.
- **R3 keep qualifiers** — time / place / quantity / conditions stay with the claim when they belong to it; do not drop them silently. A condition or time span usually stays **inside** that claim; only if the bare fact is supported but the condition/span is not, also emit the bare-fact claim (do not invent duplicate condition-only claims otherwise).
- **R4 relation-only** — causal / temporal links (because / so / after / before) are their own claim stating **only the relation**, without re-packing numbers/times already covered elsewhere.
- **R5 coref** — resolve pronouns and vague references (`it`, `they`, `the venue`, …) to full names/values so each claim is self-contained.

## Labeling edge cases

From `示范用例库.md` 标注约定:

- **Rounding** — reasonable approx OK as SUPPORTED (e.g. 8.4 km → “about 8 km”); same digits with **wrong unit** → CONTRADICTED.
- **Supersede** — if a passage explicitly updates/replaces an older fact, label against the **newer** statement.
- **Subjective** — treating a subjective evaluation as a fact (“best in town”) is a claim, usually UNSUPPORTED; pure courtesy fluff is **not** a claim.
- **Language** — `claim_text` matches the answer; quotes remain exact passage substrings.
- **Deictic / pronouns** — rewrite so the claim stands alone (full subject).
- **No world knowledge** — if it is not in the passages, it is UNSUPPORTED.

Confirmation checklist (same spirit): CONTRADICTED only when conflict is explicit in the text; UNSUPPORTED must not be rescued by outside knowledge.

## Provenance & freeze

| Split | Role | Provenance | Freeze / sha256 |
| --- | --- | --- | --- |
| `eval/1-1.jsonl` | dev / tuning | mostly fictional authored QA (case cards in `示范用例库.md`) | may fix clear label bugs with a note in `iteration-log` (e.g. case_021 v1→v1.1). sha256 `0fb59a7e9172adc421c0e75365e785492ba5e4066a0703df46a90fc82007cf46` |
| `eval/2-4.jsonl` | held-out | fictional entities; taxonomy tags from RAGTruth / FRANK | frozen for climb. sha256 `4d799be6929a03b6a03b21944afefd24210612be36fc76d23f0db4484410a684` |
| `eval/3-confirmation.jsonl` | blind confirm | short excerpts from official docs (e.g. SQLite / Postgres / Redis / Git / Docker / MDN); no overlap with the fictional 1-1 / 2-4 worlds | frozen after prompt8 ship; **analysis only — no gold or prompt rewrite**. sha256 `1fa1ea8c976265df8c4687e3664c14d75d399af5ac948f0628b77b9d605efb2c` |

## Annotator

Single author. Cases were often **AI-assisted drafts**, then **human-reviewed** before freeze. Single-annotator labeling can miss disagreements another rater would raise; treat gold as carefully reviewed but not multi-annotator consensus.

## Out of scope

FRANK-style **grammar-error-only** (GramE) items are **not** used as gold labels in these sets.

---

Case cards / worked examples: [`示范用例库.md`](../示范用例库.md). Climb scoreboard: [`iteration-log.md`](iteration-log.md). Confirmation analysis: [`confirmation-report.md`](confirmation-report.md). Freeze note: [`confirmation-freeze.md`](confirmation-freeze.md).

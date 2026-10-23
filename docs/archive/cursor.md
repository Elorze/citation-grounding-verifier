## 中文概览（先看这一段）

**这份文档是干什么的**：把整份文档复制给 Cursor，让它按顺序一步一步写代码。正文是英文的，因为它要给 Cursor 看，最后也会放进 GitHub 仓库。

**系统由这几块组成（用大白话说）**：

| 部分 | 是什么 | 打个比方 |
| --- | --- | --- |
| `server.ts` | 一个 HTTP 服务，接收「原文 + 回答」，返回逐条判定 | 前台窗口 |
| `schema.ts` | 用 Zod 写的「数据长什么样」的规则 | 表格模板 |
| `validate.ts` | 用代码检查：段号有没有越界、引用是不是原文里逐字有的、判定和引用对不对得上 | 质检员（不信任模型，逐条核对） |
| `llm.ts` | 调用智谱 GLM-4.7-Flash；出错重试，并把错在哪告诉模型 | 打电话给模型的人 |
| `verifiers/baseline.ts` | 不用 AI，只靠「词重叠」打分的简单方法（方法 1） | 对照组 |
| `verifiers/llmMinimal.ts` | 只调一次模型、prompt 写得很简单（方法 2） | 起点 |
| `verifiers/llmOptimized.ts` | 一步一步优化后的版本（方法 3） | 你的成品 |
| `eval/run.ts` | 跑完 24 条用例，和标准答案对比，算分数、记耗时 | 考试阅卷机 |
| `docs/iteration-log.md` | 每改一次记一次：改了什么、分数变化 | 开发日记（爬坡的证据） |

**做的顺序（每一步做完都能跑起来）**：

1. **M1**：先搭空壳服务，返回假数据。
2. **M2**：写评测脚本，用假数据先跑通。
3. **M3**：接上 GLM，用最简单的 prompt（方法 2），**跑第一次分数**。
4. **M4**：加代码校验 + 出错重试。
5. **M5**：写不用 AI 的 baseline（方法 1）。
6. **M6**：一次只改一个优化点，每改一次就重跑评测并记录。**千万别让 Cursor 一次把优化全加上**，否则分不清是哪一步起了作用，而「一步一步爬坡」正是评分重点。
7. **M7**：写 README 报告。

**你要做的事**：注册智谱拿 API key 填进 `.env`；每个里程碑结束时自己跑一下命令看结果；把每次分数抄到 Notion 的「开发记录」。

---

## 0. How to use this spec (for Cursor)

- Build **one milestone at a time** (M1 → M7). Stop at the end of each milestone, make sure the listed command runs, and commit.
- **Do not implement optimizations ahead of time.** M3 must stay deliberately minimal. M6 changes are applied one at a time, with a full eval run and an iteration-log entry after each.
- The source of truth for the API is the assignment ("Citation Grounding & Faithfulness Verifier"). Do not change field names.

## 1. Stack

- TypeScript (strict), Node ≥ 20, **pnpm**
- **Hono** + `@hono/node-server` for `POST /verify`
- **Vercel AI SDK** (`ai`, current major is v7; `generateText` + `Output.object(...)`; `generateObject` is the older/deprecated style, don't use it)
- `@ai-sdk/openai-compatible` → `createOpenAICompatible`
- **Zod** (v4) for all schemas
- `tsx` to run scripts, `dotenv` for env, `vitest` for unit tests (validate.ts + matching + baseline)
- No other runtime dependencies are required. BM25/TF-IDF is implemented by hand (~60 lines).

## 2. LLM configuration

- Provider: Zhipu BigModel, OpenAI-compatible.
- Base URL: `https://open.bigmodel.cn/api/paas/v4`
- Model id: **`glm-4.7-flash`** (verified on Zhipu's official docs, docs.bigmodel.cn → GLM-4.7-Flash, Oct 2026; it is free and replaced `glm-4.5-flash`). Context 200K.
- `.env` (gitignored) and `.env.example` (committed):

```
ZHIPU_API_KEY=
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
LLM_MODEL=glm-4.7-flash
LLM_THINKING=disabled        # GLM-4.7-Flash is a hybrid "thinking" model; disabled = faster/cheaper. Try enabled as an experiment.
LLM_TEMPERATURE=0.1
LLM_TIMEOUT_MS=60000
LLM_MAX_RETRIES=2            # validation retries (with error feedback), separate from HTTP retries
PORT=3000
```

- The model is configurable via env so a second model (e.g. another `glm-*` id) can be compared with the same eval.
- `src/llm.ts`:

```tsx
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
export const zhipu = createOpenAICompatible({
  name: 'zhipu',
  apiKey: process.env.ZHIPU_API_KEY,
  baseURL: process.env.LLM_BASE_URL!,
});
export const model = zhipu(process.env.LLM_MODEL ?? 'glm-4.7-flash');
// Call: generateText({ model, system, messages, temperature, output: Output.object({ schema: LlmOutput }),
//   abortSignal: AbortSignal.timeout(TIMEOUT), maxRetries: 2,   // SDK-level retries for 429/5xx
//   providerOptions: { zhipu: { thinking: { type: process.env.LLM_THINKING } } } })
```

- **Important:** the provider does not do strict JSON-schema decoding. At best we get "JSON mode" (`response_format: json_object`), which **only guarantees valid JSON syntax, not our shape**. So Zod validation + our own invariant checks are always required.
- **Verify in M3** with one smoke-test call (log the raw request body once) that (a) `response_format` is sent and accepted, and (b) `thinking` from `providerOptions` really reaches the request body. If either doesn't work, fall back to `generateText` without `output`, then `JSON.parse` (strip ```json fences) + Zod ourselves.
- Free tier has low concurrency → the eval runs cases **sequentially**, with optional `EVAL_DELAY_MS`.
- Read token usage from the `generateText` result (`usage`) and accumulate it per request.

## 3. Directory structure

```
.
├── src/
│   ├── server.ts            # Hono app, POST /verify, GET /health
│   ├── config.ts            # reads + validates env (Zod), fails fast if ZHIPU_API_KEY missing for LLM approaches
│   ├── schema.ts            # Zod: request, response, LLM output, eval case
│   ├── validate.ts          # deterministic checks + repair
│   ├── llm.ts               # client, callWithValidation(): timeout, retry with error feedback, usage
│   ├── text.ts              # sentence split (keeps offsets), tokenize, stopwords, CJK bigrams
│   ├── errors.ts            # typed errors → HTTP mapping
│   └── verifiers/
│       ├── types.ts         # Verifier interface
│       ├── stub.ts          # M1 only
│       ├── baseline.ts      # approach 1: non-LLM
│       ├── llmMinimal.ts    # approach 2
│       └── llmOptimized.ts  # approach 3
├── eval/
│   ├── 1-1.jsonl            # 24 labeled dev cases (copy as-is; was cases.jsonl)
│   ├── run.ts               # benchmark runner
│   ├── match.ts             # predicted ↔ gold claim matching
│   └── metrics.ts
├── results/                 # <approach>-<timestamp>.json + .md (commit the final ones)
├── docs/iteration-log.md
├── test/*.test.ts
├── .env.example  README.md  package.json  tsconfig.json
```

`package.json` scripts: `dev` (tsx watch src/server.ts), `start`, `eval` (tsx eval/run.ts), `test` (vitest run), `typecheck` (tsc --noEmit).

## 4. Schemas (`src/schema.ts`)

```tsx
import { z } from 'zod';

export const Verdict = z.enum(['SUPPORTED', 'CONTRADICTED', 'UNSUPPORTED']);
export type Verdict = z.infer<typeof Verdict>;

export const Citation = z.object({
  index: z.number().int().nonnegative(),
  quote: z.string().min(1),
  start_char: z.number().int().nonnegative().optional(), // filled in by validate.ts
  end_char: z.number().int().nonnegative().optional(),
});

export const Claim = z.object({
  claim_text: z.string().min(1),
  verdict: Verdict,
  reasoning: z.string(),
  citations: z.array(Citation),
});

export const VerifyRequest = z.object({
  context_passages: z.array(z.string()),
  generated_answer: z.string(),
});

export const VerifyResponse = z.object({ claims: z.array(Claim) });
export type VerifyRequest = z.infer<typeof VerifyRequest>;
export type VerifyResponse = z.infer<typeof VerifyResponse>;

// What we ask the LLM for. Lenient on purpose; validate.ts enforces the real invariants.
export const LlmOutput = z.object({
  claims: z.array(z.object({
    claim_text: z.string(),
    verdict: Verdict,
    reasoning: z.string().default(''),
    citations: z.array(z.object({ index: z.number().int(), quote: z.string() })).default([]),
  })),
});

// Eval dataset (eval/cases.jsonl, one JSON object per line)
export const Category = z.enum(['supported', 'subtle_distortion', 'extrinsic_hallucination',
  'multi_passage', 'edge_case', 'mixed']);
export const EvalCase = z.object({
  id: z.string(),                       // "case_001" … "case_024"
  category: Category,
  context_passages: z.array(z.string()),// may be [] (case_019)
  generated_answer: z.string(),
  gold_claims: z.array(z.object({       // may be [] (case_020: answer has no factual claims)
    claim_text: z.string(),
    verdict: Verdict,
    citations: z.array(z.object({ index: z.number().int(), quote: z.string() })),
  })),
});
```

Notes on the dataset: gold claims have **no `reasoning` field**. Gold quotes are verified verbatim substrings. Totals: 24 cases, 55 gold claims (SUPPORTED 28, CONTRADICTED 15, UNSUPPORTED 12). case_022 has a Chinese answer with English passages (claim_text is Chinese, quotes are English).

Verifier interface (`src/verifiers/types.ts`):

```tsx
export interface VerifyStats { llmCalls: number; validationRetries: number; inputTokens: number;
  outputTokens: number; rawInvalidCitations: number; repairedClaims: number; latencyMs: number; }
export interface Verifier { name: 'stub' | 'baseline' | 'minimal' | 'optimized';
  verify(req: VerifyRequest): Promise<{ response: VerifyResponse; stats: VerifyStats }>; }
```

## 5. Deterministic validation (`src/validate.ts`)

`checkClaims(claims, passages) → { errors: string[]; claims }` checks every claim:

1. `0 <= index < passages.length`, otherwise error `claim 2: citation index 3 out of range (0..1)`.
2. `passages[index].includes(quote)` (exact, case-sensitive). If true, set `start_char = indexOf`, `end_char = start + quote.length`. Otherwise error: `claim 1: quote not found verbatim in passage 0: "..."`.
3. SUPPORTED / CONTRADICTED need ≥ 1 valid citation. UNSUPPORTED must have `citations: []`.
4. `claim_text` is non-empty. Drop exact-duplicate claims.

The error strings are reused as **feedback to the model** on retry, so they must be specific.

`repair(claims, passages)` runs only after retries are exhausted:

- Drop invalid citations.
- S/C claim with no valid citation left → downgrade to UNSUPPORTED and append `" [auto: citation could not be verified]"` to reasoning.
- UNSUPPORTED with citations → clear citations.
- Count repairs in `stats.repairedClaims`.

The final response **always** passes `VerifyResponse` + the invariants. Assert this before returning (a failure here is a 500 bug, not a model problem).

## 6. LLM call with retry (`src/llm.ts`)

`callWithValidation({ system, user, passages })`:

1. Call `generateText` with `Output.object({ schema: LlmOutput })`, timeout, SDK `maxRetries` for transport errors.
2. On parse/schema failure (`NoObjectGeneratedError`, which has `.text`) or `checkClaims` errors, retry up to `LLM_MAX_RETRIES`. Append the previous raw output as an assistant message and a user message: `"Your previous JSON had these problems:\n- …\nReturn the complete corrected JSON."`
3. After the last attempt: if we have parseable claims → `repair()`. If nothing parseable → throw `ModelOutputError`.
4. Accumulate usage and calls into stats. Record `rawInvalidCitations` from the **first** attempt (this measures the model, not our fixing).

## 7. HTTP behavior (`src/server.ts`, `src/errors.ts`)

`POST /verify?approach=optimized|minimal|baseline` (default from env `VERIFIER`, default `optimized`). Error body shape: `{ "error": { "code": string, "message": string } }`.

| Situation | Behavior |
| --- | --- |
| Body not JSON / fails `VerifyRequest` | 400 `INVALID_REQUEST` (include Zod issues) |
| `generated_answer` empty/whitespace | 200 `{ "claims": [] }`, no LLM call |
| `context_passages` is `[]` | 200. Still decompose the answer into claims, but every claim is UNSUPPORTED with `[]` citations. The verdict is forced in code; don't trust the model here. |
| Answer has no factual claims (pleasantries only) | 200 `{ "claims": [] }` (model is told this is allowed) |
| Model output malformed after retries | Parseable → repaired 200. Unparseable → 502 `MODEL_OUTPUT_INVALID` |
| Upstream timeout | 504 `UPSTREAM_TIMEOUT` |
| Upstream 4xx/5xx/network after SDK retries (incl. 429) | 502 `UPSTREAM_ERROR` (message without the API key) |
| Missing `ZHIPU_API_KEY` | Server fails at startup for LLM approaches. Baseline still works. |
| Body > 1 MB | 413 `PAYLOAD_TOO_LARGE` |
| Unexpected exception | 500 `INTERNAL_ERROR`, logged with request id |

Also `GET /health` → `{ ok: true, model }`.

## 8. Eval runner (`eval/run.ts`)

CLI: `pnpm eval --approach minimal [--label "M6a quote-first"] [--ids case_001,case_005] [--limit 5] [--repeat 1]`

- Loads + Zod-validates `eval/cases.jsonl`, then runs the chosen verifier **in-process** (no HTTP needed) **sequentially**.
- Catches errors per case: an error counts as all gold claims missed, and the run continues.

### 8.1 Claim matching (`eval/match.ts`): simple and explainable

1. Normalize: lowercase, strip punctuation, drop a small English stopword list. Tokens = words. For text containing CJK characters, use character bigrams instead.
2. Score = Jaccard(tokens(gold), tokens(pred)).
3. Compute all gold×pred scores, sort descending, greedily assign one-to-one pairs with score ≥ **0.5** (constant `MATCH_THRESHOLD`, reported in output).
4. Unmatched gold = **missed**. Unmatched predicted = **extra**.
5. Documented limitation (README): paraphrased or differently-split claims may fail to match even if the verdict is right (counted as missed + extra). Also report how many matched pairs had score 0.5–0.6, so a reader can judge. Optional later improvement: an embedding or LLM matcher, but keep Jaccard as the primary metric so runs stay comparable.

### 8.2 Metrics (`eval/metrics.ts`)

- **Confusion matrix**: rows = gold verdict S/C/U plus an `(extra)` row for unmatched predicted claims; columns = predicted verdict S/C/U plus a `(missed)` column for unmatched gold claims.
- **Per-class precision / recall / F1** for S/C/U. A missed gold claim is a false negative for its class; an extra predicted claim is a false positive for its class. Headline = **macro-F1**.
- **Verdict accuracy** on matched pairs, plus **end-to-end accuracy** = correct verdicts / all gold claims.
- **Citation validity rate (raw)** = valid citations / all citations in the model's *first* attempt. Also the final rate, which must be 100%.
- **Citation agreement**: for matched S/C pairs, predicted index set ∩ gold index set ≠ ∅ **and** quote character spans overlap.
- **Claim-count accuracy**: % of cases where #pred == #gold, and mean |#pred − #gold|.
- **Case exact-match**: % of cases where every gold claim is matched with the correct verdict and there are no extras.
- **Per-category** macro-F1 (supported, subtle_distortion, …).
- **Latency** p50/p95 per case (ms). **LLM calls**, **retries**, **input/output tokens** (total and per case). Cost = 0 on the free tier, but report tokens so cost can be estimated for a paid model.

### 8.3 Outputs

- `results/<approach>-<YYYYMMDD-HHmmss>.json`: config (model, thinking, temperature, threshold, label, git commit), metrics, and per-case details (gold, pred, matches, stats, errors).
- `results/<…>.md`: summary table + confusion matrix + **failure list**. For each wrong/missed/extra claim: case id, category, gold vs pred verdict, pred reasoning. This list is what we read to decide the next optimization.
- With `--repeat N`, run N times and report mean and min–max for macro-F1 (LLM output varies run to run).

## 9. Approaches

### 9.1 Baseline (`verifiers/baseline.ts`, no API)

1. Split the answer into sentences = claims (no further decomposition; that's a known weakness).
2. Split each passage into sentences **keeping offsets**, so the quote is an exact substring.
3. For each claim, rank passage sentences by BM25 (k1=1.2, b=0.75, hand-written). Take the best sentence and compute `coverage` = fraction of claim content tokens found in it.
4. Rules:
    - coverage ≥ 0.7 → SUPPORTED, quoting the best sentence.
    - 0.4 ≤ coverage < 0.7 **and** a number in the claim is absent from the sentence, or a negation mismatch (not/no/never/cannot) → CONTRADICTED with the same quote.
    - Otherwise → UNSUPPORTED, `[]`.
    - Empty context → all UNSUPPORTED.
5. Thresholds are hand-picked constants. Say so in the README (no tuning on the test set).

### 9.2 LLM minimal (`verifiers/llmMinimal.ts`): one call, deliberately minimal prompt

Use this prompt verbatim and **do not improve it**:

System:

```
You are a fact-checking assistant. Split the answer into atomic factual claims. For each claim, decide whether the context passages SUPPORT it, CONTRADICT it, or whether it is UNSUPPORTED (not stated in the passages). For SUPPORTED or CONTRADICTED claims, give the passage index and copy an exact quote from that passage. For UNSUPPORTED claims, citations must be an empty list. If the answer contains no factual claims, return an empty claims list.
Return only JSON in this format:
{"claims":[{"claim_text":"...","verdict":"SUPPORTED|CONTRADICTED|UNSUPPORTED","reasoning":"...","citations":[{"index":0,"quote":"..."}]}]}
```

User:

```
Context passages:
[0] <passage 0>
[1] <passage 1>

Answer:
<generated_answer>
```

In M3 there is no validation retry yet. Parse + Zod only; on failure → 502. M4 adds validate + retry + repair to **both** LLM verifiers (minimal stays "minimal prompt", but the service must still guarantee the invariants). Record minimal's score both before (M3) and after (M4) so the effect of validation/retry is visible.

### 9.3 LLM optimized (`verifiers/llmOptimized.ts`)

Starts as a copy of minimal (M4 state), then receives the M6 steps below one at a time.

## 10. Milestones (each one runnable; commit after each)

- **M1: schema + server stub.** `stub.ts` returns one fixed SUPPORTED claim. Implement request validation and error mapping. ✅ `pnpm dev` + `curl -X POST localhost:3000/verify -d @sample.json` returns 200; bad JSON returns 400. Unit tests for `validate.ts`.
- **M2: eval harness with stub.** `pnpm eval --approach stub` writes results json/md; metrics show (near) zero. Unit tests for `match.ts` (exact match, paraphrase below threshold, CJK bigrams, greedy one-to-one).
- **M3: llmMinimal.** Smoke-test the provider (see §2). ✅ `pnpm eval --approach minimal --label "M3 minimal"`. Log the result in `docs/iteration-log.md` as the starting point.
- **M4: validate + retry + repair** in `llm.ts`, used by both LLM verifiers. ✅ Re-run minimal and log it. Final citation validity must be 100%. Raw validity is reported.
- **M5: baseline.** ✅ `pnpm eval --approach baseline`. Log it.
- **M6: optimize, ONE change per step.** Re-run `pnpm eval --approach optimized --label "<step>"` after each step, and log it. Keep the change if macro-F1 improves (or stays the same while latency/tokens drop). Otherwise revert and log why. Suggested order:
    - **M6a quote-first:** reorder the output fields to `claim_text → citations (evidence) → reasoning → verdict`, and tell the model to find and copy evidence *before* deciding.
    - **M6b definitions + rules + few-shot:** add the assignment's verdict definitions verbatim, plus our labeling rules: atomic and self-contained claims (resolve pronouns); rounding OK but wrong units = CONTRADICTED; hedges/quantifiers matter ("may reduce up to 15%" ≠ "eliminates"); common knowledge is not evidence → UNSUPPORTED; newer passage that explicitly supersedes wins; subjective opinions stated as fact are claims (UNSUPPORTED); pleasantries are not claims. Add 1–2 few-shot examples **not taken from eval/cases.jsonl** (e.g. the assignment's SQLite WAL example) to avoid leaking the test set.
    - **M6c two-step:** call 1 decomposes the answer into claims only. Call 2 verifies each claim separately against all passages (concurrency 1–2 on the free tier). Compare quality vs. the extra latency and tokens.
    - **M6d (optional) quote normalization before retry:** if a quote fails only due to whitespace or curly quotes, snap it to the exact passage substring.
    - **M6e (optional) thinking enabled vs disabled; second model** via `LLM_MODEL`.
- **M7: README.** See §11. Final comparison run of all three approaches with `--repeat 3` for the LLM ones.

`docs/iteration-log.md` entry template:

```
## M6a quote-first  (2026-10-xx, commit abc123)
Hypothesis: …
Change: …
Result: macro-F1 0.61 → 0.68; C recall 0.40 → 0.60; p50 3.1s → 3.3s; tokens +5%
Fixed: case_005, case_009   Broke: case_024
Decision: keep / revert
```

Overfitting guard (mention in the README): with only 24 cases, prompt changes may overfit. Prefer general rules over case-specific wording, and never paste eval cases into prompts.

## 11. README skeleton

1. Overview (what the service does, one curl example with the assignment's WAL request)
2. Quick start (`pnpm i`, `.env`, `pnpm dev`, `pnpm eval --approach …`, `pnpm test`)
3. Design: API + error handling table; deterministic validation and retry/repair; why JSON mode alone isn't trusted
4. Dataset: 24 cases, categories, verdict distribution, labeling rules, how gold quotes were verified
5. Metrics and claim matching (with its limitations)
6. Results: table for baseline / minimal (M3 and M4) / optimized, showing macro-F1, per-class F1, raw citation validity, claim-count accuracy, p50/p95 latency, tokens per case, calls per case
7. Hill-climbing story: short summary of the iteration log (what changed, why, the delta)
8. Failure analysis: 3–5 concrete failing cases and the reason for each
9. Limitations and next steps
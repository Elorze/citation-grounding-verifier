# 现状结论与下一步优化（M6 先不跑）

> 目的：先交付可跑通的「最简三路对比」系统，把优化阶梯写清楚，方便之后一步一步展示 hill-climbing。

## 1. 环境

| 项 | 状态 |
| --- | --- |
| Node | v22.14.0（`D:\node.exe`） |
| pnpm | 10.7.1；store 指向 `D:\pnpm-store` |
| 端口 | 默认 **3100**（本机 3000 已被占用） |
| 模型 | `glm-4.7-flash`（智谱免费档，高峰易 429） |
| Arize | `.env` 里有 key，**本轮未接入** |

## 2. 已完成

| 里程碑 | 内容 | 验证 |
| --- | --- | --- |
| M1 | schema / validate / stub HTTP | `pnpm test`；curl OK |
| M2 | eval harness + 24 cases | stub 评测出 json/md |
| M4 | LLM minimal + validate/retry/repair | 通路 OK（见下） |
| M5 | non-LLM baseline | 全量 24 条 |
| M6 | 优化阶梯 | **刻意未执行**（留给展示过程） |

## 3. 当前评测数字

| Approach | Cases | macro-F1 | 关键观察 | 结果文件 |
| --- | ---: | ---: | --- | --- |
| stub | 3 | 0.000 | 接线用 | `results/stub-*.md` |
| **baseline** | **24** | **0.217** | CONTRADICTED F1=0；同义改写/主宾反转弱 | `results/baseline-20261021-180348.md` |
| **minimal (M4)** | **3**（001–003） | **0.556** | S 全对；唯一 C 被判成 U（理由已写对却选错标签） | `results/minimal-20261021-180653.md` |
| minimal 全量 24 | — | **未完成** | 免费档持续 429，全量跑被掐断 | 限流缓解后再跑 |

### baseline 细读（24 cases）

- macro-F1 **0.217**；matched verdict accuracy 约 0.42
- **CONTRADICTED F1 = 0**：启发式几乎抓不到反驳
- 引用若给出则多为原文子串（citation validity final = 1）
- 分句已修 `a.m.` 截断；macro-F1 仅从 0.215 → 0.217（预期：不是主矛盾）

### minimal 细读（3 cases 子集）

- case_002 / case_003：**exact match**
- case_001：把「50→100」判成 **UNSUPPORTED** 而不是 **CONTRADICTED**（reasoning 已提到 50，标签选错）→ **M6b 定义/few-shot 的首选靶子**
- citation validity raw/final = 1.0（校验+repair 在起作用）
- 单 case 延迟可达 30s+（含 429 退避）

## 4. 工程结论

1. **智谱不支持严格 structured output**：`Output.object` / `responseFormat` 不可用 → plain text + 抽 JSON + Zod + `validate.ts`。
2. **AI SDK v7**：系统提示用 `instructions`，不要 `messages` 里塞 `system`。
3. **免费模型限流是评测瓶颈**：必须串行、`EVAL_DELAY_MS`、全局 cooldown；429 高峰时全量分数会被 miss 污染，应等低峰再跑。
4. **baseline 弱是作业需要的对照组**，不是 bug。

## 5. 建议的 M6 顺序（下一步你让我跑再跑）

每次只改一点 → `pnpm eval -- --approach optimized --label "M6x …"` → 记 `docs/iteration-log.md`。

| 步骤 | 改什么 | 针对什么 |
| --- | --- | --- |
| **M6a quote-first** | 先抄 quote 再判 verdict | 稳 citation；减少空引用 |
| **M6b 定义 + 规则 + few-shot** | 写入 S/C/U 定义与标注约定；WAL 作业例作 few-shot（**勿抄 eval cases**） | case_001 类「理由对、标签错」；外在幻觉 |
| **M6c two-step** | 先拆 claim 再逐条验 | 长回答漏拆（case_021） |
| **M6d（可选）** | quote 空白/弯引号归一 | 少无意义 retry |
| **M6e（可选）** | thinking on / 换模型 | 质量 vs 延迟 |

## 6. 限流缓解后请跑

```bash
# 建议晚上或低峰；间隔可调到 5s+
# .env: EVAL_DELAY_MS=5000

pnpm eval -- --approach minimal --label "M4 minimal+validate full24"
pnpm eval -- --approach optimized --label "M4 optimized=same-as-minimal"
```

当前 `optimized` ≡ `minimal`（M4 状态），方便你之后从 M6a 开始差分对比。

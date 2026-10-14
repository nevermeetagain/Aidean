# 任务规划 V0.4.0（索引）

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 递进 V0.4.0——未实现需求重核（代码无 delta）+ 模型源监控体系（用户链接 + 补充1/2）纳入统一规划；新增 REQ-M-001..016、S10–S12、TASK-056..073

## 一页结论

- **快照**：main@`bfb3aef`，业务树 = `77c7952`。`git diff --stat 77c7952 HEAD -- . ':!docs'` 为空 → **「代码已更新」不被 git 历史支持**（18b §一）。tsc / vitest 1081 / docs 门禁 / prisma validate 重跑全部通过。
- **需求**：99 条（承 83 + 新增 16 条 REQ-M）。状态：已实现 43｜部分实现 19｜未实现 26｜待澄清 11。新增的 16 条：已实现 1｜部分 8｜未实现 7（03a、03b）。
- **监控体系现状**（18b §四）：已有采集适配器 11 个、llmtest 中转站发现、6 层发现管线、MarketSnapshot diff、ScheduledScript 调度、EvidenceChain/ReliabilityObservation 表；**缺**按源目录快照、provider_model 观测、变更事件表、源分级注册、后台监控页、前台多源展示、keyed 源、AA 署名，以及发现引擎汇率仍硬编码 7.2。
- **外部核验**（19）：OpenRouter/AIHubMix/Quanzil(/api/pricing)/HF/llmtest 共 5 个源可无凭证访问；SiliconFlow、Quanzil /v1/models、DMXAPI、AA 都需要 Key；AA 要求署名，再分发需授权。报告中的模型数量、Veridrop 历史分数等标为「证据不足 / 与当前不符」；「GPT-6 Luna Decisions」实测存在（只在 all 视图）。
- **规划**：73 张卡（Hark 24 / 外部 49；opus 24 / sonnect 37 / haiku 12；380h，其中条件卡 22 张 / 111h）。切片 S0→S1→**S10**→S2/S3/S4a→S11→S6→S7，条件刀 S4b/S5/S8/S9/S12。可执行范围关键路径 84h。
- **门禁**：PLAN+SPEC，**需 APPROVE**。BLOCKING：P-1、P-2、U-15，以及新增 U-M1（Key）、U-M2（AA）、U-M3（探针预算）、U-M5（provider 映射）——都只阻塞局部卡，S10 骨架不受影响。

## 阅读顺序

| § | 文件 | V0.4.0 状态 |
|---|---|---|
| ★ | [18b_V0.4.0代码重核与监控需求映射.md](18b_V0.4.0代码重核与监控需求映射.md) | **新增**：代码 delta 核验 + 已有/缺失映射 |
| ★ | [19_外部来源核验证据.md](19_外部来源核验证据.md) | **新增**：报告断言抽检（URL + 时间） |
| ★ | [03b_监控需求增量.md](03b_监控需求增量.md) | **新增**：REQ-M、冲突、BLOCKING 条件方案 |
| ★ | [20_剩余可执行大纲.md](20_剩余可执行大纲.md) | **新增**：5 级带序号原子大纲（生成） |
| ★ | [17c_V0.3.0到V0.4.0差异.md](17c_V0.3.0到V0.4.0差异.md) | **新增** |
| 0 | [00_深度分析.md](00_深度分析.md) | 追加 V0.4.0 5W1H/追问/钢人 |
| 1 | [01_规划快照.md](01_规划快照.md) | 覆写 |
| 2 | [02_事实基线.md](02_事实基线.md) | 追加 |
| 3 | [03_需求基线复核.md](03_需求基线复核.md) · [03a_统一需求追溯矩阵.md](03a_统一需求追溯矩阵.md) | 03a 重新生成（99 条） |
| 4 | [04_契约冻结包.md](04_契约冻结包.md) + [contracts/](contracts/README.md)（含 `07-monitoring.contract.ts`） | 追加监控增量 |
| 5 | [05_数据模型基线.md](05_数据模型基线.md) + [database/001_init.sql](database/001_init.sql) · [database/002_monitoring.sql](database/002_monitoring.sql) | 追加 §5.6 M-002 |
| 6 | [06_垂直切片清单.md](06_垂直切片清单.md) · [04_planning/stages/](04_planning/stages/) STAGE-S0..S12（一步一文件） | 追加 S10–S12 |
| 7 | [07_原子任务卡全集.md](07_原子任务卡全集.md) · [05_execution/task-index.md](05_execution/task-index.md) · tasks/TASK-001..073 | 重新生成 |
| 8 | [08_依赖DAG.md](08_依赖DAG.md) | 重新生成 |
| 9 | [09_所有权矩阵.md](09_所有权矩阵.md) | 重新生成（新增 lib/monitoring → Agent-API） |
| 10 | [10_档位分配与成本预算.md](10_档位分配与成本预算.md) | 重新生成 |
| 11 | [11_基线指标.md](11_基线指标.md) | 追加 |
| 12 | [12_风险与待裁决.md](12_风险与待裁决.md) | 覆写 |
| 13 | [13_落盘清单.md](13_落盘清单.md) | 覆写 |
| 14 | [14_自检结果.md](14_自检结果.md) | 追加 V0.4.0 自检 |
| 15 | [15_前提与局限.md](15_前提与局限.md) | 追加 |
| 16 | [16_第一刀与启动顺序.md](16_第一刀与启动顺序.md) | 覆写 |
| — | 17 / 17b / 18 | 继承（历史 lineage） |

## 复现

```bash
cd docs/任务规划V0.4.0/_generator && python3 gen.py && python3 gen_rtm.py && python3 gen_outline.py   # 卡/索引/DAG/矩阵/成本/阶段/RTM/大纲
cd ../contracts && ../../../node_modules/.bin/tsc -p tsconfig.json && ../../../apps/web/node_modules/.bin/tsx --tsconfig tsconfig.json selfcheck-monitoring.ts
```

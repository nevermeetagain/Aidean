# TASK-060：目录采集器框架 + 3 个公开源（OpenRouter /api/v1/models、AIHubMix /api/v1/models、Quanzil /api/pricing）

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.3.0→V0.4.0：新增（V0.4.0 模型源监控）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-002/003/006/007
- RTM 追溯（V0.4.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-002、REQ-M-007
- 来源方案：DESIGN-004 / ADR-P007

## 目标
lib/monitoring/catalog/ 下 CatalogCollector 接口 + 3 实现，各自把源响应归一为 ProviderModelObservation[]（价格统一为 USD/1M tokens 原币字段 + 原始字段保留），fixture 单测通过；不依赖任何 API Key

## 输入
- 文档：`docs/任务规划V0.4.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/任务规划V0.4.0/19_外部来源核验证据.md（实测字段）`；`apps/web/lib/sync/adapters/openrouter.ts`；`apps/web/lib/sync/adapters/quanzil.ts`
- 契约：`ProviderModelObservationSchema`；`MonitoringSourceSchema`
- 前置任务：TASK-056
- 前置状态：TASK-056 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/monitoring/catalog/types.ts`
  - `apps/web/lib/monitoring/catalog/openrouter.ts`
  - `apps/web/lib/monitoring/catalog/aihubmix.ts`
  - `apps/web/lib/monitoring/catalog/quanzil.ts`
  - `apps/web/lib/monitoring/catalog/registry.ts`
  - `apps/web/lib/monitoring/catalog/__tests__/*.spec.ts + fixtures/*.json（截取 ≤20 条真实响应）`
  - `docs/任务规划V0.4.0/06_validation/evidence/EVD-060/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 复用 lib/security/url-policy safeFetch/readCappedJson（响应上限按源配置，OpenRouter 实测 ~773KB、AIHubMix ~892KB，设 4MB 上限）
2. [ ] OpenRouter：pricing.prompt/completion 为 USD/token 字符串 → ×1e6；`?output_modalities=all` 拉全量（实测默认仅 text 462，all 667）
3. [ ] Quanzil：复用既有 QuanzilAdapter 的 ratio→价格换算函数（抽出纯函数，不改 adapter 行为），vendors[] 查表
4. [ ] AIHubMix：字段 model_id/model_name/developer_id → 观测；价格字段按实测 fixture 映射，缺失置 null 不猜
5. [ ] registry.ts：key→collector，键集合须与 seed monitoringSourcesData 一致（单测断言）
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/monitoring/catalog` 全绿
- [ ] 每个 collector 对 fixture 产出的每条观测均通过 ProviderModelObservationSchema.parse
- [ ] OpenRouter fixture 中 openai/gpt-4 价格 prompt=30、completion=60（USD/1M）断言
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/catalog && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.4.0/06_validation/evidence/EVD-060/`

## 允许修改
- `apps/web/lib/monitoring/catalog/`
- `docs/任务规划V0.4.0/06_validation/evidence/EVD-060/**`

## 禁止修改
- `apps/web/lib/sync/adapters/**（本卡只读复用）`
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.4.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-056
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-061, TASK-070
- 阻塞条件：源响应形状与 fixture 不符且无法确定字段语义 → 该源置 kind=unsupported 并回报，不得猜测映射

## 建议执行档位
opus　理由：跨源归一（价格单位/模型 ID 规范化）是监控体系核心，高难度

## 升级条件
价格单位歧义 → 升 opus 与 ADR-P005 对齐；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 10h　≥2h

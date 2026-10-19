# TASK-068：上架同步：观测 → ProviderModelOffering（源↔平台实体映射，listedAt=firstSeenAt，isActive=isListed）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**opus** ｜ **条件卡：待 U-M5（provider 映射到 ModelProvider 还是 APIStation）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；条件卡，待 U-M5 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-005/006
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-006
- 来源方案：DESIGN-004 / ADR-P007

## 目标
按 U-M5 裁决：方案A 映射到 ModelProvider.code、方案B 映射到 APIStation；只更新 sync 所有字段（listedAt/isActive/价格原币），不覆盖人工字段（defaultMultiplier/discount*），每次写入留 EvidenceChain

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/product/design/功能设计文档.md 五、字段所有权矩阵`
- 契约：`ProviderModelObservationSchema`
- 前置任务：TASK-059
- 前置状态：U-M5 已裁决；TASK-059 已合并；U-24 已裁决（monitoring_sources.mapped_entity_id 为 uuid 而 model_providers.id / api_stations.id 为 text：推荐 A＝只存实体 id、联表 ::text、非 uuid 拒绝单测；B＝ADR 改列为 text）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/writers/offering-sync.ts（新建）`
  - `apps/web/lib/sync/writers/offering-sync.spec.ts（新建）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-068/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 映射表：monitoring_sources.mappedEntityType/mappedEntityId（M-002 已含字段）
2. [ ] 模型对齐：仅 normalizedModelId 精确命中 AiModel.code 才写；未命中进入 DiscoveryCandidate(candidateType='model') 待人工
3. [ ] 单测：人工字段不被覆盖、未命中不写 offering
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿（≥5 用例）
- [ ] tsc exit 0
- [ ] 人工字段保持断言通过
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/sync/writers/offering-sync.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-068/`

## 允许修改
- `apps/web/lib/sync/writers/offering-sync.ts`
- `apps/web/lib/sync/writers/offering-sync.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-068/**`

## 禁止修改
- `apps/web/prisma/migrations/2026092*、20261008*、20261010*、20261012*（既有迁移只读）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-059
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-M5 未裁决 → 不执行（条件卡）

## 建议执行档位
opus　理由：实体映射（ModelProvider vs APIStation）与模型身份对齐，错误会污染人工数据

## 升级条件
映射歧义 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 8h　≥2h

# TASK-059：仓储：目录快照与观测写入器（幂等、原始响应哈希、首次/末次出现）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-003/004/005
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-003、REQ-M-004
- 来源方案：DESIGN-004 / ADR-P007

## 目标
lib/sync/writers/catalog-snapshot.ts 提供 persistCatalogSnapshot(sourceKey, fetchedAt, items, rawSha256)：同源同 rawSha256 重复调用不产生新快照；观测按 (sourceKey, externalModelId) upsert，维护 firstSeenAt/lastSeenAt/isListed

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-004-模型源监控体系.md`
- 契约：`CatalogSnapshotSchema`；`ProviderModelObservationSchema`
- 前置任务：TASK-058
- 前置状态：TASK-058 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/writers/catalog-snapshot.ts（新建）`
  - `apps/web/lib/sync/writers/catalog-snapshot.spec.ts（新建，Prisma mock）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-059/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 实现 persistCatalogSnapshot：事务内 create snapshot（rawSha256 唯一冲突→返回既有）→ 批量 upsert observations → 将本次未出现的 isListed=true 观测置 false 并记 delistedAt
2. [ ] 原始响应体不入库，仅存 sha256 + 字节数 + 采样前 2KB（rawSample）
3. [ ] 单测覆盖：首采/重复/下架/重新上架 4 场景
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/sync/writers/catalog-snapshot.spec.ts` 全绿（≥4 用例）
- [ ] `pnpm --filter web exec tsc --noEmit` exit 0
- [ ] 重复调用断言 snapshot.create 仅 1 次
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/sync/writers/catalog-snapshot.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-059/`

## 允许修改
- `apps/web/lib/sync/writers/catalog-snapshot.ts`
- `apps/web/lib/sync/writers/catalog-snapshot.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-059/**`

## 禁止修改
- `apps/web/prisma/**`
- `apps/web/lib/sync/writers/index.ts`
- `apps/web/prisma/migrations/2026092*、20261008*、20261010*、20261012*（既有迁移只读）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-058
- 资源锁串行（同文件，须在其后执行）：TASK-012
- Blocks：TASK-061, TASK-066, TASK-068
- 阻塞条件：需改 schema → 停止回报 Agent-Data 串行队列

## 建议执行档位
sonnect　理由：CRUD + 幂等键，契约与表已冻结

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h

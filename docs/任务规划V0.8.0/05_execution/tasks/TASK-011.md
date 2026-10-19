# TASK-011：ADR-P003 + 迁移 M-001：is_current 改为部分唯一索引（WHERE is_current）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**opus**

> V0.8.0 状态：**镜像已落地·真库未验**｜V0.8.0 复核（c2da219）：迁移 20261014000000_model_prices_partial_current_unique/migration.sql 在；schema.prisma 已去 @@unique([modelId,isCurrent])；PG16 重放 UNKNOWN（TASK-091）（V0.7.0 判定：他线声称完成·证据不足）；剩余工时 0（原 6h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性，已确认缺陷））
- 来源需求：REQ-F-14 / REQ-F-12
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-019
- 来源方案：ADR-P003

## 目标
迁移 20261014000000_model_prices_partial_current_unique 删除 model_prices_model_id_is_current_key，新建 UNIQUE INDEX ... WHERE is_current = true；空库重放与存量库升级均成功

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/decisions/ADR-P003-价格当前行部分唯一索引.md`；`docs/任务规划V0.5.0/database/001_init.sql（M-001 草案）`
- 契约：`数据模型基线 §5 M-001`
- 前置任务：TASK-010
- 前置状态：TASK-010 复现成立

## 输出
- 新增/修改的文件路径：
  - `apps/web/prisma/migrations/20261014000000_model_prices_partial_current_unique/migration.sql`
  - `apps/web/prisma/schema.prisma（移除 @@unique([modelId,isCurrent]) 并以注释指向迁移）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-011/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 迁移前置核验 SQL：is_current=true 重复组=0（写入迁移注释）
2. [ ] DROP INDEX + CREATE UNIQUE INDEX ... WHERE is_current
3. [ ] schema.prisma 移除 @@unique，保留 @@index([isCurrent])；注释说明部分索引由迁移维护
4. [ ] 空库：migrate deploy 17 条全成功；`prisma migrate diff --from-migrations --to-schema-datamodel --shadow-database-url` 记录差异仅为该部分索引（Prisma 无法表达，需在 ADR 中登记豁免）
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] CI e2e-skeleton job 空库重放 17 条迁移成功
- [ ] TASK-010 集成测试由红转绿（第二次同步不再 P2002）
- [ ] 并发两条 is_current=true 写入仍被唯一索引拒绝（集成测试断言）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec prisma migrate deploy && pnpm --filter web exec vitest run lib/sync/writers/__tests__/persist-prices.int.spec.ts
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-011/`

## 允许修改
- `apps/web/prisma/migrations/20261014000000_model_prices_partial_current_unique/**`
- `apps/web/prisma/schema.prisma`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-011/**`

## 禁止修改
- `apps/web/prisma/migrations/2026091*/**`
- `apps/web/prisma/migrations/2026092*/**`
- `apps/web/prisma/migrations/2026093*/**`
- `apps/web/prisma/migrations/0000_init/**`
- `apps/web/prisma/migrations/202610[01]*/**（既有迁移只读）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-010
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-012, TASK-027, TASK-028, TASK-058
- 阻塞条件：存量库存在 is_current=true 重复组 → 停止，先出清洗方案再迁移

## 建议执行档位
opus　理由：破坏性 DDL + Prisma 不原生支持部分索引，需 ADR 级决策

## 升级条件
需改既有迁移 → 升 fable；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 0h　<2h

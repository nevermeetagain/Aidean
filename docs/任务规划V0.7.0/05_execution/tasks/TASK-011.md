# TASK-011：ADR-P003 + 迁移 M-001：is_current 改为部分唯一索引（WHERE is_current）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**opus**

> V0.7.0 状态：**他线声称完成·证据不足**｜V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-011/）；镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；app/api/v1/system/ 仅 health、navigation（无 ready）。处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性，已确认缺陷））
- 来源需求：REQ-F-14 / REQ-F-12
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-019
- 来源方案：ADR-P003

## 目标
迁移 20261014000000_model_prices_partial_current_unique 删除 model_prices_model_id_is_current_key，新建 UNIQUE INDEX ... WHERE is_current = true；空库重放与存量库升级均成功

## 输入
- 文档：`docs/任务规划V0.7.0/03_solution/decisions/ADR-P003-价格当前行部分唯一索引.md`；`docs/任务规划V0.5.0/database/001_init.sql（M-001 草案）`
- 契约：`数据模型基线 §5 M-001`
- 前置任务：TASK-010
- 前置状态：TASK-010 复现成立

## 输出
- 新增/修改的文件路径：
  - `apps/web/prisma/migrations/20261014000000_model_prices_partial_current_unique/migration.sql`
  - `apps/web/prisma/schema.prisma（移除 @@unique([modelId,isCurrent]) 并以注释指向迁移）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-011/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.7.0/06_validation/evidence/EVD-011/`

## 允许修改
- `apps/web/prisma/migrations/20261014000000_model_prices_partial_current_unique/**`
- `apps/web/prisma/schema.prisma`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-011/**`

## 禁止修改
- `apps/web/prisma/migrations/2026091*/**`
- `apps/web/prisma/migrations/2026092*/**`
- `apps/web/prisma/migrations/2026093*/**`
- `apps/web/prisma/migrations/0000_init/**`
- `apps/web/prisma/migrations/202610[01]*/**（既有迁移只读）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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
中　约 6h　≥2h

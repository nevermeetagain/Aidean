# TASK-010：固化复现：PG16 集成测试证明二次写价违反唯一索引（规划期已在 PGlite PG16.4 复现 23505）

> 版本: v0.2 | 更新: 2026-10-14 | 变更: 任务规划V0.2.0（基于 main@59e83dd 复核；未实现需求核查/统一规划体系）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**sonnect**

> V0.1.0→V0.2.0：修订：缺陷由「部分确认」升级为「已确认」（PGlite PG16.4 + 16 条真实迁移 + 1:1 SQL：第 2 次写价 23505，EVD-BASELINE-V2/pglite-repro-p2002.txt）；本卡由「复现或证伪」改为「固化为回归测试」

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性，已确认缺陷））
- 来源需求：REQ-F-14 数据供给/采集（需求 §3.4.1）/ REQ-F-12 限时优惠前置
- RTM 追溯（V0.2.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-019
- 来源方案：ADR-P003

## 目标
新增集成测试在真实 PG16 上断言：现行 persistPrices 第二次写价抛 P2002（SQLSTATE 23505），作为 TASK-011/012 的红灯测试

## 输入
- 文档：`apps/web/prisma/schema.prisma:481 @@unique([modelId,isCurrent])`；`apps/web/prisma/migrations/20260925170000_align_unique_indexes/migration.sql`；`apps/web/lib/sync/writers/index.ts:74-95 persistPrices`
- 契约：`无（数据层缺陷复现）`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并（CI 有 PG）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/writers/__tests__/persist-prices.int.spec.ts（新建，需 DATABASE_URL 才运行，否则 skip）`
  - `docs/任务规划V0.2.0/06_validation/evidence/EVD-010/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 以 EVD-BASELINE-V2/repro.mjs 的 SQL 序列为蓝本改写为 vitest 集成测试（Prisma 客户端，DATABASE_URL 门控）
2. [ ] 断言：第 1 次成功、第 2/3 次 P2002；同批 2 条 is_current=true 亦 P2002
3. [ ] 无 DATABASE_URL 时 describe.skip，不影响 1081 基线
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] CI PG16 上该 spec 在 TASK-011 之前为红（预期失败已用 it.fails 标注）且错误码=P2002
- [ ] 无 DATABASE_URL 时 spec 自动 skip，`pnpm --filter web test` 仍 1081 通过
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
DATABASE_URL=postgresql://... pnpm --filter web exec vitest run lib/sync/writers/__tests__/persist-prices.int.spec.ts
```

## 证据路径
`docs/任务规划V0.2.0/06_validation/evidence/EVD-010/`

## 允许修改
- `apps/web/lib/sync/writers/__tests__/**`
- `docs/任务规划V0.2.0/06_validation/evidence/EVD-010/**`

## 禁止修改
- `apps/web/prisma/**`
- `apps/web/lib/sync/writers/index.ts`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.2.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/**（上一版规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-011
- 阻塞条件：真 PG16 上未复现（与 PGlite 结论矛盾）→ 停止，升 opus 复核 PGlite 差异

## 建议执行档位
sonnect　理由：集成测试编写

## 升级条件
结果不稳定 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 4h　≥2h

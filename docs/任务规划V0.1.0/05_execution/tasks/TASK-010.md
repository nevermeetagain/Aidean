# TASK-010：复现：model_prices (model_id,is_current) 唯一约束致二次同步失败

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**sonnect**

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性））
- 来源需求：REQ-F-14 数据供给/采集（需求 §3.4.1）/ REQ-F-12 限时优惠前置
- 来源方案：ADR-P003

## 目标
在真实 PG16 上证明：同一模型第二次 persistPrices（已存在一条 is_current=false 历史行时）抛 P2002，或证伪该缺陷

## 输入
- 文档：`apps/web/prisma/schema.prisma:481 @@unique([modelId,isCurrent])`；`apps/web/prisma/migrations/20260925170000_align_unique_indexes/migration.sql`；`apps/web/lib/sync/writers/index.ts:74-95 persistPrices`
- 契约：`无（数据层缺陷复现）`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并（CI 有 PG）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/writers/__tests__/persist-prices.int.spec.ts（新建，需 DATABASE_URL 才运行，否则 skip）`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-010/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 建模型 → persistPrices 一次 → 再一次 → 第三次
2. [ ] 断言第二/三次行为并记录真实错误码
3. [ ] 多价格数组（prices.length=2）一次写入是否触发唯一冲突同测
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 在 CI PG 上运行得到确定结论（复现 or 证伪），证据附完整错误栈
- [ ] 无 DATABASE_URL 时 spec 自动 skip 不影响 1081 基线
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
DATABASE_URL=postgresql://... pnpm --filter web exec vitest run lib/sync/writers/__tests__/persist-prices.int.spec.ts
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-010/`

## 允许修改
- `apps/web/lib/sync/writers/__tests__/**`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-010/**`

## 禁止修改
- `apps/web/prisma/**`
- `apps/web/lib/sync/writers/index.ts`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-011
- 阻塞条件：证伪（未复现）→ TASK-011/012 取消，S4 改依赖 TASK-010 结论

## 建议执行档位
sonnect　理由：集成测试编写

## 升级条件
结果不稳定 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 4h　≥2h

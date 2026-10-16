# TASK-081：后台价格批量写入 POST /api/v1/admin/prices/batch-upsert（requestId 幂等）

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.4.0→V0.5.0：V0.5.0 新增（FIX-10）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-061
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-061
- 来源方案：功能设计文档 §209-211

## 目标
批量 upsert ≤500 行；同一 requestId 重放返回首次结果且不重复写；逐行写 audit_logs

## 输入
- 文档：`docs/product/design/功能设计文档.md:209-211`；`apps/web/app/api/v1/admin/models/batch/route.ts（参照）`
- 契约：`PriceBatchUpsertSchema（由 TASK-082 落入 shared）`
- 前置任务：TASK-082, TASK-028
- 前置状态：TASK-082 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/admin/prices/batch-upsert/route.ts（新建）`
  - `apps/web/lib/features/auth/__tests__/admin-prices-batch.spec.ts（新建）`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-081/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] requestId 存幂等键（复用既有幂等机制，若无则停止提 ADR）
2. [ ] 事务内逐行 upsert + writeAudit
3. [ ] 单测：成功/重放/超限/越权
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿
- [ ] tsc exit 0
- [ ] 非 admin 调用返回 403
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-prices-batch.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-081/`

## 允许修改
- `apps/web/app/api/v1/admin/prices/batch-upsert/`
- `apps/web/lib/features/auth/__tests__/admin-prices-batch.spec.ts`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-081/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-082, TASK-028
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无既有幂等存储 → 停止提 ADR

## 建议执行档位
sonnect　理由：CRUD 扩展，幂等模式参照 models/batch

## 升级条件
需新表 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h

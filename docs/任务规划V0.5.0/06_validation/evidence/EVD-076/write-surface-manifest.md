# EVD-076 · model_change_logs 写入面清单（TASK-076 证据）

> 版本: v0.5 | 更新: 2026-10-14 | 变更: S1 后端红线核验取证

## 采集命令
`rg "modelChangeLog\.create" apps/web`（业务代码，排除测试 mock）

## 写入面（文件:行）
1. `apps/web/lib/sync/writers/index.ts:214` — sync UPDATE 分支，`changeType=SYNC`、`source=sync_script`、`syncBatchId=batchId`
2. `apps/web/lib/sync/writers/index.ts:269` — sync CREATE 分支，`changeType=CREATE`、`source=sync_script`、`syncBatchId=batchId`
3. `apps/web/lib/features/admin/model-change-log.ts:32` — `writeModelChangeLog()`（admin 手动统一漏斗），`source=admin_manual`、`syncBatchId=null`、`validationStatus=pending`
   - 调用面（均经此漏斗留痕）：
     - `apps/web/app/api/v1/admin/models/route.ts:120`（CREATE）
     - `apps/web/app/api/v1/admin/models/[id]/route.ts:98`（UPDATE）
     - `apps/web/app/api/v1/admin/models/[id]/route.ts:162`（DELETE）
     - `apps/web/app/api/v1/admin/sync/changes/[id]/revert/route.ts:104`（revert）

## 结论
- sync 路径（UPDATE/CREATE 两处）+ admin 单条 CRUD/revert（经 writeModelChangeLog 漏斗，覆盖 4 个入口）均写 ModelChangeLog。
- change-log-coverage.spec.ts 以「行为断言 + 已知漏斗计数 + 写入口对账扫描」三重锁定，防止新增未留痕的 AiModel 写入口。

## ⚠ 缺陷登记 DEFECT-076-A（本卡不修业务码，另立卡）
- **类别**：数据留痕覆盖缺口（违反 REQ-F-055「人工与 sync 写操作均写 model_change_logs」）。
- **根因**：`apps/web/app/api/v1/admin/models/batch/route.ts`（第 49/55/61/67 行）经 `prisma.aiModel.updateMany` 批量改写**人工/受控字段** `isActive` / `visibility` / `deletedAt`（activate/deactivate/hide/delete），但第 74-84 行**仅调用 `writeAudit`，未调用 `writeModelChangeLog`**（该文件不 import 漏斗）。
- **影响**：批量操作的字段级变更不进 ModelChangeLog → 无法经 `admin/sync/changes` 审计/回滚；与单条 CRUD/revert 行为不一致。
- **证据**：
  - `rg "aiModel\.(create|update|updateMany|delete|deleteMany)" apps/web/app/api/v1/admin` → 命中 4 文件（revert/models/[id]/batch）。
  - 其中仅 batch 文件 `!includes("writeModelChangeLog")`。
- **核验机制**：change-log-coverage.spec.ts「写入口对账」用例将 batch 列入 `KNOWN_UNLOGGED_EXCEPTIONS`，并断言未留痕清单恰等于该例外——若有人新增未留痕 AiModel 写入口即失败（防护真实生效）。
- **处置**：留痕修复属业务代码变更，超出 TASK-076「只读核验」授权，另立卡（建议 TASK-076-FIX）实现 batch 路由 per-字段 change-log 写入。
- **验证结果**：`vitest run` 11 files / 71 tests passed；`tsc --noEmit` exit 0（见 vitest-run.txt / tsc.txt）。

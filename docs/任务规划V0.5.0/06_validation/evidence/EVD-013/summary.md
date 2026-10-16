# EVD-013 · S1 文档同步取证（TASK-013）

> 版本: v0.6 | 更新: 2026-10-15 | 变更: 闭环审查反馈 #2（EVD-010/011/012 证据可追溯性）

## 改动范围（git status，均在「允许修改」内）
- `scripts/check-docs-facts.mjs`：spec-count 期望 151 → **156**（+persist-prices.int/persist-prices 2、field-ownership/change-log-coverage/tier-order 3）
- `docs/architecture/数据库文档.md`：v2.10 → v2.11；§二 `model_prices` 行补 `UNIQUE(model_id) WHERE is_current=true` 部分唯一索引口径；§四 追加迁移计数 17 实测与 M-001（`20261014000000_model_prices_partial_current_unique`）漂移豁免
- `docs/plans/未完成事项目录.md`：v2.35 → v2.36；新增 §7.35 S1 修复闭环矩阵 + DEFECT-076-A 登记

## 事实核验（对齐真实代码/磁盘）
- 磁盘迁移目录实测 **17** 个（`Get-ChildItem prisma/migrations -Directory`），最新 = `20261014000000_model_prices_partial_current_unique` ✓
- 数据库文档 `20261014000000` 命中 **3** 次（验收标准「出现迁移名」）✓
- `git status --short` 仅上述 3 个已跟踪文件 M + `docs/任务规划V0.5.0/`（走镜像仓，不入本卡提交）✓

## 门禁结果（详见 check-docs-rule.txt / check-docs-facts.txt）
- `node scripts/check-docs-rule.mjs` → **exit 0**（铁律1 apps/ 无实体 md；数字真源 schema model=68/enum=37/admin域=36/admin页=32/Next.js=15.0.x）
- `node scripts/check-docs-facts.mjs` → **All 14 assertions passed / exit 0**（含修正后的 spec-count=156）

## 审查反馈 #2 闭环（证据可追溯性）

首轮 CodeReview 指出：数据库文档 §四 与台账 §7.35 声称「空库重放 17/17、migrate diff 零漂移、取证于 `06_validation/`」，但磁盘缺 `EVD-010/011/012/`，且旧表述「migrate diff 零漂移（30 字符注释差）」不精确。处理：

- **重跑真实证据**（docker `shared-postgres` 全新空库 `aidean_evd13`，2026-10-15）：
  - `EVD-011/`：`migrate-deploy-empty.txt`（17 migrations found → All applied）、`migrate-status.txt`（up to date）、`pg-indexes-model_prices.txt`（部分唯一索引物理落地）、`migrate-diff.txt`（migrations→schema 为空）、`summary.md`
  - `EVD-010/`：`vitest-int.txt`（persist-prices.int 真实 PG16 2 passed）、`summary.md`
  - `EVD-012/`：`vitest-unit.txt`（persist-prices.spec 2 passed）、`summary.md`
- **文档口径订正**：数据库文档 §四 L123 与台账 §7.35 TASK-011 行删除「零漂移·30 字符注释差」的不精确表述，改为「migrate diff（migrations→schema.datamodel）为空——Prisma 不把 schema 无法表达的 `WHERE` 部分索引计为反向漂移（ADR-P003 豁免）」并逐条挂 EVD 文件路径。
- **安全核验**：扫描 EVD-010/011/012 全部文件，无密码/完整连接串泄漏（Prisma 输出自动脱敏，`Datasource ... at localhost:5435` 不含凭据）✓
- **临时资源**：`aidean_evd13`/`aidean_shadow13` 为取证临时库，CLOSE 阶段 DROP 清理。

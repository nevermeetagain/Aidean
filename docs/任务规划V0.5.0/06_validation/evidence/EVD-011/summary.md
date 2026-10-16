# EVD-011 — TASK-011 迁移 M-001 空库重放与漂移核验

> 卡：TASK-011（S1 价格历史唯一约束修复，REQ-F-019 / ADR-P003）
> 取证时间：2026-10-15（本地）
> 环境：docker `shared-postgres`（PostgreSQL 16，宿主 `localhost:5435`），Prisma 6.19.3

## 结论（已确认可复核）

| 断言 | 证据文件 | 实测结果 |
|---|---|---|
| 全新空库重放全链迁移 | `migrate-deploy-empty.txt` | `17 migrations found` → `All migrations have been successfully applied.`（末条 `20261014000000_model_prices_partial_current_unique`） |
| 重放后 schema 与迁移一致 | `migrate-status.txt` | `Database schema is up to date!` |
| M-001 部分唯一索引物理落地 | `pg-indexes-model_prices.txt` | `model_prices_model_id_current_key` = `CREATE UNIQUE INDEX ... ON model_prices USING btree (model_id) WHERE (is_current = true)` |
| schema↔migrations 反向漂移 | `migrate-diff.txt` | `migrate diff --from-migrations --to-schema-datamodel` 输出 `-- This is an empty migration.`（Prisma 不把 schema 无法表达的 `WHERE` 部分索引计为反向漂移） |

## 复现步骤（不含凭据）

1. `docker exec shared-postgres psql -U root -d postgres -c 'CREATE DATABASE aidean_evd13;'`
2. `DATABASE_URL` 指向 `aidean_evd13` 后 `npx prisma migrate deploy`
3. `npx prisma migrate status`
4. `psql -U root -d aidean_evd13 -c "SELECT indexname,indexdef FROM pg_indexes WHERE tablename='model_prices';"`
5. `npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma --shadow-database-url <空 shadow 库> --script`

## 口径订正说明

先前文档表述「`migrate diff` 零漂移（30 字符注释差）」不够精确。据本次可复核证据修正为：
- **物理层**：M-001 部分唯一索引由迁移直建，空库重放后真实存在（`pg_indexes` 实证）。
- **工具层**：`migrate diff`（migrations→schema.datamodel）为空，因 Prisma schema 无法表达 `WHERE` 局部索引，故 `ModelPrice` 移除 `@@unique([modelId,isCurrent])` 后不构成工具可见的反向漂移——该差异按 **ADR-P003 豁免**登记。
- **风险残留**：`migrate dev` 裸跑可能删除手工索引，建议后续加 gate（见 EVD-076 CodeReview CONSIDER）。

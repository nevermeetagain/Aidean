# Aidean 数据库初始化脚本

> 版本: v2.0 | 更新: 2026-08-26 | 变更: 表结构改由 Prisma schema 全权管理，本目录仅保留扩展安装；删除全部建表/索引/约束/触发器/种子 SQL（含 Agent/IDE 与 RBAC 遗留域）

## 职责划分（重要）

- **本目录（docker-entrypoint-initdb.d）**：仅安装 PostgreSQL 扩展。
- **表结构**：以 `prisma/schema.prisma` 为唯一真源（技术架构决策 D1），由 `prisma db push`（开发）或 `prisma migrate deploy`（生产）创建。
- **种子数据**：由 `prisma/seed.ts` 提供。

## 脚本清单

| 文件 | 说明 |
|------|------|
| 00_extensions.sql | 扩展安装：pgcrypto / uuid-ossp / pg_trgm / btree_gin |

## 扩展用途

- `pgcrypto`：敏感数据加密（API Key 等）
- `uuid-ossp`：UUID 生成函数
- `pg_trgm`：模型名/厂商名模糊搜索
- `btree_gin`：数组字段 GIN 索引

## 历史清理记录（2026-08-26）

以下脚本已删除（git 可追溯）：

- 建表/索引/约束/触发器：01_triggers、02_create_schemas、03_create_tables、04_create_indexes、05_create_constraints、06_create_triggers（与 Prisma schema 冲突）
- 旧种子：02_seed、08_seed_data（改由 prisma/seed.ts）
- Agent/IDE 遗留域（不属于本项目）：09–13 全部
- 重复扩展脚本：00_create_extensions、01_init_extensions（含未启用的 postgis/ltree/intarray/unaccent）

## 分区说明

`usage_logs` 等大表的时间分区（PARTITION BY RANGE + pg_partman）在实施期以 Prisma migration raw SQL 落地，不在初始化脚本中处理。

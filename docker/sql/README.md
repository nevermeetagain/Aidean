# docker/sql

Docker 初始化 SQL 目录，由 `docker-compose.yml` 挂载到 `/docker-entrypoint-initdb.d/`。

## init/

仅包含 PostgreSQL 扩展安装脚本：

- `00_extensions.sql` — 安装 `pgcrypto`、`uuid-ossp` 等扩展

> **Prisma 是数据库 schema 的唯一真实来源**（single source of truth）。
> 表结构、索引、约束全部由 `prisma/schema.prisma` + `prisma migrate` 管理。
> 本目录不包含任何 DDL（CREATE TABLE）。

## .example/

历史遗留 SQL 文件（`aidean_full_init.sql` 61 表全量初始化、`partition/07_partition_setup.sql` 36 表分区）
已移至 `.example/`，不在生产 compose 挂载路径中，仅供历史参考。

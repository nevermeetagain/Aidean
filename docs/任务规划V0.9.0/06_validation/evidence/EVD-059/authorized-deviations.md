# EVD-059：偏差记录（authorized-deviations）

> 版本: v1.0 | 更新: 2026-10-19 | 变更: TASK-059 收尾记录

## D-1 函数签名新增第 5 参 `meta`（承接 schema 非空列，不伪造数据）

- 卡面 L18 名义签名：`persistCatalogSnapshot(sourceKey, fetchedAt, items, rawSha256)`。
- 实测约束：`catalog_snapshots.raw_bytes`（Int，NOT NULL，**无默认**）与 `source_url`（NOT NULL）无法从这 4 参推出；`raw_bytes` 若省略将由 Prisma 运行时报缺失，若伪造则违背数据真实性。
- 处置：新增第 5 参 `meta: { rawBytes, rawSample?, sourceUrl? }`。`rawSample` 缺省存 ""（对齐 schema 默认）、`sourceUrl` 缺省回退 `MonitoringSource.endpoint`。前 4 个名义参数顺序与语义完全保持；这是对欠定签名的**必要补全**，非语义变更。

## D-2 spec 文件位置：平铺 `writers/`（非 `__tests__/`）

- 卡面允许路径与验证命令均指向 `apps/web/lib/sync/writers/catalog-snapshot.spec.ts`（平铺）。
- 初版曾按同目录 `persist-prices.spec.ts`（位于 `__tests__/`）的惯例放置，导致卡面定向命令 `vitest run lib/sync/writers/catalog-snapshot.spec.ts` 报「No test files found」。已按卡面显式路径改回平铺（`vi.mock` 相对路径同步改 `../../db/prisma`、动态 import 改 `./catalog-snapshot`）。改后 `SPEC_EXIT=0`。

## D-3 sourceKey → sourceId 解析（尊重软删）

- 契约 DTO（`CatalogSnapshotSchema`/`ProviderModelObservationSchema`）以 `sourceKey` 表述，而 schema 落库用 `sourceId`（FK）。
- 处置：`prisma.monitoringSource.findFirst({ where:{ key: sourceKey, deletedAt:null }, select:{ id, endpoint } })`；未命中 → 抛 `Error`（写侧防御，非对外错误码；对外 20004 由 TASK-063 端点层承载，不在本写入器职责）。

## D-4 幂等实现取「查后早返回」而非「create 撞 P2002 再回捞」

- 为使卡面验收「重复调用 snapshot.create 仅 1 次」在 mock 下确定为真，采用 `$transaction` 内先 `catalogSnapshot.findUnique({ where: sourceId_rawSha256 })`，命中即早返回，**不触达 create/upsert/updateMany**。
- 数据库层 `(sourceId,rawSha256)` 唯一索引仍作最终并发兜底（同一事务内读写一致）。

## D-5 不写 CatalogChangeEvent（职责边界）

- DESIGN-004 的 `detect(prevSnapshot, currSnapshot) → catalog_change_events` 属 TASK-061（本卡 Blocks 061）。本写入器只维护 snapshot 与 per-source observation 当前态；`lastSnapshotId` 在 upsert 中随写（SetNull 关系）。

## 范围声明

本卡改动仅落 2 个允许文件（`apps/web/lib/sync/writers/catalog-snapshot.ts`、`apps/web/lib/sync/writers/catalog-snapshot.spec.ts`）+ EVD-059/**。未触碰禁止路径：`apps/web/prisma/**`（schema/迁移，冻结——阻塞条件「需改 schema→停止回报」未触发，现有表列完全够用）、`writers/index.ts`、契约、历代规划、AGENTS.md。

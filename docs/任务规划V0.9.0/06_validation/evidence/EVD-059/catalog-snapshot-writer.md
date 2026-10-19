# EVD-059：目录快照与观测写入器（persistCatalogSnapshot）

> 版本: v1.0 | 更新: 2026-10-19 | 变更: TASK-059 交付取证（REQ-M-003/004/005；SOL/DESIGN-004 / ADR-P007）

关联卡：`docs/任务规划V0.9.0/05_execution/tasks/TASK-059.md`

## 1. 交付物

- `apps/web/lib/sync/writers/catalog-snapshot.ts`（新建）：`persistCatalogSnapshot(sourceKey, fetchedAt, items, rawSha256, meta)`
- `apps/web/lib/sync/writers/catalog-snapshot.spec.ts`（新建，Prisma mock，6 用例）

## 2. 行为语义（对齐 schema 冻结约束）

- **快照幂等**：键 `(sourceId, rawSha256)` = `catalog_snapshots_source_sha_key`（schema @@unique）。命中既有 → `$transaction` 内 `findUnique` 早返回 `{created:false}`，**不新建快照、不改观测、不产生事件**（DESIGN-004「同哈希→直接返回」）。
- **观测 upsert**：键 `(sourceId, externalModelId)` = `pmo_source_external_key`（schema @@unique）。命中走 update（保 `firstSeenAt` 不变、刷新 `lastSeenAt`/价格/`isListed=true`、清 `delistedAt`=覆盖「重新上架」）；未命中走 create（`firstSeenAt=lastSeenAt=fetchedAt`）。
- **下架**：本轮未出现且 `isListed=true` 的观测 → `updateMany({ where:{sourceId,isListed:true,externalModelId:{notIn:[...]}}, data:{isListed:false,delistedAt:fetchedAt} }`。
- **原始体不落库**：仅存 `rawSha256` + `rawBytes` + `rawSample`（截断 ≤2048，schema `raw_sample VarChar(2048)` 默认 ""）。
- **变更事件不在本写入器**：`CatalogChangeEvent` 由 `detect()`（TASK-061）产出；本卡 Blocks 061/066/068。

## 3. 验收对照（卡面 L39–L42）

| 卡面验收 | 实测（见 `verify.txt`） | 结论 |
| --- | --- | --- |
| `pnpm --filter web exec vitest run lib/sync/writers/catalog-snapshot.spec.ts` 全绿（≥4） | `SPEC_EXIT=0`，6 passed | ✅ |
| `pnpm --filter web exec tsc --noEmit` exit 0 | `WEB_TSC=0` | ✅ |
| 重复调用断言 snapshot.create 仅 1 次 | 用例 ②b：首采+同哈希再来 → `catalogSnapshot.create` 计 1 次；用例 ②：再来时 create/upsert/updateMany 均未调 | ✅ |
| diff 仅落允许范围 | `git status` 仅 2 新文件（`writers/catalog-snapshot.ts`、`writers/catalog-snapshot.spec.ts`），均在允许路径；`git diff --name-only` 空 | ✅ |

回归四连：`WEB_TEST=0`（1216 passed \| 5 skipped，含本 spec 6 例）、`SHARED_TSC=0`、`SHARED_TEST=0`（210）、`WEB_TSC=0`。

## 4. 关键映射（实测事实）

- `CatalogSnapshot`（`catalog_snapshots`）：`id uuid(7)`/`sourceId`/`fetchedAt`/`itemCount`/`rawSha256 Char(64)`/`rawBytes Int(!)`/`rawSample VarChar(2048) default ""`/`sourceUrl(!)`/`createdAt`；@@unique(sourceId,rawSha256)。
- `ProviderModelObservation`（`provider_model_observations`）：`firstSeenAt(!)`/`lastSeenAt(!)`/`delistedAt?`/`isListed default true`/`lastSnapshotId?→SetNull`/价格 `Decimal(19,6)?`；@@unique(sourceId,externalModelId)。
- 契约 `ProviderModelObservationSchema` 价格=字符串（原币+单位），落 Prisma `Decimal`（接受 string/number），不做汇率换算（U-15）。
- DTO 以 `sourceKey` 表述，schema 以 `sourceId` 落库：写入器按 `MonitoringSource.findFirst({ where:{ key, deletedAt:null } })` 解析（尊重软删）。

## 5. 单测覆盖（6 用例）

① 首采 ② 重复(同哈希直接返回) ②b create 合计 1 次 ③ 下架 ④ 重新上架(保 firstSeenAt) ⑤ 源不存在抛错不开事务。

## 6. 复现

```bash
export DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public'
pnpm --filter web exec vitest run lib/sync/writers/catalog-snapshot.spec.ts
pnpm --filter web exec tsc --noEmit
```

完整输出见本目录 `verify.txt`。

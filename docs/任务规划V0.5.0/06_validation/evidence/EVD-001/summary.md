# EVD-001 — TASK-001 错误码唯一源迁入 shared + SystemReady 契约

> 卡：TASK-001（S0 L0 根基，REQ-NF-001 契约唯一源 / ADR-P001）
> 执行者：Hark(主Agent) ｜ 所有权：Agent-Contract
> 时间：2026-10-15（本地）

## 交付物（均在「允许修改」范围内）

| 文件 | 动作 | 内容 |
|---|---|---|
| `packages/shared/src/errors.ts` | 新建 | 契约②原样落地：`ERROR_CODES`（25 码=22 既有+3 新增）、`DEFAULT_STATUS_BY_CODE`、`httpStatusOf`、`ErrorBodySchema`、`ERROR_PRESENTATION`、`FAILURE_PATHS` |
| `packages/shared/src/schemas/system.schema.ts` | 新建 | 契约① §S0 `SystemReadySchema` + 类型 `SystemReady` |
| `packages/shared/src/types/index.ts` | 改 | 删除旧冲突表 `ErrorCode`/`ErrorCodeValue`（原 L71-89），头部注释订正为唯一源迁移说明 |
| `packages/shared/src/index.ts` | 改 | 增 `export * from "./errors"` 与 `./schemas/system.schema`；确认无重名冲突 |
| `packages/shared/src/__tests__/errors.spec.ts` | 新建 | 8 用例：码值唯一/新增 3 码/**22 既有码 = 迁移前 web 冻结快照逐值相等**/HTTP 映射 = web 8 条 + shared 新增 2 条/httpStatusOf 表驱动/ErrorBodySchema/PRESENTATION+PATHS 覆盖/SystemReady 冒烟（总数硬锁 25） |

## 验收逐条（证据文件）

| 验收项 | 结果 | 证据 |
|---|---|---|
| `pnpm --filter @aidean/shared exec tsc --noEmit` | **exit 0** | `shared-tsc.txt`（含 web errors.ts 跨包引用亦通过类型检查） |
| `pnpm --filter @aidean/shared test` | **13 files / 126 tests passed**（基线 118 + 新增 8） | `shared-test.txt` |
| `grep ErrorCode = packages/shared/src` | **空**（旧表已删） | `grep-old-table.txt` |
| contracts `selfcheck.ts` | `{"total":25,"web":22,"dup":[],"mism":0,"missingPres":[],"failurePaths":14,"sample":true,"bad":false}` | `selfcheck.txt`（`node tsx/cli.mjs selfcheck.ts`，于 contracts 目录运行） |
| diff 仅在允许范围 | `git diff --name-only` = index.ts / types/index.ts；新增仅 3 个允许文件 | 见本目录 |

## 阻塞条件核验（grep 复核）

`ErrorCode`/`ErrorCodeValue` 全仓引用扫描：命中仅 `.example/history/**`（铁律4 只读归档，且为 directus 遗留码非本项目）、收编底稿、以及 `apps/web/app/api/v1/_lib/errors.ts:97` 的**同名本地类型**（由 web 自身 `ERROR_CODES` 派生，与 shared 无关）。→ shared 旧表**零运行时引用**，删除安全，阻塞条件未触发。

## 说明

- 契约目录 `docs/任务规划V0.5.0/contracts/**` 为冻结只读，本卡仅落地不改契约。
- web 侧改为从 shared 重导出属 TASK-002（本卡不动 apps/**）。

## 审查反馈闭环 #1（CodeReview FAIL → Fix A）

**Blocking 命中**（子智能体 CodeReview 首轮判 FAIL）：
- **B-1（模块边界铁律违反）**：spec 第 14 行 `import { ERROR_CODES as WEB_ERROR_CODES, DEFAULT_STATUS_BY_CODE as WEB_STATUS } from "../../../../apps/web/app/api/v1/_lib/errors"` —— 全 `packages/**` 唯一起源于 `apps/web` 的静态 import；TASK-007 守卫脚本落地即 `exit 1`（本卡新引入反向依赖）。
- **B-2（跨卡时弹）**：TASK-002 让 web 从 shared 重导出后，web 键数 22→25，`webKeys.length===22` / `+3` 断言必炸；且 shared↔web 逐值对账退化为自我比对。

**Fix A 采纳（本轮返工）**：
1. 删除跨包 `import`；改用内嵌 **迁移时点冻结快照** `WEB_ERROR_CODES_SNAPSHOT`（22 键，逐字转录自 `apps/web/app/api/v1/_lib/errors.ts:38-83`）与 `WEB_STATUS_SNAPSHOT`（8 条，`errors.ts:86-95`）。
2. 总数断言由 `webKeys.length + 3` 硬锁为 `expect(Object.keys(ERROR_CODES).length).toBe(25)`，独立于 web 演化。
3. HTTP 映射用例新增 `sharedStatus[50010]=503 / sharedStatus[50011]=403` 显式断言（把 shared 相对 web 的**唯一新增项**钉死）。
4. 语义精确：快照为 TASK-002 之前的 web 现网码表；TASK-002 之后 web 改由 shared 重导出，本对账**不退化为自我比对**（`packages/**` 与 `apps/**` 分层边界完整）。

**返工后复验**：
- `pnpm --filter @aidean/shared exec tsc --noEmit` → **exit 0**
- `pnpm --filter @aidean/shared test` → **13 files / 126 tests passed**（errors.spec.ts 8 用例全绿）
- contracts `selfcheck.ts` → `{"total":25,"web":22,"dup":[],"mism":0,"missingPres":[],"failurePaths":14,"sample":true,"bad":false}`
- `grep apps/web packages/shared/src/**` → 命中全为注释（说明来源/TASK-002 备注），**零反向 import**

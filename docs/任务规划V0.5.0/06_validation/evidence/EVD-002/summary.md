# EVD-002 — TASK-002 web 侧错误码改为从 shared 重导出（消除双源）

> 卡：TASK-002（S0 L1，REQ-NF-001 / ADR-P001，Depends on TASK-001）
> 执行者：Hark(主Agent) ｜ 所有权：Agent-API
> 时间：2026-10-14（本地）

## 交付物（均在「允许修改」范围内）

| 文件 | 动作 | 内容 |
|---|---|---|
| `apps/web/app/api/v1/_lib/errors.ts` | 改 | 删除本地 22 码值 + 本地 8 条 HTTP 映射定义；改为 `export { ERROR_CODES, DEFAULT_STATUS_BY_CODE } from "@aidean/shared"`；保留 `formatZodMessage`/`ZodLikeIssue`/`ApiError`（web 运行时专属）与 `ErrorCode` 类型（现派生自 shared） |
| `apps/web/app/api/v1/_lib/response.ts` | 改 | `DEFAULT_STATUS_BY_CODE[code]`（code:number）索引 shared 唯一源表（键为 `ErrorCodeValue` 字面量联合）触发 TS7053；改为 `DEFAULT_STATUS_BY_CODE[code as ErrorCode]` 窄化断言，仍仅从 `./errors` 取符号（调用路径不变，合 spec step 2） |

## 关键决策：response.ts 最小适配（非 route.ts，无需升级 Agent-Contract）

- **现象**：`pnpm --filter web exec tsc --noEmit` 报唯一错误 `response.ts(67,23) TS7053`——宽 `number` 不能索引 `Readonly<Partial<Record<ErrorCodeValue, number>>>`。
- **判据**：阻塞条件为「任何 **route**（route.ts）因类型变化需改动 → 停止回报」。response.ts 属 `_lib` 且在 TASK-002「允许修改」清单内，非 route.ts，故为可控返工。
- **方案取舍**：选窄化断言 `code as ErrorCode`（web 本地 `ErrorCode` 与 shared `ErrorCodeValue` 同义），保持 response.ts 仅从 `./errors` import（路径不变、零外部新依赖）；运行时语义与旧表逐字等价（`statusOverride ?? 映射 ?? 50000?500:400`）。否决「内联宽化 cast 表」（跨类型 cast 可能需 `as unknown`）与「改用 httpStatusOf」（会改 import 路径，偏离 spec step 2）。

## 验收逐条（证据文件）

| 验收项 | 结果 | 证据 |
|---|---|---|
| `pnpm --filter web exec tsc --noEmit` | **exit 0** | `web-tsc.txt` |
| grep 本地码值 `^\s+[A-Z_]+: [0-9]{5},` | **无输出**（双源消除） | `grep-local-codes.txt` |
| `pnpm --filter web test`（清 shell DATABASE_URL 后） | **116 files passed / 1 skipped（int 门控）；1095 passed / 2 skipped** | `web-test.txt` |
| diff 仅在允许范围 | `git diff --name-only` = errors.ts / response.ts（2 文件） | `diff-scope.txt` |

## 环境性干扰说明（非本卡回归）

首轮 `pnpm --filter web test` 出现 `persist-prices.int.spec.ts` 套件 failed：`Database 'aidean_evd13' does not exist`。
根因＝**跨会话复用的 PowerShell 残留了上一轮 EVD-013 取证所用的 `DATABASE_URL`（指向已 drop 的临时空库）**。
该 int spec 门控为 `DB_ENABLED = !!process.env.DATABASE_URL`；清除 shell 环境变量后按设计 skip，基线不受影响。
与本卡 errors.ts 重导出**零关联**（正交模块，且无任何用例逻辑失败，仅 beforeAll 连库失败）。

## 说明

- web 全量单测 1095 通过数与迁移前基线一致（≥1081 门槛），重导出未改变任何码值/映射的运行时语义。
- 新增码 50010(SERVICE_UNAVAILABLE)/50011(FEATURE_DISABLED) 及 HTTP 映射经 shared 唯一源流入 web，属纯增量；实际落用属后续切片（TASK-003 /system/ready 用 50010）。

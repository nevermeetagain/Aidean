# EVD-009 授权偏离记录

> 版本: v0.9 | 更新: 2026-10-19 | 变更: TASK-009 执行期，记录卡面目标与允许范围/数字口径互斥（规划缺陷）的管理者授权偏离。

## 背景：卡面自相矛盾（规划缺陷）

TASK-009「目标」要求 `API接口文档 §4 列全码表`，但其「允许修改」清单（docs/architecture/**、docs/文档索引.md、scripts/check-docs-facts.mjs、EVD-009/**）**不含 `packages/**`**，且验收标准要求「diff 仅落在允许范围内」。经取证核验二者互斥：

- `§4` 是 `scripts/contract/gen-contract-tests.mjs` 解析生成 `packages/shared/src/__tests__/contract/errors.generated.spec.ts` 的 `DOC_REGISTERED` 的**唯一源**（正则 `^\|\s*(\d{5})\s*\|\s*([A-Z][A-Z0-9_]+)\s*\|` 从 §4 抽前二列并冻结进 spec）。
- CI 漂移门（`.github/workflows/ci.yml` L50-56）：`node scripts/contract/gen-contract-tests.mjs` → `git add -A packages/shared/src/__tests__/contract` → `git diff --cached --exit-code HEAD`。
- 现状：090 后 §4 仅 11 码（DOC_REGISTERED=11）。009 把 §4 扩为全码表 → DOC_REGISTERED 由 11 变 N（N≠11）→ 已提交 spec 与 CI 重生成结果不一致 → **漂移门必红**，除非同步重生成并提交 `packages/**` spec。
- 结论：「§4 列全码表」与「禁改 packages/**」在结构上不可同时满足，属卡面规划缺陷（同 090 的 §4↔契约耦合，且 009 更严重：重生成不可回避）。

## 管理者授权（AskUserQuestion 裁决）

**问题一（packages 重生成授权）**：选「**授权兼做重生成+提交 spec（推荐）**」。据 090 先例，009 完成 §4 全表后立即跑 `gen-contract-tests.mjs` 并把 `packages/shared/src/__tests__/contract/errors.generated.spec.ts` 一并提交，使本地 vitest 与 CI 漂移门均绿；此偏离记于本文件。

**问题二（§4 行数 25 vs 27）**：选「**27 码·唯一源实测（推荐）**」。

- 卡面「25 码」源自 V0.5.0 冻结契约 `contracts/02-errors.contract.ts`（25 码）。
- 真实唯一源 `packages/shared/src/errors.ts` 现为 **27 码** = 契约 25 + TASK-056 监控增量 2（`20004 MONITOR_SOURCE_NOT_FOUND`/HTTP 404、`50012 MONITOR_SOURCE_CREDENTIAL_MISSING`/HTTP 503；源码注释 L40 明写「合计 27 码」），且 090 已将此二码登 §4。
- 依 090 已确立、管理者背书的口径「数字以实测为准 / 唯一源=代码」，§4 取全 27 码（与 errors.ts 一一对应，`HTTP` 列取 `DEFAULT_STATUS_BY_CODE`+`httpStatusOf`、`前端展示` 列取 `ERROR_PRESENTATION`）。卡面「25」判定为 V0.5.0 遗留数字，本次以实测 27 覆盖，验收项 `§4 表行数` 记 `[~]`。
- 生成产物 `errors.generated.spec.ts` 的 `DOC_REGISTERED` 相应为 27（净增 16 行），交叉断言（§4 每码 ∈ live ERROR_CODES 同名同值）在 shared vitest 7 例中全过。

## 未发生的偏离（澄清）

- `scripts/check-docs-facts.mjs`：卡面允许，但 009 为纯文档改动、零代码计数漂移（route/page/spec/lib-features/@aidean-ui-refs 沿用 090 实测值），`check-docs-facts` 直接 14/14 绿，故本卡**未**编辑该脚本（step 1 的「重算漂移」= 核验后确认无漂移）。
- `envelope.generated.spec.ts`/`identity.generated.spec.ts`：本卡真源（errors.ts/permissions.ts/03-identity 契约）均未动 → 内容零变化；工作树仅 LF→CRLF 幻影，不入库。
- huaweicloud→镜像合并：§4 全码表以镜像 errors.ts 为准重生成，未套用 huaweicloud 陈旧码表（其数字口径基于旧代码线，与镜像冲突；详见 090/批次既有合并决策）。

## 结果

- §4 全 27 码单表（码位/标识/HTTP/语义/前端展示）+ 唯一源=errors.ts + `/system/ready` 登记 + 《API架构设计方案》§三 双向互引锚 + 文档索引版本同步。
- `check-docs-rule` exit 0 / `check-docs-facts` 14/14 exit 0 / gen 幂等 / 回归四连全绿。
- 提交内容变更 = 3 个允许内文档 + 1 个授权偏离 spec（`errors.generated.spec.ts`）+ 本 EVD 目录。

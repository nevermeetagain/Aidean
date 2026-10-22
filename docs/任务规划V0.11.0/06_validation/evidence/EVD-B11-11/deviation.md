# EVD-B11-11 · 偏差与裁量记录（分页参数有限性守卫统一口径，Q-11-05=A）

> 版本: v1.0 | 更新: 2026-10-22 | 变更: 初版——按 2026-10-22 分工调整，本证据只覆盖 B11-11 的核心件与参考实现；其余 15 端点接入见同目录 `handoff.md`。

## 一、交付范围（分工调整后）

| 项 | 状态 | 载体 |
|---|---|---|
| 共享件 `apps/web/lib/http/pagination.ts`（`parsePagination`/`parseLimit`/`parseOptionalInt`/`parseIntParam`/`clampInt`/`toSearchParams`） | ✅ | 32 例单测 `lib/http/pagination.spec.ts`（含 20×20 畸形输入两两组合穷举） |
| 参考实现 `admin/scripts/[id]/executions` 迁移 | ✅（行为与原 `toInt()` 等价，既有 7 例全绿） | `verify.txt` §3、`mutation.txt` |
| 棘轮守卫 `scripts/guard/pagination-guard.mjs`（`run-all` 第 6 项） | ✅ 名单外新增裸 `parseInt` / `Number(searchParams…)` → FAIL；名单内 15 个 → WARN；`--strict` 名单内也 FAIL | 3 例单测 `lib/http/pagination-guard.spec.ts` |
| 其余 15 个端点接入 + 逐端点单测 + 逐端点变异检验 | ⏸ **未做（按分工移交）** | `handoff.md` |
| 文档 | ✅ 《API接口文档》§4.2 `pagination-params` ↔ 《API架构设计方案》§五 `pagination-params-architecture`；术语表 `term-pagination-parse`；目录结构文档 §五 `lib/http/` | — |

## 二、设计决策

1. **语义与历史写法兼容**：仍用 `Number.parseInt(raw,10)`（`"10abc"`→10、`"1e3"`→1），只在 NaN 时回退；不改为严格 `/^\d+$/` 拒绝，以免接入时改变既有合法请求的行为。需要严格校验的端点可继续用 Zod。
2. **`skip` 封顶 INT32（2147483647）**：超大页码（`page=999999999999`）不再产生超出 Prisma Int / 失精度的 `skip`；页码按 `floor(MAX/pageSize)+1` 钳制。
3. **配置错误抛 `RangeError`**（如 `defaultPageSize > maxPageSize`）：属编程错误，单测/首个请求即暴露，不吞。
4. **位置 `lib/http/`**：非业务 feature、无 I/O 的 HTTP 层纯函数；不建 `index.ts`（ADR-0002）；`app/api/v1/_lib` 是 API 层私有目录，而分页解析也可被 RSC 页面复用，故放 `lib/`。
5. **守卫用棘轮而非一次性阻断**：满足「当前报告 15 个但不破 CI」，同时阻止新增；名单只减不增（单测断言 ≤15）。

## 三、重扫结论（全 `apps/web/app/api` 树）

- 裸 `parseInt` 命中文件 = **15**，正是 DEF-011-15 的 12（无守卫）+ 3（`||` 兜底）；`executions` 迁移后不再命中。行数按「任意 `parseInt(`」口径为：无守卫 12 文件 / **25** 行、兜底 3 文件 / **6** 行（含 `status` 等整数过滤参数），与 02_ 的「同行含 `parseInt(` 与 `searchParams`」口径 22 / 6 行**口径不同、不可直接比较**。
- `Number(…searchParams…)` 命中 2 处，人工复核均安全：`partner/codes`（`Number.isInteger`+区间 → 40000）、`mock-upstream`（`|| 0`）。登记于 `ALLOWLIST_P2`。
- 其余列表端点（`holds`/`logs/*`/`models`/`orders`/`users` 等）走 Zod 校验，非法值为 40000 而非 500，不在本卡范围。

## 四、未验证 / 待确认

- 15 个兄弟端点仍会 500：运行态 `GET /api/v1/admin/audit-logs?page=abc` → **HTTP 500 `code=50000`**（`verify.txt` §6b F 段，本轮实测）。**不得**表述为「分页 500 已全站修复」。
- 运行态 `?page=abc` 200 只在**参考实现 1 个端点**取证（4 组探针），用户要求的「3 个端点」需在 15 端点接入后由接手方补测，当前 `待确认`。
- 生产口径（build 产物）未取证，同 EVD-B11-10 §四。

## 五、需升级

- 无契约改动；无。

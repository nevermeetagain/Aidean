# EVD-B11-11 · 交接说明：其余 15 个列表端点接入共享分页件

> 版本: v1.0 | 更新: 2026-10-22 | 变更: 初版——B11-11（Q-11-05=A）核心件落地后，把 15 个端点的逐个接入交给执行助手；给出精确改法、单测模板、变异检验步骤与验收口径。

## 0. 已就绪（不要改）

| 件 | 路径 | 说明 |
|---|---|---|
| 共享解析件 | `apps/web/lib/http/pagination.ts` | `parsePagination` / `parseLimit` / `parseOptionalInt`（+ `parseIntParam`、`clampInt`、`toSearchParams`） |
| 参考实现 | `apps/web/app/api/v1/admin/scripts/[id]/executions/route.ts` | 已迁移；照抄它的写法 |
| 参考单测 | `apps/web/lib/features/admin/__tests__/scripts-executions-route.spec.ts` | mock prisma 的方式照抄 |
| 棘轮守卫 | `scripts/guard/pagination-guard.mjs` | `ALLOWLIST_P1` 列着 15 个待接入文件；**接入一个删一行** |

工作区：仅在分配给你的 worktree 内改；不 push；每接入 1–3 个端点提交一次。

## 1. 待接入名单（与 `ALLOWLIST_P1` 一致）

无守卫 12：`announcements`、`api-stations`、`audit-logs`、`benchmarks`、`evaluations`、`free-quotas`、`intelligence/reports`（`limit`）、`intelligence/snapshots`（`limit`）、`scripts`、`sync/batches`、`sync/changes`、`tier-mappings`
`||` 兜底 3：`capabilities`、`discovery/candidates`、`protocols`
（路径均为 `apps/web/app/api/v1/admin/<名>/route.ts`）

开工前先跑 `node scripts/guard/pagination-guard.mjs`，它会打印每个文件里裸 `parseInt` 的**行号**（包括 `status`/`type` 等整数过滤参数，不只分页）。

## 2. 改法（逐文件）

**保持每个端点现有的默认值与上限不变**——先读原代码里的 `Math.min(N, …)` 和 `|| 20` 之类，原样填进选项。

### 2.1 page / pageSize

```ts
// 前（典型）
const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
… skip: (page - 1) * pageSize, take: pageSize …

// 后
import { parsePagination } from '<相对路径>/lib/http/pagination';
const { page, pageSize, skip, take } = parsePagination(url, { defaultPageSize: 20, maxPageSize: 100 });
… skip, take …
```
- `url` 可以是 `URL`、`URLSearchParams` 或 `Request`（`parsePagination(req, …)` 也行）。
- 参数名不同（如 `size`）用 `pageSizeKey: 'size'`。
- 响应体里原来回显的 `page`/`pageSize` 继续用解构出的变量。

### 2.2 limit（intelligence reports / snapshots）

```ts
const limit = parseLimit(url, { defaultLimit: 20, max: 100 }); // 数值按原代码
… take: limit …
```

### 2.3 整数过滤参数（如 `status`、`level`）

```ts
const status = parseOptionalInt(url, 'status');      // number | undefined，绝不 NaN
if (status !== undefined) where.status = status;
```

### 2.4 相对 import 路径

从 `app/api/v1/admin/<x>/route.ts` 到 `lib/http/pagination`：
- 深度 4（`admin/<x>/route.ts`）：`'../../../../../lib/http/pagination'`
- 深度 5（`admin/<a>/<b>/route.ts`，如 `sync/batches`）：`'../../../../../../lib/http/pagination'`
数一下同文件里 `lib/db/prisma` 的 `../` 个数，照抄即可。不要新建 `index.ts`（ADR-0002 禁 barrel）。

### 2.5 删名单

把该文件从 `scripts/guard/pagination-guard.mjs` 的 `ALLOWLIST_P1` 删掉。漏删时守卫会打 `[名单过期]` WARN。

## 3. 单测模板（每个端点一份或合并到一份按 describe 分组）

放在 `apps/web/lib/features/admin/__tests__/<端点>-pagination.spec.ts`（vitest 只收 `lib/**/*.spec.ts`）。按目标路由真实 import 的模块补 `vi.mock`（看路由文件头部 import；常见：`lib/db/prisma`、`lib/features/auth/session`、`_lib/audit`）。

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {
    auditLog: {                                   // ← 换成该端点用的 model
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));
vi.mock("../../../features/auth/session", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ userId: "admin-1" }),
}));

import { prisma } from "../../../db/prisma";

const call = async (qs: string) => {
  const { GET } = await import("../../../../app/api/v1/admin/audit-logs/route");
  const res = await GET(new Request(`http://localhost/api/v1/admin/audit-logs${qs}`) as never);
  return { res, json: await res.json() };
};

describe("GET /api/v1/admin/audit-logs 分页守卫（B11-11）", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["?page=abc", "?pageSize=xyz", "?page=abc&pageSize=xyz", "?page=-1&pageSize=0", "?page=1e309"])(
    "%s → 200，且送进 Prisma 的 skip/take 为有限整数",
    async (qs) => {
      const { res, json } = await call(qs);
      expect(res.status).toBe(200);
      expect(json.code).toBe(0);
      const arg = vi.mocked(prisma.auditLog.findMany).mock.calls[0]![0] as { skip: number; take: number };
      expect(Number.isFinite(arg.skip)).toBe(true);
      expect(Number.isFinite(arg.take)).toBe(true);
      expect(arg.skip).toBeGreaterThanOrEqual(0);
      expect(arg.take).toBeGreaterThanOrEqual(1);
    },
  );

  it("正常值不变：page=2&pageSize=10 → skip=10 take=10", async () => {
    await call("?page=2&pageSize=10");
    const arg = vi.mocked(prisma.auditLog.findMany).mock.calls[0]![0] as { skip: number; take: number };
    expect(arg).toMatchObject({ skip: 10, take: 10 });
  });
});
```
- `limit` 端点：断言 `take` 有限且在 `[1, max]`。
- 有整数过滤参数的端点：加一例 `?status=abc` → `where` 里**没有** `status` 键。
- 若端点用 `$transaction` 或 `Promise.all` 以外的方式取数，按实际 mock；断言对象始终是「送进 Prisma 的实参」。

## 4. 变异检验（每个端点至少一次，结果落盘）

目的：证明你的单测真在测被修的表达式。
1. 记录 `sha256sum <route.ts>`；
2. 把该文件的 `parsePagination(...)`（或 `parseLimit`）临时改回 `git show HEAD~N:<route.ts>` 里的原写法；
3. 跑该端点的 spec：**必须失败**（典型 `expected NaN to be …` 或 `expected false to be true`）并记下退出码 `MUT_TEST_EXIT=1`；
4. 同时跑 `node scripts/guard/pagination-guard.mjs`：因已从名单删除，必须 `FAIL`、`exit 1`；
5. 还原，比对 sha256 `MATCH=True`，再跑一次 spec 全绿。

可直接改写 `EVD-B11-11/mutation.txt` 的生成脚本思路（见该文件头部的步骤输出）；载体须含**命令原文 + 输出 + 退出码**，缺退出码的不算凭证。对 `||` 兜底的 3 个端点，原写法本就不产生 NaN，变异时改为删掉 `|| 默认值` 的裸 `parseInt` 写法即可。

## 5. 验收（全部满足才算完成）

- `node scripts/guard/pagination-guard.mjs --strict` → `exit 0`（名单为空）；之后把 `scripts/guard/run-all.mjs` 里该守卫切到 `--strict` 由主责人决定；
- 15 个端点各有「非法串不送 NaN」单测，各有一份带退出码的变异检验；
- `pnpm --filter web exec tsc --noEmit --incremental false`、`pnpm --filter web lint`、`pnpm --filter web test`、`node scripts/check-docs-rule.mjs`、`node scripts/check-docs-facts.mjs` 均 exit 0；新增 spec 文件会改变 facts 的 `spec-count`，须同步更新 `scripts/check-docs-facts.mjs` 的期望值与 desc（R10-01）；
- 运行态（若能起库）：任选 ≥3 个端点 `?page=abc` 返回 200 信封，原样记录 curl 输出；起不了库就写 `待确认`，**不得**写成已通过；
- 名单清空之前，任何总结里**不得**出现「分页 500 已全站修复」。

## 6. 不要做

- 不改 `lib/http/pagination.ts` 的语义（需要新能力先提出来）；
- 不新增错误码、不碰 `packages/shared/src`；
- 不改 `docs/任务规划V0.11.0/` 下 02_/07_/12_/25_/README（由主责人整合）。

# EVD-B11-11 · 偏差与裁量记录（分页参数有限性守卫统一口径，Q-11-05=A）

> 版本: v1.4 | 更新: 2026-10-22 | 变更: 追加 §六.8（审核后修订）、§六.9（rebase 既有失败）、§六.10（终审修订）；§一「15 端点接入」由「未做」改为已完成，§四仍为交接时快照保留不改。

## 一、交付范围（分工调整后）

> 注：本表随交付推进更新；§四为交接时刻的历史快照，仅作对照，不代表最终状态。

| 项 | 状态 | 载体 |
|---|---|---|
| 共享件 `apps/web/lib/http/pagination.ts`（`parsePagination`/`parseLimit`/`parseOptionalInt`/`parseIntParam`/`clampInt`/`toSearchParams`） | ✅ | 32 例单测 `lib/http/pagination.spec.ts`（含 20×20 畸形输入两两组合穷举） |
| 参考实现 `admin/scripts/[id]/executions` 迁移 | ✅（行为与原 `toInt()` 等价，既有 7 例全绿） | `verify.txt` §3、`mutation.txt` |
| 棘轮守卫 `scripts/guard/pagination-guard.mjs`（`run-all` 第 6 项） | ✅ 名单外新增裸 `parseInt` / `Number(searchParams…)` → FAIL；`ALLOWLIST_P1` 已清空（15 个全部接入）；`--strict` 已 exit 0，但 `run-all` strict 接线未切（等 Hark 裁定） | 3 例单测 `lib/http/pagination-guard.spec.ts` |
| 其余 15 个端点接入 + 逐端点单测 + 逐端点变异检验 | ✅ **已完成**：15 个 `route.ts` 全部接入 `parsePagination`/`parseLimit`/`parseOptionalInt`；`admin-list-pagination.spec.ts` **110 例**（15 个 describe）；变异 15/15 全部捕获 | `runtime.txt`（15/15 运行态 400）、`mutation-15endpoints.txt`、`执行过程-B11-11.md` §3-4 |
| 文档 | ✅ 《API接口文档》v1.64 §4.2 `pagination-params` ↔ 《API架构设计方案》v1.21 §五 `pagination-params-architecture`；术语表 v1.25 `term-pagination-parse`（**均属白名单外必要同步，请求追认**） | — |

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

- **契约语义变化（v1.1 修订）**：本次对 15 个后台列表端点把「非法整数串 → 200 回退」改为「→ HTTP 400 + `code=40000`」，对 API 消费方是可见行为变化，已在《API接口文档》v1.64 §4.2、《API架构设计方案》v1.21 §五、术语表 v1.25 同步；无需新增错误码（复用 `40000`），无需 ADR（不偏离技术栈）。
- 参考实现 `admin/scripts/{id}/executions` 的口径是否统一，待 Hark 裁定（见 §六.3）。

## 六、15 端点接入后的偏离与现状（v1.1 追加）

1. **非法串口径：400 而非 200 回退（主动偏离 handoff §3/§5）**
   - handoff §3 模板断言 `res.status === 200`（非法串回退默认值），本轮按用户 2026-10-22 验收指令改为 **HTTP 400 + code=40000，且 Prisma 完全不被调用**。
   - 依据：① 用户明确验收「`audit-logs?page=abc` 返回 400」；② 本节 §二.1 已预留「需要严格校验的端点可继续用 Zod」；③ 静默回退会掩盖客户端 bug，且 15 个兄弟端点属同类缺陷，不修一半。
   - 边界：空串 `?page=`、`?pageSize=` 仍视同缺省（兼容表单清空）；越界合法值（`pageSize=1000`）仍钳制到 `maxPageSize`，不 400；`"10abc"` 这类可解析前缀仍按 `parseIntParam` 语义取 10（与共享件保持一致，未引入全串正则）。
   - 整数过滤参数同口径：`audit-logs.action`、`benchmarks.verifiedStatus`、`evaluations.status` 非整数 → 400。
2. **`intelligence/reports|snapshots` 的 `limit` 新增上限 1000**：原实现 `listReports(limit=30)` 无上限（`limit=999999` 会直达查询）。改用 `parseLimit(url,{defaultLimit:30,max:1000})`，属防御性收紧，非契约变更（合法区间内行为不变）。
3. **参考实现（`scripts/[id]/executions`）未回改**：仍是「非法串回退默认值」的 200 口径（`runtime.txt` §4 对照）。两类口径并存是本次唯一的不一致点，是否统一由 Hark 裁定；未擅自改动已完成卡（B11-10）的验收基线。
4. **`evaluations` 改造中修正一处自造缺陷**：首版用 `...(cond ? {status: parseOptionalInt(...)} : {})` + `if (where.status === undefined) throw`，会在「未传 status」时误抛 400；已改为显式 `const where: {deletedAt:null; status?:number}` + 条件赋值，并由单测覆盖（缺省 → 200）。
5. **守卫名单已清空但未切 strict 接线**：`ALLOWLIST_P1` 由 15 行改为 `[]`（每接入一个删一行，符合 §二.5 棘轮约定），`--strict` 已 exit 0。**`scripts/guard/run-all.mjs` 的 strict 开关未改**——按用户指令需先报例外清单、等 Hark 裁定后再切。
6. **文档事实同步**：新增 1 个 spec（`admin-list-pagination.spec.ts`）→ `scripts/check-docs-facts.mjs` 的 `spec-count` 205→206（R10-01 惯例；该脚本是 handoff §5 五门禁之一，不同步则门禁必红）。**rebase 到 6cac347 后**该值再合并为 206→207（远程 RK-11-07/09 另新增 `rk11-prod-scripts.spec.ts`），实测 E2E 48 + web 159 = 207。
7. **§四第 1、2 条已失效**：15 端点接入后，`audit-logs?page=abc` 实测 **400**（`runtime.txt` §1），运行态取证已补齐至 **15/15 端点**（`runtime.txt` §1-2 + §6.1）；「不得表述为全站修复」的告诫仍有效——本次只覆盖后台 15 个列表端点，其他走 Zod 的端点未动。
8. **审核后修订（v1.2）**：
   - `benchmarks` 的 `verifiedStatus !== undefined` 死分支改为 `!== ""`，`?verifiedStatus=` 空过滤值回到「视同缺省」（P2-1）。
   - 空白串口径显式化：`?page=%20` → 400（「空白不是整数」），写入 API 文档 §4.2 边界段与本节；补单测 + 运行态取证（P2-2）。
   - 运行态由 8 端点补测到 **15/15**（P2-3）。
   - 单测 87 → **107** 例（补空白串、空过滤值、limit 下界）；变异第二轮 15/15 仍全部捕获（`mutation-15endpoints.txt`）。
   - 契约文档同步：《API接口文档》v1.64 §4.2、《API架构设计方案》v1.21 §五、术语表 v1.25（P1）。
   - 范围外既有问题（未修，建议单开卡）：`free-quotas?tier=FOO` / `tier-mappings?tierLevel=FOO` 非法枚举值仍会 500（改前即如此）；`PricesManager` 请求 `models?pageSize=200` 与 Zod 上限可能冲突。

9. **rebase 到 6cac347 后发现的远程既有失败（非本卡引入，未修）**：
   - `git pull --rebase` 后 `origin/main` 含 `66ce864`（B11-04a：packages/ui 新增 Select/Textarea/Label）与 `6cac347`（RK-11-07/09：bundle-scripts + node-modules-integrity）。
   - 全量 `vitest run` 出现 **1 个 Failed Suite**：`lib/features/admin/__tests__/rk11-prod-scripts.spec.ts` → `SyntaxError: Invalid or unexpected token`（首行 `const bundle = await import("../../../../../../scripts/build/bundle-scripts.mjs")`，顶层 await 处）。单文件复现：`pnpm --filter web exec vitest run lib/features/admin/__tests__/rk11-prod-scripts.spec.ts` → `Test Files 1 failed (1) / Tests no tests`。
   - 归因证据：`git diff origin/main HEAD -- <该 spec>` = 0 行、`git diff origin/main HEAD -- apps/web/vitest.config.ts` = 0 行 → 文件字节与 CI 配置均与我方提交无关；清 `.vite` 缓存、单文件复跑仍失败；文件内无不可见字符（U+00A0/200B/3000/FEFF 扫描为 0），行尾 CRLF 正常。
   - 影响：本地全量 vitest 为 **1734 passed / 5 skipped / 1 failed suite**；其余 157 个文件全绿且 `Test Files 1 failed | 157 passed | 2 skipped (160)`。
   - 处置：**未修**（超出 B11-11 白名单：属 RK-11-07/09 责任范围，修改该 spec 或 vitest 配置均需另行授权）。CI 的 `Unit tests (web)` 预计会因此红灯，需 RK 卡负责人处理；B11-11 自身的 110 例与 15 端点证据不受影响。

10. **终审修订（v1.4，子智能体第二轮独立复核后）**：
    - **P1-1（已修）**：§一 表格原写「其余 15 个端点接入 … ⏸ 未做」，与本卡最终状态直接矛盾 → 改为 ✅ 已完成，并加「本表随交付推进更新」注记。
    - **P1-2（已修）**：`verify.txt` §9 的全量读数 1707 采自 87 例口径，却与同列表的「107 passed」并列；已改为按时代分列（87 例口径 1707 → 107 例口径 1727 → rebase 及 110 例后 1737 待实测），并与 `runtime.txt` §7 对齐。
    - **P2-3（已修）**：执行过程 §3 的 `spec-count 205→206` 过期 → 统一为 207（205→206 RK + 206→207 本卡）。
    - **P2-4（已修）**：`pagination-guard.mjs` 头部注释仍写「名单内 15 个 → WARN」，与名单已空不符 → 改为「ALLOWLIST_P1 已清空 → ratchet 与 strict 等价，`run-all` 接线未切」；三份契约文档属白名单外必要同步，已在 §一 与执行过程 §5 标注「请求追认」。
    - **P2-5（已修）**：单测缺「合法整数过滤值真正写入 where」的断言（实现若整段删掉 `where[filter]=n`，过滤器静默失效仍 200，107 例全绿）→ 新增 3 例（`audit-logs?action=2` / `benchmarks?verifiedStatus=2` / `evaluations?status=2` 断言 `where.<key>===2`），单测 107 → **110**；变异对基线 6cac347 复跑 **15/15** 仍全部捕获（`mutation-15endpoints.txt` 第三轮）。


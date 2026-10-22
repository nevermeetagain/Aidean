# EVD-B11-10 · 偏差与裁量记录（非 2xx 出口信封化，Q-11-03=B）

> 版本: v1.0 | 更新: 2026-10-22 | 变更: 初版——记录 B11-10 实施的设计选型、与卡面/规划的偏差、未验证项与需升级裁决的事项。

## 一、交付范围（与 Q-11-03=B 对齐）

| 项 | 状态 | 载体 |
|---|---|---|
| 未实现方法 → HTTP 405 + `Allow` + `{code,message,data:null,requestId}` | ✅ 已实施（155/155 个 `route.ts`） | `apps/web/app/api/v1/_lib/method-not-allowed.ts`；各 `route.ts` 末尾存根块 |
| `OPTIONS` → 204 + 准确 `Allow` | ✅ 已实施 | 同上 |
| 未匹配 `/api/*`（含 `/api`）→ HTTP 404 JSON 信封 | ✅ 已实施 | `apps/web/app/api/[[...slug]]/route.ts` |
| 防回归守卫 | ✅ `scripts/guard/api-method-coverage.mjs`（`run-all` 第 5 项，CI 已经由 `node scripts/guard/run-all.mjs` 调用） | `verify.txt` §5 |
| 单测 | ✅ `apps/web/lib/http/api-envelope-exits.spec.ts`（13 例） | `verify.txt` §3 |
| 文档锚 | ✅ 《API接口文档》v1.62 §4.1 `api-envelope-exits` ↔ 《API架构设计方案》v1.19 §7.14 `api-envelope-exits-architecture`；术语表 v1.23 `term-envelope-exit`；目录结构文档 v3.24 | — |
| 26 条单资源 GET | ⛔ 不做（选项 A 未采纳） | — |

## 二、设计选型与理由

1. **逐路由存根 vs middleware**：选逐路由存根。middleware 运行于 Edge，不知道每个路由导出了哪些方法，只能另维护方法清单（与代码漂移风险高）、每请求付匹配成本，且无法区分「路由存在/方法缺失（405）」与「路由不存在（404）」。存根在模块加载期构造，已实现方法零开销，静态可校验。
2. **存根块统一放文件末尾**（import 也在末尾）：与并行分支对文件头部 import 区的修改不重叠，降低 155 文件横切改动的合并冲突面；ESM import 提升，不影响语义；`next lint` exit 0。
3. **`OPTIONS` 一并接管**：Next 自动实现的 OPTIONS 会把 405 存根算进 `Allow`，必须由我们给出准确值。`HEAD` 只在缺 GET 时接管，有 GET 时保留 Next 由 GET 派生的 HEAD（运行态 `HEAD /api/v1/system/health` → 200 已实测）。
4. **可选捕获 `[[...slug]]`** 而非 `[...slug]`：同时覆盖 `/api` 根路径（运行态 `GET /api` → 404 信封已实测）。
5. **codemod 与守卫同一脚本**（`--fix` 生成、无参校验），解析规则单源，避免两套正则漂移；`export { h as GET }` 等绕过静态分析的写法直接 FAIL。

## 三、偏差

- **错误码复用 `40000 BAD_REQUEST`**，以 HTTP 405/404 区分语义；**未新增码位**。理由：`packages/shared/src/errors.ts` 为冻结契约（改动须 ADR），且信封必须通过 `ErrorBodySchema`（码须已登记）。`40000` 原语义登记为「请求体/查询参数 Zod 校验失败」，本处属于语义外延（「客户端请求不成立」）——**见 §五 升级项**。
- 卡面估「一个共享 helper + 约定」；实际为 helper + 155 文件机械插入（由 `--fix` 生成，`git diff --numstat` 每文件 +4/-0，3 个原无末尾换行的文件为 +5/-1）。
- 404 信封不回显查询串，只回显 `method + pathname`（避免把参数里的敏感值写回响应）。

## 四、未验证 / 待确认

- **生产口径（`next build` + `next start` / 容器）未取证**：运行态只在 `next dev` 取得（`verify.txt` §6）。`next build` 未在本 worktree 执行（避免与并行 worktree 的 build 争用 node_modules，见 RK-11-09），故「build 产物下的 405/404」为 `待确认`。
- `pnpm gates`（PowerShell `check-gates.ps1`）本机无 PowerShell，未跑；`barrel-check` 不受本卡影响（未新增 `index.ts`）。
- 并行 worktree（如 matrix 线修改 `capabilities`/`protocols` route.ts、他线改 `check-docs-facts.mjs`）合并时，存根块与 facts 期望值会产生**文本冲突**；处置：合并后重跑 `node scripts/guard/api-method-coverage.mjs --fix` 与 facts 计数即可，存根内容可完全重新生成。

## 五、需升级裁决（不得静默修改冻结契约）

- **ESC-B11-10-01**：是否在 `packages/shared/src/errors.ts` 新增专用码（建议 `METHOD_NOT_ALLOWED`→405、`ROUTE_NOT_FOUND`→404，段位待定），并同步《API接口文档》§4 码表、`gen-contract-tests.mjs` 生成物与 `DEFAULT_STATUS_BY_CODE`。在获批 ADR 前维持 `40000` + HTTP 状态区分；若获批，只需改 `method-not-allowed.ts` 两处 `ERROR_CODES.*` 引用与 §4.1 表格。

> 版本: v0.5.1 | 更新: 2026-10-15 | 变更: TASK-005 完成度取证（含 CodeReview 子智能体审查 PASS + M-1/S-1/S-2/S-3 返工复验 + dev 冷编译竞态发现）

# EVD-005 · TASK-005 完成度分析

## 交付物
- 新增 `e2e/web/walking-skeleton.spec.ts`（3 用例）：
  1. **主链路**：`POST /auth/register` → `POST /auth/login` → `POST /user/api-keys`（鉴权写）
     → 鉴权读列表含新 Key → `GET /user/console?tab=platformKeys` 面板内可见 Key 名称 → `DELETE /user/api-keys/{id}` 清理。
  2. **匿名错误信封**：`clearCookies` 后 `GET /user/api-keys` → 401，`ErrorBodySchema.parse` 校验四要素（code=10004 / message 非空 / data=null / requestId 非空）。
  3. **就绪**：`GET /system/ready` → 200，`SystemReadySchema.parse` 校验 `{status:"ready",checks:{db:"ok",redis:"ok"},time}`。

## 验收标准逐条

### ① 验证命令通过 —— `已确认`
命令：`pnpm exec playwright test e2e/web/walking-skeleton.spec.ts --config playwright.config.ts --project=web --workers=1`
结果：**3 passed (10.6s)**（见 `playwright-positive.txt`）。
- 主链路 7.6s（含鉴权导航 + 面板渲染等待）；匿名 143ms；就绪 328ms。

### ② 无 DB 时该 spec 因 ready 503 明确失败（非超时）—— `已确认`
证据双层次（见 `ready-probe-dead-db.txt`）：
- 探针级：dead-DB dev（:3099，dummy 不可达 URL）`/system/ready` → **HTTP 503** body `code:50010 "依赖不可用: db"`；
  热调用 1063ms（≈ readiness 1s 探活上界，**有界**非挂起）。
- 规格级：`--grep "system/ready"` 实跑该用例 → **fail，Expected: 200 / Received: 503（1.3s）**，属确定性断言失败，非测试超时/abort。

### ③ diff 仅落在允许范围 —— `已确认`
`git diff --name-only`（已跟踪改动）= **(none)**（`apps/**`、`packages/**` 未触碰）。
`git status --porcelain` 仅新增：`e2e/web/walking-skeleton.spec.ts` 与本 `EVD-005/**`（规划树 `docs/任务规划V0.5.0/` 整体未跟踪，其入主干动作归 push/TASK-009）。
（见 `diff-scope.txt`。）

## 关键决策与留痕
- **契约符号导入**：裸 `@aidean/shared` 在仓库根不可解析（`require.resolve` = MODULE_NOT_FOUND；根无 workspace 链接、shared 为纯 TS 源、禁止改配置/包）→ 改用等价**相对源码导入** `../../packages/shared/src/{errors,schemas/system.schema}`（详 `import-resolution.md`）。实跑通过佐证可行。
- **阻塞条件（注册需邮箱验证码）不触发**：`register` 即时签发 RS256 双令牌 Cookie、无验证码前置 → 无需 seed 用户（详 `blocking-note.md`）。
- **环境卫生**：全程干净 shell（无 DATABASE_URL/REDIS_URL 泄漏），避免 TASK-003 假阴性陷阱（详 `env-precheck.txt`）。

## 子智能体审查（CodeReview 子智能体，见对话审查报告）
- 结论：**PASS，0 Blocker / 0 Major**；三条验收标准各 100%。契约字段与真实端点源码逐条对齐；
  `SystemReadySchema.parse(body.data)` 内层解析正确；相对导入替代裸包名经核验为「约束逼出的等价最小解」。
- 采纳并落地的非阻断改进（均限本 spec 内）：
  - **M-1** 失败路径清理兜底：主链路 `try/finally`，异常时仍幂等 DELETE 已建 Key（happy path 仍显式断言 DELETE 200/deleted）。
  - **S-1** login 可证伪：断言 login 相对 register **重新签发**了 aidean_token（令牌值变化）。
  - **S-2** 收紧明文前缀断言 `aid_` → `aid_ak_`（对齐 lib/features/apikey/service.ts 稳定形态）。
  - **S-3** 相对导入路径的文件迁移提醒注释。
- 返工后复验：预热 :3000 后 `--workers=1` 连续两轮 **3 passed**（5.0s / 1.8s，见 `playwright-positive-firstwarm.txt`、`playwright-positive.txt`）。

## 关键发现：dev 冷编译竞态（详见 `flakiness-note.md`）
长驻 `--turbo` dev 上 `POST /auth/register` 偶发首请求 404（`Compiled /_not-found`），同路由再请求即 200——
属 Turbopack 按需编译竞态，**非 spec/产品缺陷**；以「起服后预热骨架触及路由」稳妥规避，
并将「CI e2e 前须预热或以 build 产物运行」列为 **TASK-006 硬前置**。留痕 `playwright-coldcompile-404-race.txt`。

## 局限 / 未覆盖
- `docs/任务规划V0.5.0/contracts/**` 的 `AUTHZ_BOUNDARY[0]` 未作为运行期对象导入；本 spec 以匿名 401 + 四要素结构等价断言该鉴权边界（错误码 10004）。
- check-docs-facts 计数门禁（route/spec 计数因新增 spec 而漂移）属规划内让渡，统一归 TASK-009 同步（沿 TASK-003 `handoff-task009.txt` 口径）。

## 结论
`已确认`：TASK-005 三条验收标准全部满足并经子智能体审查 PASS + 返工复验，证据链完整可复现，diff 严格限定在允许范围。
可进入 TASK-009（S0 文档同步 + 计数 bump）→ 后续 006（含预热前置）/007/050/008。

TASK-006 · CI e2e-skeleton job — 交付证据

> 版本: v0.5 | 更新: 2026-10-15 | 变更: S0 步行骨架真库 CI job 设计与本地验证（V0.5.0）

## 1. 交付内容
- 唯一改动文件：`.github/workflows/ci.yml`
  - 更新头部「取舍」注释：原「e2e 暂不进 CI」→「S0 骨架子集进独立 e2e-skeleton job；全量 9 spec 仍本地」。
  - 新增 `e2e-skeleton` job（needs: verify），12 步流水线：
    install → prisma generate → migrate deploy（空库重放）→ seed（db:seed + seed-navigation-menu + seed-rbac）
    → production build → playwright install chromium → 单步内 `next start -p 3000 &` + 轮询 /system/ready ≤60s
    → `playwright --project=web e2e/web/walking-skeleton.spec.ts` + `playwright --project=smoke`（rc 聚合）
    → 失败打印 next 日志 + 上传 playwright-report artifact。

## 2. 验收标准逐条对照
| # | 验收条款 | 状态 | 依据 |
|---|---------|------|------|
| 1 | GitHub Actions e2e-skeleton job 绿 | 部分确认 | 本地对生产 `next start`(:3000, start-server.js) 实跑两套件全绿；job YAML python 解析通过、结构/needs/env/services 校验通过。**gh CLI 本机不可用**，Actions 端最终绿灯待 push 阶段人工在 Actions 页面确认（局限见 §4）。 |
| 2 | 日志可见 migrate deploy 应用「16 条」迁移 | 规格漂移 | 实测迁移目录 **17 条**（多出 `20261014000000_model_prices_partial_current_unique`，晚于任务书基线 main@cd5b1a9）。job 用 `prisma migrate deploy` 全量重放，日志将显示 17 条。已在 ci.yml 注释与 evidence 记录漂移，按实测 17 为准。见 migrations-count.txt。 |
| 3 | 端口恒为 3000（与 baseURL 一致） | 已确认 | `next start -p 3000`；playwright 根配置 baseURL=`http://localhost:3000`（E2E_BASE_URL 未覆盖）；无任何临时端口。 |
| 4 | diff 仅落在允许范围内 | 已确认 | `git diff --name-only` = `.github/workflows/ci.yml` 单文件；未触 apps/packages/e2e/contracts。见 diff-scope.txt。 |

## 3. 关键设计决策（证据链）
- 启动方式 `next start`（非 dev）：生产构建产物消除 dev 冷编译竞态（TASK-005 曾受扰）。实测本机 :3000 = `next@15.0.0/dist/server/lib/start-server.js`（生产），NODE_ENV=production：
  - smoke[6]（SUPER_ADMIN 登录→/admin 200）绿 → 证明 `isProduction()` 下 `secure:true` Cookie 经 http://localhost（Chromium 视 localhost 为安全上下文）正常回传。
  - 全套件仅 4 次真实登录（smoke 3 + walking 1）< `LOGIN_IP_RATE_LIMIT=20`/600s → 生产下 bypass 失效亦无 429。
- RS256 无需 JWT_PRIVATE_KEY：`keys.ts` 优先级 env→Redis keyring→内存兜底；单实例 `next start` 签发与 `/.well-known/jwks.json` 同进程自洽，`middleware.ts` createRemoteJWKSet 自取同源验签。
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`（build 期内联）：`AUTH_ISSUER` = 该值（`?? http://localhost:3000`），决定 middleware jwks 基准与重定向绝对基址；须与 :3000 对齐，否则 fail-closed 307 到错误基址致 smoke[3]/[6] 红。
- `JWT_SECRET` 强制：`env-check.assertJwtSecret()` 在 login/register 签发期抛错，缺失即全红。
- playwright 命令作用域：`e2e/web` 含 9 spec，故用 `--project=web <路径过滤>` 精确锁定 walking-skeleton；smoke 独立 `--project=smoke`（`./e2e/tests`）。本地实测分别 3 passed / 7 passed。

## 4. 阻塞条件核验（TASK-006：seed 依赖外网 → 停止）
- **未触发**（已确认）。全部 seed*.ts `fetch(` 命中数 = 0；seed.ts L304/L313 的 `crawl` 仅为 `scriptPath` 数据字符串（爬虫由独立 scheduler 按 cron 运行期触发，seed 不执行）；apiStationsData 的 `https://...` 为写库静态数据。详见 blocking-check.txt。

## 5. 局限与残余风险
- Actions 端最终绿灯无法本地程序化确认（gh 不可用）：一次性空库 `migrate deploy` + GH 服务容器网络 + `--with-deps` apt 安装 + build 期 NEXT_PUBLIC_SITE_URL 内联，均需真实 runner 复现。依据：标准 Prisma/GH 行为 + 本机生产 start 实跑全绿，风险面低。
- 若首跑 CI 红且非产品缺陷：按 TASK-006 升级条件处理（连续 2 次 → 重写任务书/升级档位，禁第 3 次硬撞）。

## 6. 关联文件
- playwright-walking-skeleton.txt / playwright-smoke.txt：CI 等价命令本地实跑全绿原始输出（EXIT=0）。
- gates-rule.txt / gates-facts.txt：文档门禁复跑 EXIT=0（ci.yml 编辑未扰动门禁）。
- prod-server-validation.txt：:3000 = 生产 start-server.js 证据。
- design-rationale.txt / blocking-check.txt / migrations-count.txt / diff-scope.txt / yaml-validate.txt。

## 7. CodeReview 子智能体审查结论
- 分级：**0 Blocker / 2 Major / 3 Minor**；核验通过关键假设（服务容器端口映射、迁移扩展 pgcrypto/uuid-ossp/pg_trgm/btree_gin 内置官方 postgres:16 且 aidean 为超级用户、单步内后台存活、middleware 不拦 ready、无 boot 期崩溃、签发/验签自洽、seed 覆盖 smoke[6]/walking 前提、project/路径过滤正确、未破坏 verify/docker-build）。
- Major-1（$! 仅捕获 pnpm 包装 PID，next start 为子进程 → 孤儿风险）→ **已修**：改 `trap cleanup EXIT` + `pkill -f "next start"/"next-server"`，覆盖两条退出路径；bash -n 校验通过（见 bash-syntax-check.txt）。非阻断绿灯，属清理可靠性。
- Major-2（提交范围勿混入未跟踪 docs 树）→ **符合既定纪律**：path-scoped `git add .github/workflows/ci.yml`，EVD-006 留待 push 阶段单独入库。
- Minor-1（缺 timeout-minutes）→ **已修**：加 `timeout-minutes: 20`。
- Minor-2/3（bypass 在 production 下 no-op、Secure cookie over http）→ 审查确认与我的注释/本机实跑一致，无需改动。
- 裁决：全部 Major 已处理、Minor-1 已采纳，其余为一致性确认。可进入 path-scoped 提交（仅 ci.yml）。

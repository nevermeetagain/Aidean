# Tasks · 发布候选加固 RC-02（原子化任务书）

> change-id: `harden-rc02-standalone-address` | 版本: v1.0 | 批准: 任务总览（PM-02 发布候选加固阶段）已批准

---

## 轨道 RC02 · standalone 对外地址契约与发布交付闭环

> **本级职责（L1）**：关闭 standalone 形态 0.0.0.0 绝对重定向真实风险；完成 Docker 构建上下文、环境契约、迁移/回滚/恢复验收闭环；无拦截器双服务登录验收。前置：SSO-01 完成（`docs/工作包完成报告.md` v1.0）。交付物：修复后的代码、发布契约文档、验收证据。

### Task RC02.1 SSO-02：重定向 origin 固定公开基址 【目标: 关闭 standalone 0.0.0.0 泄漏 | 依赖: 无 | 产出: 三处代码修改】

- [x] #### SubTask RC02.1.1 修改 authorize/consent/middleware 重定向 origin
  - 【目标】将三处依赖 `url.origin`/`req.url` 的绝对重定向改为固定 `AUTH_ISSUER`，消除 Host 头/监听 hostname 对 Location 的影响
  - 【范围】修改 `apps/web/app/oauth/authorize/route.ts`（L81/L84/L96）、`apps/web/app/oauth/consent/route.ts`（L47-49）、`apps/web/middleware.ts`（L66）
  - 【验收】grep 确认三文件不再以 `url.origin` 构造重定向；类型检查通过
  - 【验证命令】`pnpm --filter web exec tsc --noEmit`
  - 【产出】三处 diff
  - 【依赖】无

- [x] #### SubTask RC02.1.2 类型检查与既有单测回归
  - 【目标】确认修改不破坏类型与现有测试
  - 【范围】运行 web 包 typecheck 与 vitest
  - 【验收】`tsc --noEmit` EXIT=0；vitest 全绿
  - 【验证命令】`pnpm --filter web exec tsc --noEmit`；`pnpm --filter web test`
  - 【依赖】RC02.1.1

### Task RC02.2 QA-02：standalone 双服务无拦截器验收 【目标: 证明登录不依赖拦截器兜底 | 依赖: RC02.1 | 产出: 验收证据】

- [x] #### SubTask RC02.2.1 构建 standalone 产物并启动可控实例
  - 【目标】以修复后代码生成自足 standalone 产物，替换 3000 端口污染实例（box-agent 拉起的相对路径 `node .next/standalone/apps/web/server.js`，PID 记录于执行日志）
  - 【范围】`apps/web/.next`（构建产物）；3000 端口进程处置
  - 【验收】新实例 `/api/health`（或等价探活）200；BUILD_ID 与 `.next/BUILD_ID` 一致
  - 【验证命令】`pnpm --filter web build`；`node apps/web/.next/standalone/apps/web/server.js`（PORT=3000 HOSTNAME=0.0.0.0）
  - 【产出】运行中的 standalone 3000 实例
  - 【依赖】RC02.1.2

- [x] #### SubTask RC02.2.2 未登录 authorize Location 取证（无 0.0.0.0）
  - 【目标】直接对 standalone 取证未登录 authorize 302 Location
  - 【范围】HTTP 请求验证
  - 【验收】Location 主机名为 `localhost:3000`，**不含 `0.0.0.0`**
  - 【验证命令】`curl --noproxy '*' -s -D - -o /dev/null 'http://localhost:3000/oauth/authorize?response_type=code&client_id=wechat-rag&redirect_uri=http%3A%2F%2Flocalhost%3A3333%2Fauth%2Faidean%2Fcallback&scope=openid&state=rc02probe'`
  - 【依赖】RC02.2.1

- [x] #### SubTask RC02.2.3 sso-3333 去 0.0.0.0 拦截器改造并全绿
  - 【目标】将 `interceptAuthorizeRedirect` 收敛为仅处理白名单域名改写（测试环境域名解析事实），移除 `0.0.0.0→localhost` 兜底，新增 Location 不含 0.0.0.0 断言
  - 【范围】修改 `e2e/web/sso-3333.spec.ts`
  - 【验收】`3 passed`；用例断言无 0.0.0.0
  - 【验证命令】`npx playwright test --config playwright.config.ts --project=web e2e/web/sso-3333.spec.ts --reporter=list`
  - 【依赖】RC02.2.2

### Task RC02.3 REL-02：Docker 构建上下文与发布交付 【目标: 发布候选镜像与运行契约闭合 | 依赖: 无 | 产出: Dockerfile/.dockerignore/契约文档】

- [x] #### SubTask RC02.3.1 Dockerfile 补 public COPY 与构建时公开地址注入
  - 【目标】runner 镜像自足（public/static），公开地址走 build-arg 注入
  - 【范围】修改根 `Dockerfile`：builder 加 `ARG NEXT_PUBLIC_SITE_URL` + `ENV`；runner 补 `COPY --from=builder .../public ./apps/web/public`；构建命令改 `pnpm --filter web build`
  - 【验收】docker build 成功；镜像内 `apps/web/public` 存在；`/aidean-logo.png` 200（镜像级验证可延至实弹部署，本步以 build 成功 + 产物检查为准）
  - 【验证命令】`docker build -t aidean-web:rc02 .`
  - 【依赖】无

- [x] #### SubTask RC02.3.2 .dockerignore 补全
  - 【目标】排除临时/隔离/测试/日志污染，收敛构建上下文
  - 【范围】修改根 `.dockerignore`：`_tmp_*`、`scratch`、`.rel01-*`、`.feui02-*`、`.pw-*`、`.auth`、`.box-agent`、`.workbuddy`、`.trae`、`playwright-report`、`test-results`、`*.xlsx`、`0`、`2026-09-08-20e8a075/` 等
  - 【验收】`docker build` 上下文体积显著收敛（`docker build --no-cache` 前置打印，或 `docker context` 观测）；无报错
  - 【验证命令】与 RC02.3.1 合并验证
  - 【依赖】无

- [x] #### SubTask RC02.3.3 六类环境变量契约文档
  - 【目标】构建时/运行时/公开/私密/容器内/对外宣告六类变量正式分类与注入时机成文
  - 【范围】新建 `docs/发布环境契约.md`
  - 【验收】文档含变量分类表、注入时机（构建时内联 vs 运行时注入）、拓扑矩阵（dev/standalone/生产）、与 `AUTH_ISSUER`/`AIDEAN_ISSUER`/`AIDEAN_PUBLIC_URL` 的映射关系；登记进 `docs/文档索引.md`
  - 【验证命令】人工核验
  - 【依赖】无

- [x] #### SubTask RC02.3.4 回滚与恢复验收闭环文档
  - 【目标】初始迁移回滚、失败发布应用回滚、恢复后验收步骤成文
  - 【范围】新建 `docs/发布回滚与恢复验收.md`；引用既有 `docker/docs/MIGRATION_GUIDE.md`、`docker/docs/BACKUP_RESTORE.md` 演练基线
  - 【验收】文档含三种回滚场景步骤 + 恢复后验收命令链（check-tables/health/smoke/sso-3333）
  - 【验证命令】人工核验
  - 【依赖】无

### Task RC02.4 发布卫生分类 【目标: 工作区杂项分类处置 | 依赖: 无 | 产出: 处置清单】

- [x] #### SubTask RC02.4.1 工作区杂项清单与隔离处置
  - 【目标】将 `_tmp_*`、scratch、根级日志、隔离目录等分类为「可忽略/建议隔离/建议归档」，隔离移动至 `scratch/quarantine-rc02-<ts>/`（不删除）
  - 【范围】根目录 `_tmp_*`（5 个）、`*.log`（12+）、`scratch/`、`.rel01-tmp/`、`.feui02-standalone/`、`.pw-c02/`、`0`、`2026-09-08-20e8a075/`、`rel01-*.sql` 等
  - 【验收】清单文档产出；非 git 跟踪文件移动完成；git 跟踪的日志类由用户定夺
  - 【验证命令】`git status` 对比
  - 【依赖】无

---

## 层级图例（L1→L4）

| 级 | Markdown 载体 | 本级职责 |
|---|---|---|
| **L1 阶段** | `## …`（轨道/Phase） | 声明该组目标、前置条件、交付物 |
| **L2 任务** | `### Task x.y 名称` | 一个可独立验收的功能面；标注【依赖】【产出】 |
| **L3 子任务** | `#### SubTask x.y.z 名称` | 最小可执行单元；字段完备即合法 |
| **L4 字段** | 子任务下有序列表 `- 【字段】: 内容` | 最小原子信息：目标/范围/验收/验证命令/产出/依赖 |

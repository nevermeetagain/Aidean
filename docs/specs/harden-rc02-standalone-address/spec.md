# 发布候选加固 RC-02：standalone 对外地址契约与发布交付闭环 Spec

> change-id: `harden-rc02-standalone-address` | 语言: 中文 | 版本: v1.0 | 创建: 2026-09-14 | 更新: 2026-09-14
>
> 继承：[docs/governance/开发流程.md](../../governance/开发流程.md) 六步循环、四级层级与六字段规范；ADR-0001 技术栈锁定不受影响（无技术栈偏离）。

---

## 为什么（Why）

SSO-01（`docs/工作包完成报告.md` §10 遗留 L1）已实证：主平台 standalone 生产形态下，Next.js standalone `server.js` 以 `HOSTNAME=0.0.0.0` 启动且 `trustHostHeader` 未开启时，`req.url` 的 origin 取配置 hostname 而非请求 Host 头，导致未登录 `/oauth/authorize` 的 302 Location 形如 `http://0.0.0.0:3000/login?...`，宿主浏览器不可达。当前 `e2e/web/sso-3333.spec.ts` 用响应拦截器（`0.0.0.0 → localhost`）兜底，发布候选形态必须去掉该兜底并让真实浏览器链路自洽。

同时 REL-01 遗留：Dockerfile runner 阶段未 COPY `public/`（`apps/web/public` 已存在，注释过时）；`.dockerignore` 未排除 `_tmp_*`、scratch、隔离目录等污染项；构建时/运行时/公开/私密/容器内/对外宣告六类变量尚无正式发布契约；迁移/备份恢复已演练但失败发布的应用回滚与恢复后验收未成文闭环。

## 变更清单（What Changes）

- 修改 `apps/web/app/oauth/authorize/route.ts`：登录与 consent 分流重定向 origin 由 `url.origin` 改为固定公开基址 `AUTH_ISSUER`。
- 修改 `apps/web/app/oauth/consent/route.ts`：未登录重定向 origin 同上。
- 修改 `apps/web/middleware.ts`：`/user/*`、`/admin/*` 未登录重定向 base 由 `req.url` 改为 `AUTH_ISSUER`。
- 修改 `Dockerfile`：builder 阶段新增 `ARG/ENV NEXT_PUBLIC_SITE_URL`（构建时注入公开地址）；runner 阶段补 `COPY public`；构建命令切换为 `pnpm --filter web build`（含 postbuild，standalone 自足）。
- 修改 `.dockerignore`：补全临时目录、隔离目录、测试产物、日志与根级杂项排除。
- 新建 `docs/发布环境契约.md`：六类环境变量分类、注入时机（构建时 vs 运行时）与拓扑矩阵。
- 新建 `docs/发布回滚与恢复验收.md`：初始迁移回滚、失败发布应用回滚、恢复后验收步骤闭环。
- 修改 `e2e/web/sso-3333.spec.ts`：移除 `0.0.0.0→localhost` 拦截兜底，保留白名单域名改写（测试环境域名解析事实），新增「Location 不含 0.0.0.0」断言。
- 工作区发布卫生分类：`_tmp_*`、scratch、日志、隔离目录等列出处置清单（隔离移动，不删除）。

## 影响面（Impact）

- Affected specs: 无（本 spec 为发布加固新里程碑，独立 change-id）。
- Affected code:
  - 修改类: `apps/web/app/oauth/authorize/route.ts`、`apps/web/app/oauth/consent/route.ts`、`apps/web/middleware.ts`、`Dockerfile`、`.dockerignore`、`e2e/web/sso-3333.spec.ts`
  - 新建类: `docs/发布环境契约.md`、`docs/发布回滚与恢复验收.md`、`docs/specs/harden-rc02-standalone-address/{spec,tasks,checklist}.md`

---

## ADDED Requirements

### Requirement: 重定向 origin 固定为公开基址

主平台所有「未登录/未授权 → 登录页或同意页」的绝对重定向 SHALL 以 `AUTH_ISSUER`（= `NEXT_PUBLIC_SITE_URL ?? http://localhost:3000`，构建期常量）为 origin，不得依赖 `req.url` 的 Host 头推断。

#### Scenario: standalone 未登录访问 authorize

- **WHEN** standalone 服务以 `HOSTNAME=0.0.0.0` 启动，浏览器以 `http://localhost:3000` 访问未登录 `/oauth/authorize?...`
- **THEN** 响应 302，`Location` 主机名必须为公开基址（本地构建 = `localhost:3000`），且**不得包含 `0.0.0.0`**
- **AND** 取证：`curl --noproxy '*' -s -D - -o /dev/null 'http://localhost:3000/oauth/authorize?...'` 检查 Location；e2e `sso-3333` 用例显式断言 `not.toContain("0.0.0.0")`

#### Scenario: middleware 未登录访问受保护路径

- **WHEN** standalone 形态下未登录访问 `/user/*` 或 `/admin/*`
- **THEN** 307 `Location` origin 为 `AUTH_ISSUER`，不含 `0.0.0.0`

### Requirement: 构建时公开地址注入契约

生产构建 SHALL 通过 `docker build --build-arg NEXT_PUBLIC_SITE_URL=https://<公开域名>` 注入对外宣告地址；`docker-compose.prod.yml` 中的 `NEXT_PUBLIC_SITE_URL` 运行时注入 SHALL 标注为「dev 兜底/构建期为准」，避免误解为运行时热更。

#### Scenario: 生产镜像构建

- **WHEN** 以 `--build-arg NEXT_PUBLIC_SITE_URL=https://aidean.example.com` 构建镜像并启动
- **THEN** discovery `issuer`、authorize 登录重定向、middleware 重定向均以 `https://aidean.example.com` 为 origin

### Requirement: Docker 运行产物自足

Docker runner 镜像 SHALL 包含 `public/` 与 `.next/static`，保证静态资源与图片（如 `/aidean-logo.png`）在容器内直接可服务。

#### Scenario: 镜像内静态资源

- **WHEN** 由本 Dockerfile 构建的镜像启动后请求 `http://<host>:3000/aidean-logo.png` 与任一 `/_next/static/**`
- **THEN** 均返回 200 且与服务端构建产物一致

---

## MODIFIED Requirements

（无）

---

## REMOVED Requirements

（无）

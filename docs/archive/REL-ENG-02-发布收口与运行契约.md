# REL-ENG-02 发布收口与 standalone 运行契约

> 版本: v1.4 | 更新: 2026-09-15 | 变更: RW-1 返工——§6.1/§6.2 rel05 镜像锚点改为实测真值（tag `089304f2…` + 内容锚 config `0b7f392c…` + manifest `cb20b4b6…` + 实测 BUILD_ID `hefb1q…`），修正「BUILD_ID 与 rel04 同值」的假事实（根因：`apk add openssl` 位于 deps 阶段 → builder 缓存整体失效 → next build 真实重跑 → BUILD_ID 随机重生成），新增「BUILD_ID 构建随机、不得作追溯锚」纪律；§6.2 补记体积 267MB（+9MB）。v1.3：QA-SHIP-06 冻结增补——§6.2「rel05 基座修复说明」（REL-FIX-05 P0：Prisma 引擎 OpenSSL 版本不匹配、双侧 apk openssl、容器接真实 DB authorize 307 闭环、推荐 rel05 为生产镜像）。v1.2：§6.1 镜像 BUILD_ID 差异说明

## 1. 收口清单（冻结）

基线：HEAD `b4b406b`，BUILD_ID `PcWuUbTloz3rPlzSFQrvn`（含全部下述改动的干净重建产物）。

### 1.1 已跟踪修改（7M）——结论：收

| 文件 | 改动实质 | 结论 |
|---|---|---|
| apps/web/app/oauth/authorize/route.ts | RC-02：未登录→login、→consent 两处 base 改 AUTH_ISSUER（+import） | 收 |
| apps/web/app/oauth/consent/route.ts | RC-02：未登录→login base 改 AUTH_ISSUER（+import） | 收 |
| apps/web/middleware.ts | RC-02：/user 与 /admin 分流登录页 base 改 AUTH_ISSUER（+注释） | 收 |
| apps/web/components/auth/AuthForm.tsx | AUTH-01：回跳校验收敛为共享 `isSafeInternalRedirect` | 收 |
| apps/web/components/admin/AdminLoginForm.tsx | AUTH-01：同上（缺省 `/admin` 不变） | 收 |
| apps/web/lib/features/auth/__tests__/middleware.spec.ts | AUTH-01：+2 伪造 Host（0.0.0.0）Location origin 精确断言 | 收 |
| e2e/tests/console-flow-gradient.spec.ts | QA-01：三处 `getByText` 收紧 `{ exact: true }`（止 strict-mode flake，非弱化） | 收 |

收口依据：7M diff 形态计数（AUTH_ISSUER ×12 行、isSafeInternalRedirect ×4、exact:true ×3、RC-02 注释 ×7）与各工作包报告一致；文件集与 RC-02/AUTH-01/QA 三包声明零溢出。

### 1.2 新增文件——结论：收

| 文件 | 归属 | 结论 |
|---|---|---|
| apps/web/lib/features/auth/redirect.ts | AUTH-01 | 收（共享回跳校验 Contract） |
| apps/web/lib/features/auth/__tests__/redirect.spec.ts | AUTH-01 | 收（15 用例） |
| apps/web/lib/features/auth/__tests__/oauth-redirect-origin.spec.ts | AUTH-01 | 收（3 用例） |
| apps/web/scripts/check-runtime-contract.mjs | SSO-02 | 收 + 本包接入门禁（build/runtime 双域） |
| apps/web/scripts/qa-fe-01-regression.mjs | QA-FE-01 | 收（一键运行回归 26/26） |
| docs/BUILD-RT-01 / QA-FE-01 / SSO-02 三份报告 + 工作包完成报告 | 各包 | 收（评审交付物） |
| docs/specs/harden-rc02-standalone-address/ | PM | 收（规格交付物，保持可见） |
| apps/web/prisma/migrations/ | REL-01 | 收（源码交付物，保持可见） |
| rel01-baseline.diff.sql、rel01-baseline2.sql | REL-01 | 收（迁移基线交付物，保持可见） |

### 1.3 弃（不入库/清理）——见 §5 清理清单

## 2. AUTH_ISSUER 构建期契约（变量矩阵）

单一事实源：`apps/web/lib/features/auth/constants.ts:82`
`AUTH_ISSUER = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`

| # | 变量 | 域 | 注入时序 | 消费方 | 缺失后果 | 门禁 |
|---|---|---|---|---|---|---|
| 1 | NEXT_PUBLIC_SITE_URL | 构建期 | `next build` 之前（本地：.env/.env.local；Docker：`--build-arg`，ARG 声明于 builder 阶段、`next build` 之前） | 客户端 bundle + Edge bundle（构建期内联）：AUTH_ISSUER、JWKS 自取基址、discovery、Location 生成 | 回落 `http://localhost:3000` → 生产 Location 指向 localhost（登录不可达，无刺眼报错） | `check-runtime-contract --mode build [--strict]`；Docker 构建链内嵌 `--strict` fail-closed |
| 2 | AUTH_ISSUER_CONTAINER | 构建期（字面量） | 代码常量（A-T20） | Edge 验签接受的容器侧 iss | 网段变更须改代码重建（已知约束） | 变更评审 |
| 3 | DATABASE_URL | 运行期 | 进程/容器 env（standalone **不拷贝 .env**） | 登录/会话/配置读库 | 登录路径 500 | `--mode runtime` ERROR |
| 4 | REDIS_URL | 运行期 | 进程/容器 env | 授权码一次性消费/限流 | code 兑换失败 | `--mode runtime` ERROR |
| 5 | JWT_SECRET | 运行期 | 进程/容器 env | 令牌签名 | 占位值=安全风险 | `--mode runtime`（production 下占位=ERROR） |
| 6 | NODE_ENV | 运行期 | 进程/容器 env（Dockerfile runner 已固定 production） | secure cookie、脚本 production 口径判定 | secure 语义退化 | 部署清单核对 |

Edge/Node 一致性：NEXT_PUBLIC_* 由 Next 构建期同时内联进客户端与 Edge bundle（A-T20 实证：非 NEXT_PUBLIC env 在 Edge sandbox 不可靠，故容器侧 iss 用编译期字面量 AUTH_ISSUER_CONTAINER）。

### 2.1 Dockerfile 契约（REL-ENG-02 加固）

- builder 阶段、`next build` 之前：`ARG NEXT_PUBLIC_SITE_URL` + `ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL`（无默认值 → 漏 `--build-arg` 即空值）。
- `prisma generate` 之后、`next build` 之前：`RUN ... check-runtime-contract.mjs --mode build --strict`（缺空/localhost/非法值 → 构建失败，fail-closed）。
- runner 阶段：补 `COPY --from=builder /app/apps/web/public ./apps/web/public`（output:standalone 不携带 public，缺 COPY = 镜像内 logo 404）。
- 运行期注入：docker run `-e DATABASE_URL=... -e REDIS_URL=... -e JWT_SECRET=...`（禁止依赖 .env 拷贝）。

### 2.2 换基址重建流程（如 https://aidean.example.com）

1. 本地/CI：写入 `.env.local` `NEXT_PUBLIC_SITE_URL=https://aidean.example.com`（或 CI env）→ `pnpm build` → `pnpm --filter web run contract:build:strict` 须 exit 0。
2. Docker：`docker build --build-arg NEXT_PUBLIC_SITE_URL=https://aidean.example.com -t aidean-web .`（内嵌 strict 门禁，漏注入直接构建失败）。
3. 部署：容器 env 注入 §2 #3-#5 三运行期变量 → 启动后 `pnpm --filter web run contract:runtime` 须 exit 0。
4. 验证：`qa-fe-01-regression.mjs` 26/26 + Host 伪造三探针 Location origin == 新基址。

## 3. 门禁接入（REL-ENG-02 接线）

| 入口 | 命令 | 语义 |
|---|---|---|
| apps/web | `pnpm run contract:build` / `contract:build:strict` | build 域（dev 放行 WARN / production 口径拦截 ERROR；strict 时 WARN 亦失败） |
| apps/web | `pnpm run contract:runtime` / `contract:runtime:strict` | runtime 域三变量必需性（`.env 分发` 为 INFO 提示非 WARN——strict 下不阻断；三变量齐备且 JWT_SECRET 非占位即可通过） |
| 根 | `pnpm run gate:contract:build` / `gate:contract:runtime` | 一键链（pnpm --filter web 转发） |
| Dockerfile | builder 内嵌 `--mode build --strict` | 生产误配在构建期拦截（fail-closed） |

退出码语义（脚本原生）：0=通过；1=存在 ERROR（strict 时含 WARN）；2=参数错误。

## 4. 生产态唯一结论

- 唯一生产基准：`apps/web/.next/standalone`（BUILD `PcWuUbTloz3rPlzSFQrvn`），3000 由其 server.js 服务。
- `.feui02-standalone/`（172M，老代际、相对 Location 旧形态）：**下线删除**，禁止作契约基准（行为差异已由 QA 报告存档）。
- `.next.pre-rc02-20260914-170857/`（348M）：**保留封存**——RC-02 改造前唯一行为快照（回滚件），已 gitignore。

## 5. 清理清单与回滚方式

| 对象 | 体积 | 处置 | 回滚方式 |
|---|---|---|---|
| `0`（根目录，UTF-16 "1\r\n" 重定向残迹） | 8B | 删除 | 无需（命令误重定向产物） |
| `_tmp_*` ×5 | <1KB | 删除 | 工具调用瞬态件，无需 |
| apps/web/.next.quarantine-20260914 | 361K | rmdir /s /q | FE-UI-01 期残破 .next，重建可复现 |
| apps/web/.next.quarantine-auth01-20260914 | 194M | rmdir /s /q | AUTH-01 失败半写产物，重建可复现 |
| apps/web/.next.broken-rt01-20260914-153000 | 273M | rmdir /s /q | rt01 损坏产物，重建可复现 |
| apps/web/.next.junk-rt01-20260914-153931 | 194M | rmdir /s /q | rt01 junk 产物，重建可复现 |
| apps/web/.next-fe01 | 185K | rmdir /s /q | FE-UI-01 dev 期残留，重建可复现 |
| .feui02-standalone | 172M | rmdir /s /q | 老代际 standalone；确需回看：git 历史对应提交重建 |
| scratch/ | 26M | 删除 | `_fe01_*` 诊断散件与临时脚本（无报告正文），诊断结论已入报告 |
| apps/scratch/ | 24M | rmdir /s /q | `gen/client` Next 构建生成件，重建可复现 |

删除安全：全部含 junction 树使用 Windows 原生 `rmdir /s /q`（不移除 junction 目标，杜绝穿透 .pnpm）；删除后五点金丝雀复检证明零穿透。保留件（.next.pre-rc02 快照、.pw-* 证据、.rel01-tmp dump、*.log 诊断史）已 gitignore 不再污染 git status。

## 6. 重建一致性证明

BUILD `PcWuUbTloz3rPlzSFQrvn` 即「收口清单全量改动」的干净重建产物（AUTH-01 末次构建于全部源码改动之后；本轮仅新增 .gitignore/package.json scripts/Dockerfile/文档，均不进入 app bundle）。行为一致性由 QA-FE-01 `qa-fe-01-regression.mjs`（**26/26**：Location origin、主题默认 indigo 四层、logo MD5 三处一致、BUILD_ID 双一致）与 Host 伪造三探针（§门禁证据）在 3000 生产态实测背书。

### 6.1 镜像 BUILD_ID 与本地 BUILD 差异说明（QA-CLOSE-05 冻结）

| 构建 | BUILD_ID（实测） | NEXT_PUBLIC_SITE_URL 内联 | 用途 |
|---|---|---|---|
| 本地 standalone（3000） | `PcWuUbTloz3rPlzSFQrvn` | `http://localhost:3000` | 门禁 G0–G3 验证口径 |
| 发布镜像 `aidean-web:rel04`（= rel03 等价重建，ID `c20dd046bcea`） | `OWFVTaI9Nt-Qnv7fOSTqp` | `https://aidean.example.com` | 生产候选口径（引擎修复前） |
| 发布镜像 `aidean-web:rel05`（REL-FIX-05，tag ID `sha256:089304f2…`） | `hefb1qBCjAKz4JyZqYxlS` | `https://aidean.example.com` | **生产候选口径（P0 引擎修复后，推荐）** |

**rel05 双锚实测真值**（`docker image inspect` + `docker cp …BUILD_ID` + `docker save` blob 复算，2026-09-15 RW-1 复核）：

| 锚 | 值 |
|---|---|
| tag ID | `sha256:089304f241d113c031ed4682f3c2dace4a165aa4c2c8a6ec1eb2a6a2073e981c` |
| 内容锚（config blob sha256） | `0b7f392c62bbd844b153c20b78cd45daf044da5615348ece247d77b9c05f97ed` |
| manifest sha256（OCI 索引内 `linux/amd64` image manifest） | `cb20b4b68f6d7100d791f387d5d734bbdb10c0cc8e8d5fee36e16cffbdcebc55` |
| BUILD_ID | `hefb1qBCjAKz4JyZqYxlS` |
| Created | `2026-09-15T08:05:02.232893566Z` |
| 体积 | 267MB（纯文件系统 `Size=65244819`） |

> 索引结构：tag ID `089304f2…` 为 OCI image index（856B），其下含两个 manifest——`linux/amd64` 镜像 manifest `cb20b4b6…`（2007B）与 attestation manifest `60925d50…`（564B，`vnd.docker.reference.type=attestation-manifest`）。内容锚取 `cb20b4b6…`（平台镜像本体），不取 attestation。

**差异性质**：`NEXT_PUBLIC_*` 为构建期内联变量，内联值不同 → bundle 内容 hash 不同 → BUILD_ID 不同。**rel04/rel05 均来自收口清单同一源码**（rel03/rel04 构建于 2026-09-15 03:45Z，rel05 构建于 08:05:02Z，均位于门禁源码冻结之后）。**BUILD_ID 每次 next build 随机生成，不得作追溯锚**（REL-FIX-05 已实证：rel05 相对 rel04 仅基座期 `apk add openssl`，源码未变，`NEXT_PUBLIC_SITE_URL` 内联同值，BUILD_ID 仍由 `OWFVTaI9…` 变为 `hefb1q…`）；追溯锚一律 = **tag ID / 内容锚 config sha + manifest sha + Created 时间线 + Prisma 引擎文件名**。契约语义一致性已在两构建产物中独立验证：`url.origin=0`、middleware Edge bundle 内联公开基址、authorize/consent Location origin 固定 `AUTH_ISSUER`。

### 6.2 rel05 基座修复说明（QA-SHIP-06 冻结）

`aidean-web:rel05`（tag ID `sha256:089304f2…`，内容锚 config `0b7f392c…`，manifest `cb20b4b6…`，Created `2026-09-15T08:05:02.232893566Z`，体积 **267MB**）为 **REL-FIX-05 P0 修复**产物。构建期实测 BUILD_ID = `hefb1qBCjAKz4JyZqYxlS`（**与 rel04 的 `OWFVTaI9…` 不同值**——根因见下）；镜像内容差异仅在基座：

> **体积差**：rel05 = 267MB vs rel03/rel04 = 258MB，**+9MB** 来自 runner 阶段 `apk add --no-cache openssl`（如实测 `Size=65244819` 纯文件系统计）。

0. **BUILD_ID 变更机理（RW-1 更正，取代原「同值」表述）**：`apk add openssl` 位于 **deps 阶段**（修复需在 Prisma 构建期探测前生效）→ 该层及其后所有层（含 `next build` 层）**builder 缓存整体失效** → `next build` **真实重跑**而非命中 `.next` 缓存 → Next 每次构建**随机生成** BUILD_ID → 故 rel05 的 BUILD_ID（`hefb1q…`）**必然**不同于 rel04（`OWFVTaI9…`）。**「两构建 BUILD_ID 同值可作追溯锚」在机理上不成立**——同值只在 next build 被缓存跳过时才可能出现，而本报正是重跑场景。

1. **根因**：`node:20-alpine`（alpine 3.23）无 `openssl` CLI → Prisma 构建期探测 OpenSSL 版本失败 → 回退 `linux-musl`（1.1.x）引擎 → 链接 `libssl.so.1.1`（基座只有 libssl.so.3）→ 容器内 `PrismaClientInitializationError` → authorize/登录/token 全 500。
2. **修复**：deps + runner 双侧 `apk add --no-cache openssl`（Dockerfile unstaged diff，REL-FIX-05 交付）；`.npmrc` 注释同步校正（deps COPY 清单未含 .npmrc，以实现为准）。
3. **验证**：rel05 引擎文件 `libquery_engine-linux-musl-openssl-3.0.x.so.node`、`openssl version`=3.5.8；容器接真实 DB（`host.docker.internal:55432` rel01 演练库）authorize 未登录 **307 → `https://aidean.example.com/login`** 闭环，Host 伪造 origin 恒定、白名单外 400、`/auth/me` 401。
4. **推荐**：生产镜像以 `rel05` 为准；rel04/rel03 仅作引擎修复前的历史对照，不推荐部署。

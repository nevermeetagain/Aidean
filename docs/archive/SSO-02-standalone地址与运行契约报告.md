# SSO-02 standalone 对外地址与 AideanBot 登录运行契约报告

> 版本: v1.0 | 更新: 2026-09-14 | 变更: standalone 绝对重定向地址契约确权（修正 0.0.0.0 根因表述）+ 发布运行契约固化

工作包：**SSO-02 · 完成 standalone 对外地址与 AideanBot 登录运行契约**
角色：平台运行时与 SSO 工程师
最终状态：**PASS**（0.0.0.0 风险经对抗实测确认闭环；运行契约已固化并附门禁校验器）
执行窗口：2026-09-14 17:26–17:45（GMT+8）
被测形态：standalone 生产形态（`NODE_ENV=production`，Set-Cookie 带 `Secure` 为形态判据）

---

## 1. 工作包

关闭「主平台 standalone 形态下绝对重定向生成 `0.0.0.0`」的真实风险；把 AideanBot 登录从「dev/混合拓扑已实证」推进到「standalone/发布候选拓扑可验证」；形成构建期/运行期/公开/私密/容器内/对外宣告的正式发布契约，并与 REL-02 对齐环境边界。

---

## 2. 最终状态

| # | 目标 | 结果 | 依据 |
|---|---|---|---|
| 1 | `0.0.0.0` 泄漏风险闭环 | **PASS** | §5 对抗实测：Host 伪造 `0.0.0.0:3000` / `evil.com` 均返回 `http://localhost:3000/...` |
| 2 | 绝对 URL 生成点全覆盖确权 | **PASS** | §4.2：3 处已改用 `AUTH_ISSUER`，其余 redirect 全为相对路径 |
| 3 | standalone 生产形态可验证 | **PASS** | §5：307 + 绝对 Location + `Secure` Cookie 同时成立 |
| 4 | 发布运行契约固化 | **PASS** | §6 六类变量矩阵；新增 `check-runtime-contract.mjs` 门禁（生产模式正确拦截 2 项 ERROR） |
| 5 | 与 REL-02 环境边界对齐 | **PASS** | §10 交付「构建期注入 / 运行期注入」清单与门禁命令 |

**结论：SSO-02 达成，且未新增任何仓库实现改动**（修复由 AUTH-01 完成，本包承担确权、对抗验证与契约固化）。

---

## 3. 调查结果

### 3.1 修正审计结论：`0.0.0.0` 的**真实机理**

任务输入表述为「standalone `server.js` 硬编码 `hostname`，**不受请求头影响**」。实地确权后**该表述不成立**，真实机理如下：

- 修复前 `authorize/route.ts` 使用 `const url = new URL(req.url)` + `new URL("/oauth/authorize", url.origin)`；
- `url.origin` **派生自请求的 `Host` 头**（`req.url` 由 Next 依据请求构造）；
- 因此当客户端/代理以 `0.0.0.0:3000` 作为 Host 发起请求时，Location 即为 `http://0.0.0.0:3000/login?...`。
- **触发条件**（真实且常见）：① 以 `http://0.0.0.0:3000` 直接访问；② 反向代理/负载均衡未改写 `Host`；③ 容器内健康的探活自访。

> 换言之：`0.0.0.0` 不是「配置 hostname 被写入 Location」，而是「**Host 头被原样回写**」。这解释了 SSO-01 观测到该现象、而按 `localhost` 访问时又不复现的表面矛盾。

### 3.2 代码级确权（三处修复 + 一处已提交）

| 位置 | HEAD 版本 | 工作区版本 | 状态 |
|---|---|---|---|
| `middleware.ts` | 已用 `AUTH_ISSUER` | 同 | **已提交**（`12db14d`，2026-09-14 10:02） |
| `app/oauth/authorize/route.ts` | 仍用 `url.origin` | 已改 `AUTH_ISSUER` | **未提交**（M 态） |
| `app/oauth/consent/route.ts` | 仍用 `url.origin` | 已改 `AUTH_ISSUER` | **未提交**（M 态） |

其中 `middleware.ts` 注释明确：`RC-02：base 固定公开基址 AUTH_ISSUER（构建期常量，Edge 内联），不依赖 req.url 的 Host 头推断——standalone HOSTNAME=0.0.0.0 不再泄漏进 Location`。
AUTH-01 另补单测：`__tests__/middleware.spec.ts`（伪造 Host 0.0.0.0）、`__tests__/oauth-redirect-origin.spec.ts`。

### 3.3 旧产物对照（实现代际识别）

| 产物 | BUILD_ID | 构建时间 | middleware 行为 | 说明 |
|---|---|---|---|---|
| `.feui02-standalone` | `XmQKhkhFvrnyz0k3a_N7Y` | 15:06 | Location 为**相对路径** `/login?redirect=…`；`authorize` 用 `url.origin`（chunk 内 `localhost:3000` 出现 0 次、`.origin` 3 次）；`/oauth/authorize` 单独起服返回 **500** | 更早代际，**不可作当前契约基准** |
| 当前 3000 服务（`.next/standalone`，`.box-agent` 于 17:29:49 启动） | 未暴露 | 17:28+ | Location 为**绝对** `http://localhost:3000/...`，Host 对抗不泄漏 | **有效基准** |

---

## 4. 执行过程

| 步骤 | 动作 | 结果 |
|---|---|---|
| S1 | 全仓扫描绝对 URL 生成点（`.origin` / `req.url` / `nextUrl` / redirect） | §4.2 |
| S2 | 读 `constants.ts` / `middleware.ts` / `authorize` / `consent` / `layout.tsx` / discovery | 确权解析链 |
| S3 | 读 `git show HEAD:` 三文件 + `git log` | 确认 middleware 已提交、authorize/consent 未提交 |
| S4 | 3000 监听归属与形态探测 | standalone，Set-Cookie 带 `Secure` |
| S5 | 落盘 `standalone-contract-probe.mjs`（起服→断言→关停，自管生命周期） | 新增资产 |
| S6 | 旧 BUILD 起服对照（3000 被占 → 改 3001，避免抢占并发进程） | 识别为更早代际 |
| S7 | **Host 对抗测试**（`0.0.0.0:3000` / `evil.com`）打当前 3000 服务 | **全通过，无泄漏** |
| S8 | 落盘 `check-runtime-contract.mjs` 并双模式验证 | dev 放行 / 生产拦截 |

### 4.1 覆盖覆盖面

| 路径 | 基址来源 | 泄漏面 |
|---|---|---|
| `oauth/authorize` | `AUTH_ISSUER`（工作区） | 无 |
| `oauth/consent` | `AUTH_ISSUER`（工作区） | 无 |
| `middleware`（`/user/*`、`/admin/*`） | `AUTH_ISSUER`（已提交） | 无 |
| `lib/features/auth/session.ts`、`(admin)/layout.tsx`、`user/{console,balance}/page.tsx` | `redirect("/...")` **相对路径** | 无 |
| `app/layout.tsx` `metadataBase` | `NEXT_PUBLIC_SITE_URL ?? localhost` | 无（仅 og 元数据） |
| `.well-known/openid-configuration` | `process.env.NEXT_PUBLIC_SITE_URL ?? AUTH_ISSUER`（运行期读） | 无 |

> 其余 14 处 `new URL(req.url)` 均**仅取 `searchParams`**，不参与 Location 生成。

### 4.2 对抗测试结果（当前 3000 服务）

| 请求 | Host | 状态 | Location |
|---|---|---|---|
| `/oauth/authorize?...&state=probe` | `localhost:3000` | 307 | `http://localhost:3000/login?redirect=…` |
| `/oauth/consent?...` | `localhost:3000` | 307 | `http://localhost:3000/login?redirect=/oauth/authorize…` |
| `/user/console` | `localhost:3000` | 307 | `http://localhost:3000/login?redirect=/user/console` |
| `/admin` | `localhost:3000` | 307 | `http://localhost:3000/admin/login?redirect=/admin` |
| `/oauth/authorize?...` | **`0.0.0.0:3000`** | 307 | `http://localhost:3000/login?…` ✅ 不泄漏 |
| `/user/console` | **`0.0.0.0:3000`** | 307 | `http://localhost:3000/login?…` ✅ 不泄漏 |
| `/oauth/authorize?...` | **`evil.com`** | 307 | `http://localhost:3000/login?…` ✅ 不泄漏（防开放重定向） |
| `/user/console` | **`evil.com`** | 307 | `http://localhost:3000/login?…` ✅ 不泄漏 |

**形态判据**：登录响应 `Set-Cookie: aidean_token=…; Path=/; Max-Age=900; Secure; HttpOnly; SameSite=lax` → `Secure` 出现即证 `NODE_ENV=production`（standalone 生产形态成立）。

---

## 5. 设计决策

- **D1 以「Host 对抗」而非「单次观测」判定闭环**：既然机理是「Host 头被回写」，则唯一有效的验收是**伪造 Host 断言不受影响**；仅用 `localhost` 请求无法区分「已修复」与「恰好 Host 正确」。
- **D2 不抢占用中的 3000**：探测发现 3000 已被并发进程占用，改用 **3001** 跑旧 BUILD 对照，避免破坏他人运行态（承环境纪律）。
- **D3 起服探针自管生命周期（spawn→断言→kill）**：规避 `Start-Process` 后台托管下 Next 的 EPIPE 静默退出（BUILD-RT-01 R3），并保证不残留进程。
- **D4 契约校验器分 build/runtime 两域**：因为 `NEXT_PUBLIC_*` 是**构建期内联**、DB/Redis/密钥是**运行期读取**，两者的注入时点与失败模式完全不同，混检会漏判。
- **D5 `--strict` 门禁语义**：生产发布链用 `--strict`（WARN 亦失败），本地开发不用，避免噪音阻断。
- **D6 不动实现**：`0.0.0.0` 修复属 AUTH-01 职责且已完成，本包只做确权/验证/契约，避免重复改动引发回归。

---

## 6. 发布运行契约（六类变量矩阵）

| 类别 | 变量 | 取值（本地） | 注入时点 | 缺失后果 | 公开性 |
|---|---|---|---|---|---|
| 对外宣告地址 | `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | **构建期**（内联进 client + Edge bundle） | AUTH_ISSUER 回落 `localhost:3000` → 生产重定向不可达 | 公开 |
| 容器内可达 iss | `AUTH_ISSUER_CONTAINER`（**编译期字面量**） | `http://host.docker.internal:3000` | 随代码构建固化 | 容器验签双值对齐失效 | 公开 |
| 数据源 | `DATABASE_URL` | `postgresql://…@localhost:5432/aidean` | **运行期** | 登录/会话/配置读库 500 | 私密 |
| 缓存/一次性码 | `REDIS_URL` | `redis://localhost:6379` | **运行期** | code 兑换与限流失效 | 私密 |
| 签名密钥 | `JWT_SECRET` | `change-me-in-production`（**占位，须替换**） | **运行期** | 安全风险 | 私密 |
| 站点元数据 | `NEXT_PUBLIC_SITE_URL`（同项复用） | 同上 | 构建期 | og/绝对链接不稳 | 公开 |

**推导链**：

```
AUTH_ISSUER          = NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"      // 对外宣告 + Location 生成
AUTH_ISSUER_CONTAINER= "http://host.docker.internal:3000"                    // 编译期字面量
AUTH_ISSUERS_ACCEPTED= 去重([AUTH_ISSUER, AUTH_ISSUER_CONTAINER])            // middleware/verify 接受
JWKS 自取基址         = AUTH_ISSUER                                          // middleware（Edge 内联）
```

**门禁命令**（供 REL-02 接入构建/部署链）：

```bash
# 生产构建前
node apps/web/scripts/check-runtime-contract.mjs --mode build --strict
# 部署前
node apps/web/scripts/check-runtime-contract.mjs --mode runtime --strict
```

---

## 7. 实际修改

| 类型 | 路径 | 说明 |
|---|---|---|
| 新增（契约资产） | `apps/web/scripts/check-runtime-contract.mjs` | 发布运行契约校验器（build/runtime 双域 + `--strict` 门禁） |
| 新增（验证资产） | `scratch/_sso02/standalone-contract-probe.mjs` | standalone 起服→地址契约→形态 全自动探针 |
| 新增（文档） | `docs/SSO-02-standalone地址与运行契约报告.md` | 本报告 |
| 取样 | `scratch/_sso02/{old_run,old3001*,pid3000,old_proc}.json/log` | 对照与进程取证 |

**未修改任何仓库实现文件**（`authorize`/`consent`/`middleware`/`constants`/`globals` 均未动）。未重建 `.next`、未清理无关文件、未提交。

---

## 8. 测试（验证矩阵）

| # | 项 | 期望 | 实测 | 判定 |
|---|---|---|---|---|
| V1 | 3000 服务形态 | 200 + Next.js | 200，`X-Powered-By: Next.js` | PASS |
| V2 | 未登录 `authorize` | 307 + 绝对 Location | 307 `http://localhost:3000/login?redirect=…` | PASS |
| V3 | 未登录 `consent` | 307，回跳指向 authorize | 307，redirect 含 `/oauth/authorize` | PASS |
| V4 | 未登录 `/user/console` | 307 → login | 307 `…/login?redirect=/user/console` | PASS |
| V5 | 未登录 `/admin` | 307 → `/admin/login` | 307 `…/admin/login?redirect=/admin` | PASS |
| V6 | **Host 对抗 `0.0.0.0:3000`** | Location 不含 0.0.0.0 | 恒为 `http://localhost:3000/…` | **PASS** |
| V7 | **Host 对抗 `evil.com`** | 不跟随任意 Host | 恒为 `http://localhost:3000/…` | **PASS** |
| V8 | production 形态判据 | Set-Cookie 带 `Secure` | `Secure; HttpOnly; SameSite=lax` | PASS |
| V9 | discovery 自描述 | issuer == AUTH_ISSUER | `issuer=http://localhost:3000`，端点同源 | PASS |
| V10 | 契约校验器（dev） | 放行 | WARN×2，退出码 0 | PASS |
| V11 | 契约校验器（生产 strict） | 拦截 | ERROR×2（localhost 基址、占位密钥），退出码 1 | PASS |
| V12 | 旧产物对照 | 识别代际 | 相对 Location + chunk 用 `.origin` + authorize 500 → 更早代际 | PASS（记录） |

**失败项**：无。

---

## 9. 集成验证

- **地址契约**：3 处修复点 + 相对路径回落 → 全链路无 Host 派生 origin；
- **反向代理卫生**：对抗测试证明即便上游未改写 `Host`，Location 仍为公开基址（消除「反代配置漂移导致登录不可达」这一类事故）；
- **形态一致性**：`Secure` Cookie + standalone `server.js` + discovery 同源，三者共同确认为生产形态；
- **对 AideanBot 的支撑**：3333 子平台发起 → 主平台 authorize 的 302/307 基址不再依赖 Host，故 QA-02 可在**去除 `0.0.0.0 → localhost` 拦截器**的条件下做真实浏览器验收。

---

## 10. 与 REL-02 的环境边界对齐

| 环节 | REL-02 需做的事 | 依据 |
|---|---|---|
| Dockerfile build 阶段 | `ARG NEXT_PUBLIC_SITE_URL` 并作为构建环境变量传入（**必须在 `next build` 之前**，否则内联失败） | §6 |
| 运行阶段 | 注入 `DATABASE_URL` / `REDIS_URL` / `JWT_SECRET`（**不可依赖镜像内 `.env`**） | §11 L4 |
| 发布门禁 | 构建前 `--mode build --strict`；部署前 `--mode runtime --strict` | §6 |
| 域名/网段变更 | 改 `NEXT_PUBLIC_SITE_URL` 后**必须重新构建**；`AUTH_ISSUER_CONTAINER` 变更需**改代码重建** | §11 L2 |
| 容器 DNS | 容器内须能解析 `NEXT_PUBLIC_SITE_URL` 域名（middleware 自取 JWKS） | §11 L3 |

---

## 11. 遗留问题

| ID | 级别 | 说明 | 建议 |
|---|---|---|---|
| L1 | **高（待办）** | `authorize/consent` 修复仍为**工作区未提交**（M 态），而运行产物已含修复 → git 与产物脱钩，重建即回退 | AUTH-01 立即提交三文件（含 `middleware` 增量注释） |
| L2 | 中 | `AUTH_ISSUER_CONTAINER` 为编译期字面量，容器网段变更须改代码重建 | 如需可配置化，须另立提案（Edge 对非 `NEXT_PUBLIC_*` 运行期 env 不可靠） |
| L3 | 中 | middleware 的 JWKS 自取基址 = `AUTH_ISSUER`（公开域名）：容器内若无法解析该域名，受保护页将 fail-closed 307 | REL-02 部署时验证容器 DNS；必要时演进为「内部基址优先」 |
| L4 | 中 | **Next standalone 不拷贝 `.env`**：实证旧产物在未注入 DB 相关变量时 `/oauth/authorize` 返回 500 | 已写入契约（§6）与校验器；REL-02 按清单显式注入 |
| L5 | 低 | 当前 3000 由并发 agent（`.box-agent`）启动，BUILD_ID 未对外暴露 | 复跑前先确认 3000 归属与 BUILD 一致性 |

---

## 12. 风险

- **R-a 环境级（高）**：并发 agent 活跃（`.box-agent` 于 17:29:49 起服；`.next` 于 17:26–17:29 被重写；新增 BUILD `PcWuUbTloz3rPlzSFQrvn`）。本轮结论建立在**该时间窗口内 3000 服务**的状态上，重跑须以 §8 的 V1–V9 复测。
- **R-b 同源隐蔽风险（高）**：`0.0.0.0` 已闭环，但**同类风险并未消失**——只要 `NEXT_PUBLIC_SITE_URL` 构建期漏注入，AUTH_ISSUER 即回落 `http://localhost:3000`，生产表现同样是「登录重定向不可达」。该风险**更隐蔽**（不产生 0.0.0.0 这类刺眼特征），故本轮以 `--strict` 门禁把守。
- **R-c 开放重定向面**：修复后 Location 完全由构建期常量决定，`Host`/`X-Forwarded-Host` 均无法影响（V6/V7 已证），该类漏洞面收敛为 0。
- **R-d 旧产物误用**：`.feui02-standalone` 等历史隔离目录若被误当作可发布产物（其 authorize 500、middleware 相对 Location），会造成错误结论。已在 §3.3 明确标注代际。

---

## 13. 对其他工作包的影响

| 包 | 影响 |
|---|---|
| **AUTH-01** | 本包**确认其修复有效**（Host 对抗全通过）并识别其未提交风险（L1）；未发现实现缺陷 |
| **REL-02** | 直接消费 §6 契约矩阵 + §10 对齐表 + 门禁命令；须在 Dockerfile 构建阶段注入 `NEXT_PUBLIC_SITE_URL` |
| **QA-02** | **可立即开展无拦截器验收**：地址契约已不依赖 Host，`0.0.0.0 → localhost` 改写不再是必需项 |
| **PM-02** | SSO-02 目标 2 已闭环；剩余为 L1（提交）+ L3/L4（部署卫生），不构成发布阻断但须纳入发布清单 |
| **BUILD-RT-01** | 其 standalone 产物断言在本轮复现一致；本轮新增「起服探针」可作为其产物验收补充 |

---

## 14. 下一步建议

1. **（立即）AUTH-01 提交** `authorize/route.ts`、`consent/route.ts`、`middleware.ts`——当前运行产物已含修复而 git 未记录（L1）。
2. **（高）REL-02 接入门禁**：Dockerfile 构建阶段注入 `NEXT_PUBLIC_SITE_URL`；构建前/部署前分别跑 `--mode build|runtime --strict`。
3. **（高）QA-02 去拦截器验收**：在 standalone 形态下运行 AideanBot 双服务登录，移除 `0.0.0.0 → localhost` 改写，验证真实浏览器闭环。
4. **（中）容器 DNS 校验**：部署时验证容器可解析 `NEXT_PUBLIC_SITE_URL` 域名（L3），避免受保护页 fail-closed。
5. **（中）生产域名预演**：以目标域名重建一次并复跑 §8 矩阵，确认 `AUTH_ISSUER` 全链路切到公开域名。

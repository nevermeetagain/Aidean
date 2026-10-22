# 子平台 SSO 接入指南

> 版本: v1.5 | 更新: 2026-10-22 | 变更: §2.1 本地/联调例外补「`/oauth/dev/callback` 生产环境 404」（UX-21）。前次（v1.4 | 更新: 2026-09-28）变更: **新增 §2.1「二级域名接入约定」**——子平台统一以二级域名（`<product>.aidean.com`）对外：域名规划与 DNS/TLS（通配符证书）、redirect_uri 白名单按完整二级域地址登记、主平台会话 Cookie 保持 **host-only** 不跨子域共享（代码依据 `apps/web/lib/features/auth/constants.ts:139-146`，`baseCookieOptions()` 不设 `domain`）、禁止父域 Cookie 扩散、SameSite=Lax 与跨子域授权跳转兼容性、CORS 边界与本地联调例外；§7 安全红线新增第 8 条。前次（v1.3 | 2026-09-26）：**§10 修正自相矛盾**——back-channel logout 广播已实现（v1.1 §4 表记 ADR-0003 L4.1：2 次重试/单次 5s 超时 best-effort，`lib/features/oauth/backchannel.ts:47,81`），删除「主平台登出不会自动通知子平台」旧表述；新增 §10.1「子平台 logout 端点清单」验收模板（#13 验收载体）。前次（v1.2 | 2026-09-18）：§4 补记 refresh 链重放告警（ADR-0003 L4.5：重放→整链撤销+auth-security 结构化日志）。前次（v1.1）：§4 登出语义补记 back-channel logout 广播（ADR-0003 L4.1）：主站自身登出时向该用户全部活跃 SSO 产品链广播 logout_token。前次（v1.0）：首版（随 M-SSO 里程碑落地；端点契约对应 ADR-0002 与《API接口文档》§5.7）
> 受众：AideanRag / WeChatRag / SkillsCloud 及后续接入主平台账号体系的子平台开发者。
> 端点权威清单见《[API接口文档](../../architecture/API接口文档.md)》§5.7；架构决策背景见《[ADR-0005-SSO统一认证选型](../../ADR/ADR-0005-SSO统一认证选型.md)》与《[ADR-0003-多平台账号与余额共享路线](../../ADR/ADR-0003-多平台账号与余额共享路线.md)》。

---

## 1. 概述

主平台作为 **Identity Provider（IdP）**：账号、密码、微信 openid、tier 等级、钱包全部只在主平台；子平台作为 **Relying Party（RP）** 通过标准 OAuth2 授权码流获得用户授权，**本地验签**消费令牌（零网络往返），凭用户身份实时查询权益。

三条铁律（先记住再往下读）：

1. **用户密码只在主平台登录页输入**——子平台任何页面不得出现密码输入框，任何后端不得转发密码；
2. **身份锚点是 `sub`（= 主平台 `User.id`）**——同一用户在所有子平台 sub 一致，以此为本地账号关联键；
3. **余额/套餐是实时数据**——禁止本地持久化副本，一律实时查询（见 §5）。

## 2. 接入前置：域名规划与 client 注册

### 2.1 域名规划：子平台统一使用二级域名

> **决策（2026-09-28 起生效）**：Aidean 生态统一采用「主域 + 产品二级域名」的域名规划——所有子平台一律以主平台根域名的**二级域名**对外提供服务，不再使用独立根域名或路径前缀挂载（如 `aidean.com/<product>` 不采用）。下文以 `aidean.com` 示意，**实际生产域名以部署时的 `NEXT_PUBLIC_SITE_URL` 与 DNS 分配为准**。

| 角色 | 域名（示意） | 说明 |
|---|---|---|
| 主平台（IdP） | `aidean.com`（或 `www.aidean.com`） | 账号、登录页、`oauth/*` 端点、发现文档、JWKS 的唯一宿主；`issuer` 由此决定 |
| 子平台 | `https://<product>.aidean.com` | 每个子平台一个专属二级域名，如 `bot.aidean.com` / `fleet.aidean.com` / `thesis.aidean.com`（**示例命名，最终以实际分配为准**） |
| 本地开发 | `http://localhost:<port>` | 开发期不使用二级域名；回调白名单可单独登记 localhost 条目（见本节末「本地/联调例外」） |

**落地约定（逐条说明）**：

1. **DNS 统一入口**：每个子平台二级域名添加一条 A/CNAME 记录，指向统一 nginx 入口；主平台与各子平台在 nginx 中各占一个独立 `server` 块（`server_name <product>.aidean.com`），TLS 终结后反代到各自应用端口。新增子平台只需「加一条 DNS + 加一个 server 块」，主平台无需任何变更。
2. **TLS 证书**：统一入口推荐使用**通配符证书 `*.aidean.com`**——新增子平台无需重新签发证书；CA 不支持通配符签发时按域名单发。所有子域强制 HTTPS（§7 安全红线：令牌只经 HTTPS 传输）。注意单层通配符只覆盖一级子域（`a.aidean.com`），不要规划更深层级（`a.b.aidean.com` 不在覆盖范围内）。
3. **redirect_uri 白名单按二级域登记**：白名单为**精确匹配**（协议 + 域名 + 端口 + 路径全一致，不支持通配），每个子平台的每条回调地址单独登记一条完整 URL，如 `https://bot.aidean.com/auth/aidean/callback`。**不要申请通配符白名单**（如 `*.aidean.com`）——协议本身不支持，登记了也不会生效。
4. **会话 Cookie 保持 host-only（关键设计，勿破坏）**：主平台会话 Cookie（`aidean_token` 系）由 `baseCookieOptions()` 签发（`apps/web/lib/features/auth/constants.ts:139-146`：`HttpOnly + SameSite=Lax + Secure(生产) + path=/`，**不设置 `domain` 属性**），即 host-only Cookie——仅在主平台自身域名下生效，**不会随请求发送到任何子平台二级域**。由此：
   - 子平台页面**拿不到也看不到**主平台登录态——跨子域不存在「静默共享登录态」；
   - 联合登录经由 `/oauth/authorize` 跳转完成：从 `<product>.aidean.com` 302 到主平台域名属**顶层 GET 导航**，主平台 host-only Cookie 随导航正常携带（`SameSite=Lax` 允许），已登录用户一次点击即签发授权码，体验不受影响；
   - **这是有意设计而非缺陷**：若把主平台会话 Cookie 放宽为 `Domain=.aidean.com` 父域共享，主平台会话令牌将暴露给全部子域（任一子平台被攻破即可携带主平台会话发起请求），并破坏两级撤销语义——因此**禁止**（见 §7 红线 8）。跨子域登录态一律经 §3 授权码流建立，子平台本地会话以自己的 Cookie 承载（同样建议 host-only）。
5. **CORS 边界**：`/oauth/token`、`/oauth/userinfo`、权益/钱包查询均为**服务端对服务端**调用，不涉及浏览器 CORS，无需任何配置；仅当公共客户端（SPA）需要从浏览器直调主平台端点时，才需主平台侧为该二级域名 origin 显式放行（默认不开放）。
6. **issuer 与发现文档不受影响**：`issuer`、`/.well-known/openid-configuration`、`/.well-known/jwks.json`、`/oauth/*` 恒在主平台域名下（由 `NEXT_PUBLIC_SITE_URL` 决定），子平台域名只出现在自身站点与 `redirect_uri` / `logoutUri` 白名单登记中。

**本地/联调例外**：开发环境不使用二级域名，`redirect_uri` 白名单可另行登记 `http://localhost:<port>/...` 条目（或使用 §2 端点清单中的 `/oauth/dev/callback` 联调回调页，仅非生产环境挂载，生产 `NODE_ENV=production` 下返回 404，不得登记进生产白名单）；生产二级域条目与本地条目**分开登记、互不复用**。

### 2.2 注册你的 client

向主平台管理员提供以下信息，注册后获得凭据：

| 项 | 说明 |
|---|---|
| `clientId` | 全局唯一标识（如 `aidean-rag`） |
| `clientSecret` | 仅颁发一次，**只存子平台服务端**（环境变量注入，禁止入库/前端/仓库） |
| `redirectUris` | 授权回调地址**精确匹配白名单**（协议+域名+端口+路径全一致；不支持通配） |
| `scopes` | 声明的资源面：`openid` `profile` `wallet:read`（计费写入 `billing:write` 需单独评审） |
| `pkceRequired` | **公共客户端（SPA/无服务端后端/移动端）必须为 true**；first-party 服务端应用可为 false |

环境口径：`issuer` = 主平台对外地址（生产由 `NEXT_PUBLIC_SITE_URL` 决定），下文以 `<issuer>` 代指。所有端点：

```
<issuer>/.well-known/openid-configuration   # 发现文档（端点与能力自描述）
<issuer>/.well-known/jwks.json              # RS256 公钥集（缓存后本地验签）
<issuer>/oauth/authorize                    # 授权码签发（浏览器跳转）
<issuer>/oauth/token                        # 令牌兑换/刷新（服务端）
<issuer>/oauth/userinfo                     # 用户资料（Bearer）
<issuer>/oauth/revoke                       # 撤销 refresh 链
<issuer>/oauth/introspect                   # refresh 活性内省（可选）
```

## 3. 登录集成：授权码流（五步）

### 第 1 步 · 构造授权跳转

用户点击"使用 Aidean 账号登录"时，子平台（或前端）302 跳转：

```
GET <issuer>/oauth/authorize
  ?response_type=code
  &client_id=<你的 clientId>
  &redirect_uri=<白名单内的回调地址，URL 编码>
  &scope=openid profile wallet:read        # 必须是注册 scopes 的子集
  &state=<随机串，≥16 字符，存入子平台会话>
  &nonce=<随机串（可选，OIDC 防重放）>
  &code_challenge=<BASE64URL(SHA256(code_verifier))>   # 公共客户端必填
  &code_challenge_method=S256
```

**义务**：
- `state` 必填——回调时必须校验一致（防 CSRF）；
- 公共客户端（`pkceRequired=true`）必须携带 `code_challenge`（S256），`plain` 不支持；
- `response_type` 只接受 `code`。

### 第 2 步 · 主平台认证用户

- 用户未登录 → 主平台展示登录页（**邮箱密码 / 微信扫码**双身份源），登录成功后自动回到授权流程——子平台无需关心认证方式；
- 用户已登录主平台 → 直接签发授权码（一次点击完成）。

### 第 3 步 · 接收回调

授权成功，主平台 307 重定向到你的 `redirect_uri`：

```
<redirect_uri>?code=<一次性授权码>&state=<原样回传>
```

子平台回调处理：**先校验 `state` 与会话中保存值一致**，再取 `code`。失败场景主平台会以 `error` / `error_description` 参数回传（如 `invalid_scope` / `unsupported_response_type` / `invalid_request`）。

> 注意：若 `client_id` 或 `redirect_uri` 本身不合法，主平台**不会重定向**（直接返回 400 页面）——这是防开放重定向的设计，接入调试时先核对白名单。

### 第 4 步 · 兑换令牌（子平台服务端 → 主平台）

```
POST <issuer>/oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(clientId:clientSecret)     # 或 form 字段 client_id/client_secret

grant_type=authorization_code
code=<第 3 步拿到的授权码>
redirect_uri=<必须与第 1 步完全一致>
code_verifier=<PKCE 校验器（公共客户端必填）>
```

成功响应（`Cache-Control: no-store`）：

```json
{
  "access_token": "<RS256 JWT，15 分钟>",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "<7 天，轮换链锚点>",
  "id_token": "<RS256 JWT：sub/email/nickname/tier/nonce>",
  "scope": "openid profile wallet:read"
}
```

失败形态：`{"error": "invalid_grant" | "invalid_client" | "unsupported_grant_type", "error_description": "..."}`，HTTP 状态 400/401。

### 第 5 步 · 建立子平台本地会话

- **服务端会话（推荐）**：子平台后端将 `access_token`/`refresh_token` 与自己的会话 Cookie 绑定存储（服务端存储/加密 Cookie）；
- `id_token` 中的 `sub` 即用户唯一身份锚点，据此关联/创建子平台本地用户记录（见 §6 存量迁移）；
- **禁止**把 `refresh_token`/`client_secret` 下发到浏览器。

## 4. 会话维持与登出

### 刷新（refresh_token grant）

access 有效期 15 分钟。过期前用 refresh 换新对（**旧 refresh 立即失效**，轮换链语义）：

```
POST <issuer>/oauth/token
Authorization: Basic base64(clientId:clientSecret)

grant_type=refresh_token
refresh_token=<当前 refresh_token>
```

响应与兑换相同（新的 `access_token` + `refresh_token`）。

### 两级撤销语义（重要）

| 动作 | 语义 | 实现 |
|---|---|---|
| **用户在子平台登出** | 仅断开该用户在该产品的 refresh 链，不影响其主平台及其他产品登录态 | 子平台清除本地会话 + 服务端调 `POST /oauth/revoke`（`token=<refresh_token>`，client 认证；无论令牌状态恒 200） |
| **用户改密 / 被封号（主平台）** | **全端失效**：该用户所有产品的 refresh 链撤销 + 已发 access 最长 15 分钟内自然过期 | 主平台 tokenVersion++ 自动发生，子平台无需处理，只需正确处理刷新失败（§6） |
| **refresh 链重放（安全事件）** | 已轮换代的 refresh_token 被复用 → **整链立即撤销**（重放者与合法用户同时下线）+ 主平台输出 `auth-security / refresh_replay` 结构化告警日志（含 jti/userId/clientId/chainId），供日志侧采集告警 | 主平台自动发生（ADR-0003 L4.5）；子平台无需处理，重放后刷新失败即回到登录页 |
| **用户在主平台登出（back-channel）** | 主平台撤销自身链后，向该用户**全部活跃 SSO 产品**逐条 POST `logout_token`（RS256 JWT，含 `events.backchannel-logout` + `sid`，fire-and-forget 5s 超时）；子平台收到后应销毁对应用户本地会话 | 子平台在 client 注册时配置 `logoutUri` 即自动启用（ADR-0003 L4.1）；未配置 `logoutUri` 的 client 不受影响，其会话随 refresh 轮换失败自然失效 |

### 强实时撤销（可选）

若子平台需要逐请求确认 refresh 活性（如涉资金操作），调 `POST /oauth/introspect`。access 的实时性由 15 分钟 TTL + 关键操作二次校验承担。

## 5. 用户资料与权益

### 5.1 用户资料

```
GET <issuer>/oauth/userinfo
Authorization: Bearer <access_token>
```

```json
{ "sub": "<User.id>", "email": "...", "nickname": "...", "tier": "NORMAL|PRO|MAX", "role": "USER|..." }
```

### 5.2 余额与套餐（实时查询，服务端对服务端）

```
GET <issuer>/api/v1/internal/billing/wallet?userId=<sub>
Authorization: Basic base64(clientId:clientSecret)
```

```json
{ "code": 0, "data": {
    "user": { "id": "...", "tier": "PRO", "status": "ACTIVE", "nickname": "..." },
    "wallet": { "balanceYuan": "12.34", "heldYuan": "0.00", "availableYuan": "12.34", "currency": "CNY" }
} }
```

- 需要 client scope `wallet:read`；`userId` 用 userinfo 拿到的 `sub`；
- **实时读取，禁止本地持久化余额副本**（余额随消费变动，副本必然漂移）；
- tier 门禁：子平台按 `tier`/`status` 决定功能开关（如 PRO 专属能力）。

### 5.3 AI 消费计费

子平台内的大模型调用**不自行扣费**：经主平台统一计费网关（`/api/v1/gateway/chat`）调用，费用自动计入主平台钱包账本（预扣-捕获，幂等）。子平台自有消费场景的记账通道（`billing:write` scope）需单独评审后开放。

## 6. 错误处理与排查

| 信号 | 含义 | 处理 |
|---|---|---|
| 回调无 code，`error=invalid_request` | 缺 state / PKCE 缺失或方法不对 | 修正参数重发起 |
| `invalid_scope` | 请求了未注册的 scope | 核对注册 scopes |
| `invalid_client`(401) | secret 错误 / client 停用 | 检查凭据与管理台状态 |
| `invalid_grant`（兑换） | code 过期（60s）/ 已使用 / redirect_uri 不一致 / PKCE 失败 | **重新走授权流程**，不可复用旧 code |
| `invalid_grant`（刷新） | refresh 被撤销 / **旧值复用（重放检测）** / 用户改密封号 | 引导用户重新登录；**禁止无限重试** |
| userinfo 401 `invalid_token` | access 过期或无效 | 用 refresh 轮换后重试 |

**重放检测说明**：refresh 实现轮换链安全——若已轮换的旧 refresh 被复用（疑似泄露），主平台会撤销整条链（新旧令牌同时失效）。因此子平台**必须可靠持久化最新一代 refresh_token**（写入失败会导致下次刷新即被判定重放）。

## 7. 安全红线（接入方必须遵守）

- [ ] clientSecret 只存在于子平台服务端环境变量；
- [ ] `state` 必填并在回调时强校验；
- [ ] 公共客户端必须启用 PKCE（注册时 `pkceRequired=true`），且不得在公共客户端使用 client_secret；
- [ ] 密码输入框只允许出现在主平台登录页；
- [ ] 令牌只经 HTTPS 传输；token 端点响应不缓存；
- [ ] 禁止本地持久化用户余额副本；
- [ ] 处理刷新失败时引导重登录，不循环重试。
- [ ] 主平台会话 Cookie 保持 **host-only**（不设置 `Domain` 属性向子域扩散）；禁止以父域 Cookie（`Domain=.aidean.com`）共享登录态替代标准授权码流，子平台不得读取主平台 Cookie 判定登录态（见 §2.1）。

## 8. 最小接入示例

### Node（兑换 + 刷新）

```js
// 兑换（服务端）
const token = await fetch(`${ISSUER}/oauth/token`, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
  },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code, redirect_uri: REDIRECT_URI,
  }),
}).then(r => r.json());

// 刷新（旧 refresh 用后即废，必须保存响应中的新 refresh_token）
const refreshed = await fetch(`${ISSUER}/oauth/token`, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
  },
  body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: savedRefresh }),
}).then(r => r.json());

// 实时权益查询（服务端对服务端）
const wallet = await fetch(`${ISSUER}/api/v1/internal/billing/wallet?userId=${sub}`, {
  headers: { authorization: `Basic ${basicAuth}` },
}).then(r => r.json());
```

### Python（RagFlow 口径，PyJWT 本地验签示意）

```python
import jwt, requests
from jwt import PyJWKClient

jwks = PyJWKClient(f"{ISSUER}/.well-known/jwks.json")   # 缓存公钥，本地验签
key = jwks.get_signing_key_from_jwt(access_token)
claims = jwt.decode(access_token, key.key, algorithms=["RS256"],
                    issuer=ISSUER, audience=CLIENT_ID)  # aud=你的 clientId
# claims["sub"] = 用户唯一锚点；claims["tier"] = 权益等级
```

## 9. 存量用户绑定迁移（RagFlow 场景）

RagFlow 已有自有用户体系。首次联合登录时按以下顺序关联：

1. `sub` 已在绑定表 → 直接登录；
2. 未绑定但 **email 与 RagFlow 本地用户一致** → 提示确认后合并（建议验证 RagFlow 本地密码一次）；
3. 均无匹配 → 以 `sub` 创建新 RagFlow 用户。

绑定关系落在子平台侧（`sub ↔ 本地 userId` 映射表），主平台不感知子平台内部账号。

## 10. 已知边界与演进

- 单点登出（back-channel logout）**已实现**（v1.3 修正：本条旧文与 §4 表「back-channel」行矛盾）：主平台登出时向该用户全部活跃 SSO 产品链广播 `logout_token`（RS256 JWT，2 次重试、单次 5s 超时，best-effort——`lib/features/oauth/backchannel.ts:47,81,89`）；子平台在 client 注册配置 `logoutUri` 即启用，未配置者会话随 refresh 轮换失败自然失效，或经 introspect 主动探测；
- 微信扫码身份源依赖主平台微信凭据下发（待办），协议链路已就绪；
- 接入方超过 5 个或需开放第三方时，主平台将以 `oidc-provider` 独立 idp 服务演进（端点契约兼容，本指南主体不变）。

### 10.1 子平台 logout 端点清单（back-channel 全量一致性验收模板，#13）

| client_id | 产品 | logoutUri | 验收状态 |
|---|---|---|---|
| （待产品侧回填） | AideanBot | — | ⬜ |
| （待产品侧回填） | AideanFleet | — | ⬜ |
| （待产品侧回填） | AideanThesis | — | ⬜ |

> 回填流程：产品侧提供各子平台 logout 端点 → 主平台 oidcClient 配置 `logoutUri` → 按 §4「back-channel」行执行一轮真实登出验证（子平台会话同步销毁）→ 本表置 ✅（#13 关账）。

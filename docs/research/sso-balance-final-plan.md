# Aidean 多平台 SSO + 余额共享：方案A/B 逐点裁决与最终方案大纲

> 依据：本机代码实测（E:\Code\Aidean、E:\Code\AideanBot）、ADR-0002、登录方案评审文档、已读文章正文（Casdoor 速览）、公开检索核验。

## 一、两方案的共同事实错误

1. **方案A、方案B 均声称"无法读取微信文章"** —— 错误。文章正文已成功读取：主题为 Casdoor（开源 IAM/SSO，Apache-2.0，OAuth2/OIDC/SAML/CAS/LDAP/SCIM/WebAuthn/MFA，Casbin 授权，MCP Gateway/A2A Agent-first 定位）。方案B 猜测"Sa-Token/xxl-sso"属臆测，且该两工具属 Java 生态，与 Aidean Next.js 技术栈无关。
2. **两方案共同盲区**：都在讨论"要不要自建 IdP / 选哪个 IdP"，而真实代码中——
   - IdP 已建成并在运行：主平台 3000 standalone 即 SSO IdP；`app/oauth/*` 七端点 + `/.well-known/openid-configuration` + RS256/JWKS；
   - AideanBot 已接入：`oidc_clients.wechat-rag` 含 3333 回调（seed 固化）；AideanBot 后端（FastAPI）`/auth/login` 302 → 主平台 authorize，`GET /api/v1/auth/callback` 换码建会话，`app/services/auth/{service,session_store,state_store}.py` 齐备；完整 SSO 链路已实测通过（307→登录→code+state→会话）；
   - 余额共享基建已存在：`GET /api/v1/internal/billing/wallet`（client 凭据 + `wallet:read` scope，返回 balance/held/available 实时视图）、`billingService.getWalletView`、BalanceHold 预扣体系（hold/capture/void/releaseExpiredHolds + 对账测试）。

## 二、方案A 逐点裁决

| # | 要点 | 判断 | 依据 |
|---|---|---|---|
| A1 | 跨域禁用 Cookie 共享，走 OIDC 重定向 | ✅ 成立 | 与现网 authorize/middleware 设计一致 |
| A2 | JWT≠SSO；认证归 OIDC | ✅ 成立 | 现状即此（id_token+nonce、aud 隔离） |
| A3 | 余额不进 JWT，实时查询 | ✅ 成立 | internal wallet API 即实时视图，无本地持久化 |
| A4 | Global Account→Product→Workspace→Membership 四层 | ⚠️ 部分采纳 | Product 层=OidcClient 已存在；Workspace/Membership 对 Bot/Wiki 现状过度设计，推迟 |
| A5 | 余额=Ledger+Reservation+幂等 | ✅ 原则正确，且**已实现** | Wallet/LedgerEntry/BalanceHold 表 + hold/capture/refund 测试齐全；方案A 视为待建属信息差 |
| A6 | 本地 JWKS 验签，勿逐请求 introspect | ✅ 已实现 | middleware createRemoteJWKSet（kid 缓存） |
| A7 | BFF/HttpOnly Cookie | ✅ 已实现 | aidean_token/aidean_refresh HttpOnly+Secure |
| A8 | 工具核验（Keycloak/ZITADEL/Logto/Casdoor/authentik/Ory） | ✅ 方向正确；⚠️ 版本号未核验且与检索冲突（Casdoor 检索得 v3.119.0@2026-07、13.3~14k star，方案A 称 v4.6.0） | 检索证据 |
| A9 | ZITADEL 许可证 AGPL-3.0 校正 | ✅ 检索证实 | Go、事件溯源、原生多租户 |
| A10 | "文章无法读取"前提 | ❌ 错误 | 本会话已读正文 |
| A11 | 多副本/多区域 HA 建议 | ⚠️ 方向对，现阶段过度 | 单人开发者单机部署 |

## 三、方案B 逐点裁决

| # | 要点 | 判断 | 依据 |
|---|---|---|---|
| B1 | 主站兼任 IdP 阶段性正确 | ✅ 与 ADR-0002 一致且为既成事实 | apps/web 内嵌 IdP |
| B2 | IdP 逻辑隔离独立路由 | ✅ 已实现 | app/oauth/* 独立前缀 |
| B3 | 阶段二迁 Casdoor（≥5 子项目触发） | ⚠️ 触发条件对；低估迁移成本（密码哈希迁移、tier/钱包耦合、微信带参二维码无现成适配） | ADR-0002 否决记录 |
| B4 | MVP 引入 node-oidc-provider/authlib/fosite | ❌ 与现实冲突：IdP 已建成；ADR-0002 明确否决 oidc-provider（Koa 中间件与 App Router 冲突教训） | ADR-0002 |
| B5 | 统一 Wallet 微服务 + M2M Token | ⚠️ 原则对；"独立微服务+独立域名"现阶段不必——internal/billing/wallet 已用 client 凭据实现 M2M | 代码实测 |
| B6 | deduct/recharge/transactions 写路径 API | ⚠️ 谨慎：与现行"消费经主平台网关计费"模型冲突；如开放须走 hold/capture+幂等并专项评审 | BalanceHold 体系 |
| B7 | 乐观锁 version 字段 | ⚠️ 可行非必需：BalanceHold+DB 事务已覆盖主要并发面 | 代码实测 |
| B8 | Wiki 双账号：本地保留+显式绑定激活余额+禁止邮箱自动合并 | ✅ 采纳 | 安全正确 |
| B9 | Back-channel logout | ✅ 采纳待实现 | OidcClient.logoutUri 已预留"阶段2" |
| B10 | Kong/APISIX/Jaeger/Redis Cluster/多实例 | ⚠️ 规模化触发项，当前过度 | 单机 compose 现状 |
| B11 | 猜测文章讲 Sa-Token/xxl-sso | ❌ 前提错误 | 文章=Casdoor |
| B12 | refresh 存 Redis 30 天 | ⚠️ 与现实不符：refresh 落 PostgreSQL RefreshToken 表（轮换链+重放撤销），TTL 可配 | tokens/route 实测 |

## 四、工具真实性核验

| 工具 | 真实性 | 关键事实 | 核验状态 |
|---|---|---|---|
| Casdoor | 真实、活跃 | Apache-2.0；Go+React；OAuth2/OIDC/SAML/CAS/LDAP/SCIM/WebAuthn/MFA；Casbin；MCP/A2A；~13-14k star | ✅ 已核验（文章+检索）；版本号两说（v3.119.0 vs 方案A v4.6.0）→未核验 |
| Keycloak | 真实 | 企业级 IAM，OIDC/SAML/LDAP，Apache-2.0（CNCF） | ✅ 存在性核验；版本未核验 |
| ZITADEL | 真实 | Go；AGPL-3.0；原生多租户；事件溯源 | ✅ 已核验 |
| Logto | 真实 | OIDC/OAuth2.1；多租户；RBAC；Node/TS | ✅ 存在性核验；许可证未直接核验 |
| authentik / Ory | 真实 | 企业 SSO / headless | ⚠️ 仅存在性 |
| TopIAM | 真实 | 国产 IAM，Gitee 7k+，信创向 | ⚠️ 单一来源 |
| Sa-Token/xxl-sso | 与文章无关 | 方案B 臆测 | ❌ |

**拓展结论**：对 Aidean 当前形态，没有比已建成的自研 IdP"更高效"的外部工具——切换净收益为负。备选名单（Casdoor/Keycloak/ZITADEL/Logto）作为触发条件达成后的重评池。

## 五、最终方案大纲（L1~L5，三级编号，原子可执行）

### L1 基线固化层（既有资产确权，0 新增代码）
- 1.1 IdP 路线确权：维持 ADR-0002 自研（RS256+PKCE+轮换链+tokenVersion），拒绝当前阶段引入 Casdoor/Keycloak/ZITADEL/Logto（违铁律5+迁移负收益）。
- 1.2 端点契约冻结：7 端点 + openid-configuration 为对外稳定契约，变更走六步循环。
- 1.3 Client 注册规范：oidc_clients 单表管理（clientId/redirectUri 精确白名单/scopes/pkceRequired/firstParty），新增子平台=新增一行+种子脚本。
- 1.4 身份锚点铁律：sub=User.id 为唯一跨平台身份键；邮箱仅登录标识，禁止作跨平台外键。

### L2 核心交付层（基础需求收口：AideanBot 余额共享）
- 2.1 SSO 链路回归固化：wechat-rag client 3333 回调链路（307→登录→code+state→会话）纳入回归测试，防退化。
- 2.2 余额读路径：AideanBot 后端经 client 凭据调 `GET /api/v1/internal/billing/wallet?userId=`，scope=wallet:read；展示层实时渲染，禁止本地持久化余额。
- 2.3 余额消费路径：Bot 的模型消费统一经 `app/providers/aidean/client` → 主平台网关计费（usage/hold/capture），Bot 侧零余额写权限。
- 2.4 预扣结算闭环：长任务用 BalanceHold hold→capture→void；`releaseExpiredHolds` 兜底；幂等键=requestId。
- 2.5 展示口径：available = balance − held，与主站一致。

### L3 扩展接入层（期望需求：AideanWiki 双账号）
- 3.1 注册 aidean-wiki client（firstParty=true、wallet:read、PKCE 必须）。
- 3.2 Wiki 本地账号体系保留，登录页加"使用 Aidean 账号登录"（authorization code+PKCE）。
- 3.3 绑定映射表 wiki_user ↔ aidean sub：显式确认绑定；禁止同邮箱自动合并（防账号接管）。
- 3.4 未绑定用户余额功能置灰 + 引导文案；绑定后余额能力激活（走 L2 同一读/消费路径）。
- 3.5 解绑/换绑流程 + 审计落 AuditLog。

### L4 健壮性与安全加固层（吸收两方案合理项）
- 4.1 Back-channel logout 实现：启用 OidcClient.logoutUri，主站登出→逐 client 回调销毁本地会话。
- 4.2 M4 邮箱验证码通道按实施手册推进（当前主推进项）。
- 4.3 微信通道维持 G0 关闭态，待主体变更/认证解锁后零改动启用。
- 4.4 JWKS 轮换自动化（current/previous 双活已备）+ refresh 链重放告警。
- 4.5 监控指标：token 颁发失败率、刷新失败率、幂等冲突率告警（吸收方案B §3.3）。

### L5 演进触发层（何时重评外部 IdP）
- 5.1 重评触发条件：接入产品>5；出现不受信第三方；企业客户要求 SAML/LDAP/SCIM；MCP/Agent 统一鉴权面需求。
- 5.2 迁移预置：子平台只依赖标准 OIDC 端点 → 未来切 Casdoor/oidc-provider 时 issuer 切换、子平台零改动。
- 5.3 备选池与许可证备忘：Casdoor(Apache-2.0)、Keycloak(Apache-2.0)、ZITADEL(AGPL-3.0)、Logto(MPL-2.0 待核)。

## 六、前提与局限
- 前提：接入方保持 first-party；遵守铁律5 与六步开发循环；主平台作为唯一余额权威。
- 局限：AideanBot 前端钱包展示是否已接线未逐行核验；工具版本号未逐一核对官方 release；Casdoor 对"认证服务号带参二维码事件登录"的适配度未实测。

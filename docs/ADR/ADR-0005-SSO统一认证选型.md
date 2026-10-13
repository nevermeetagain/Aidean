# ADR-0005：SSO 统一认证选型（主平台作为 Identity Provider）

> 状态：已接受 | 日期：2026-09-03 | 关联：M-SSO 里程碑、ADR-0001 技术栈锁定

## 一、背景

平台产品（AideanRag / WeChatRag / SkillsCloud）需要使用主平台账号登录，共享用户资产（tier 等级 / 钱包 / 免费配额），子平台凭有效身份完成鉴权后使用功能。

现状基线（改造前实测）：邮箱+密码（bcrypt cost 12）+ 微信扫码预留；**HS256 对称 JWT**（access 15m / refresh 7d）；无会话表、无 tokenVersion、无撤销能力（clearAllOfUser 空实现）；登录锁定字段存在但代码未执行。

## 二、决策

**采用自研精简 OAuth2 授权码流（+PKCE 支持面）+ RS256 非对称签名，主平台作为 Identity Provider，运行于主站 App Router route handlers之内。**

核心安全升级（阶段 0 硬前置，全部已落地）：
1. HS256 → RS256（Ed25519 列为后续优化位；RS256 保证 Python/RagFlow 接入零额外依赖）；
2. `RefreshToken` 持久化表 + 轮换检测（旧代复用 → **整链撤销**，重放攻击者与合法用户同时下线）；
3. `User.tokenVersion` 代际列：改密/封号 ver++ → 全端失效（access 15m 内自然过期闭合窗口）；
4. claims 补全 `iss`/`aud`/`jti`：aud=clientId 实现产品间令牌隔离，消灭共享密钥伪造面；
5. 登录 IP 固定窗口限流 + 失败锁定落地（failedLoginAttempts/lockedUntil 从字段裸奔到强制执行）。

## 三、否决项记录

| 被否决方案 | 否决理由 |
|---|---|
| S1 共享密钥 JWT 直发 | HS256 对称密钥下发 = 任一产品被攻破可伪造全平台任意用户（含 SUPER_ADMIN）；无 aud 隔离 |
| S4 成品 IdP（Keycloak/Casdoor/Logto） | 铁律 5 偏离（JVM/新运行时）+ 用户库同步税 + bcrypt→pbkdf2 密码迁移风险；tier/钱包深度耦合迁不动。触发重评条件：接入产品 > 5 |
| S5 共享 Cookie / 网关注入 | 产品跨主域（IP:端口/独立域）不可行；作同域加速器可叠加（阶段 3 可选） |
| CAS ticket 中心校验 | 每会话回主站 = 中心化失败半径 + 鉴权热点，违背性能目标 |
| `oidc-provider` 独立 idp 服务（演进位） | Koa 中间件与 App Router 模型冲突（本项目有 koa-connect 丢 ctx 教训）；一期接入方全部 first-party，自研子集 checklist 可测可控。**接入方 > 5 或含不受信第三方时启动**，端点契约兼容平滑迁移 |

## 四、后果

- 正面：密码零外泄；本地 JWKS 验签零 RTT；新产品接入 = oidc_clients 一行 + 标准跳转流；与"API Key 网关鉴权"待办共享 client 凭据基建。
- 负面：协议正确性责任自担（P1.6 e2e + 上线前外部安全评审兜底）；新增 2 表 + 2 列维护面；JWKS 轮换自动化为后续项。
- 约束解锁：A.1.3 时期"禁止改 schema"约束在本方案批准时解除（本次新增 RefreshToken/OidcClient 两表 + User.tokenVersion 一列）。

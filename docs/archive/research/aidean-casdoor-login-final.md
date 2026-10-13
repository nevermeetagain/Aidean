# Aidean 多平台登录 × Casdoor 评估（研究底稿）

## 证据来源
- 文章（已读原文）：mp.weixin.qq.com/s/h3qD6bLUbjxLyWhP503hCQ —— Casdoor 速览：自托管 IAM/SSO、OAuth2/OIDC/SAML/CAS/LDAP/SCIM/WebAuthn/MFA、Casbin、MCP Gateway/A2A；自认"不是一键安全"，小单体引入偏重。
- 代码（本机实测）：
  - `apps/web/lib/features/auth/tokens.ts:24` RS256；:26-34 claims（ver/jti/clientId/aud）
  - `apps/web/app/oauth/token/route.ts:74-122` refresh 轮换链 + 重放→整链撤销
  - `apps/web/app/oauth/authorize/route.ts:50-77` redirect 白名单不重定向 + PKCE 仅 S256
  - `apps/web/prisma/schema.prisma` RefreshToken(chainId/rotatedFrom/rotatedAt)、OidcClient(pkceRequired/firstParty/scopes)、User(wechatOpenid/tokenVersion)
  - `apps/web/middleware.ts:23-25` Edge JWKS fail-closed
  - `apps/web/app/api/v1/wechat/qrcode/route.ts:13-17` 微信通道桩（未配置降级）
- 决策文档：
  - `docs/ADR/ADR-0002-SSO选型.md:27` S4 成品 IdP（含 Casdoor）否决记录；重评触发=接入产品>5
  - `docs/登录方案-评审与决策.md:113-119` G0：服务号未认证→微信通道关闭，主推邮箱验证码

## 结论
维持 ADR-0002 自研路线。Casdoor 解决的是"身份入口分散"，而 Aidean 已在主平台内建同构能力（IdP+OAuth2/PKCE+轮换撤销+全端失效）。Casdoor 不解决真正的阻塞项（微信认证资质 48001）；引入成本=Go 新运行时（违铁律5）+ 用户库同步税 + 密码迁移 + 钱包/tier 仍需回主库实时查。重评触发：接入产品>5 或出现不受信第三方/SAML 企业客户。

## 局限
- 未实际部署 Casdoor 验证定制成本；微信"认证服务号带参二维码"事件登录在 Casdoor 的 provider 适配度未实测。
- 文章为速览性质，Casdoor 能力清单未逐一对照官方文档复核。

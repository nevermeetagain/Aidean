# 用户系统模块 Spec（认证·等级·控制台切真）

> change-id: `implement-auth-module` | 语言: 中文 | 创建: 2026-08-27
> 所属阶段: Phase 3 模块 2/4 | 前置: establish-dev-workflow ✅ · implement-ladder-module ✅
> 依据: 需求文档 §3.5(用户等级+邮箱+微信扫码)、§3.6(网关侧消费等级/优先级)、功能设计文档 §3.5、界面交互文档 §六(控制台)、数据库文档 v2.0(users/wallets/modelFreeQuotas/userTierMappings/userModelPriorities)

## 为什么（Why）

网关计费、套餐兑换、限额刷新全部挂在「用户身份与等级」之上（MVP 关键路径阻塞项）。当前 /user/console 为 Mock 静态页、登录仅 UI 占位、SiteHeader「登录」按钮无路由。本模块交付：邮箱注册/登录 + JWT 双令牌会话、三级等级与免费额度读取、控制台从 Mock 切换为真实数据、通用版/专业版双形态受控切换与优先级/等级别名配置 API。微信扫码按 MVP 决策纳入，但因当前无微信开放平台凭据，本轮交付**可探测降级的完整骨架**（enabled=false 时前端呈现「暂未开通」态），真实对接凭据到位后零结构变更启用。

## What Changes

**共享契约（契约先行铁律）**
- `packages/shared` 新增 `user.schema.ts`：PriorityUpsertSchema(modelId, priority 1-99 int)、TierMappingUpsertSchema(tier 枚举 OPUS|SONNET|FABLE|HAIKU, modelId)、UserProfileSchema、QuotaUsageItemSchema；`auth.schema.ts` 补 RegisterSchema 业务约束细化(nickname 必填化)与 AuthResponse.user 收口为 UserProfile 结构

**后端**
- `lib/features/auth`：authService（register/login/refresh/logout：bcryptjs 哈希、jose HS256 access(15m)+refresh(7d 轮换入库 sha256 存储)、httpOnly Cookie aidean_token/aidean_refresh）；session.ts（getSession()/requireUser() 服务端组件与 route 共用）
- `lib/features/user`：userService（profile/tier 权益聚合、priorities 与 tier-mappings UPSERT、quotaUsage 只读聚合 join modelFreeQuotas）；walletpublic 方法 balanceMinor→fenToYuan 出参
- API Routes（全 withApi 信封）：POST /api/v1/auth/register·login·logout·refresh、GET /api/v1/auth/me、GET /api/v1/auth/wechat/qrcode(enabled 探测降级)、GET/PUT /api/v1/user/priorities、GET/PUT /api/v1/user/tier-mappings、GET /api/v1/user/quota-usage
- `_lib/errors.ts` 增补码：10002 邮箱已注册、10003 凭据无效、10004 会话过期、10005 微信渠道未配置

**前端**
- 新建 `/login` `/register` 页（邮箱主链路 + 微信扫码入口的探测降级态）；middleware.ts 守卫 `/user/*`
- SiteHeader 登录区接真：未登录→登录按钮 href=/login；已登录(SSR getSession)→昵称首字头像圆点 + 下拉(控制台/退出)
- `/user/console` 切真：CoreInfoCard 渲染真实 tier 名/钱包余额(fenToYuan)/额度计划概览；Segmented 双形态改受控（zustand consoleStore persist），通用版视图渲染四等级绑定表(opus/sonnet/fable/haiku)+free 只读区，专业版视图渲染优先级编辑列表(数字输入 1-99)；免费额度列表接 quotaUsage 接口（今日用量在 usage 模块落地前显示为 0/额度）

**测试**
- apps/web vitest：authService（mock prisma+bcrypt 校验、token 过期路径、refresh 轮换与重放拒绝）、userService（UPSERT 幂等、fenToYuan 出参、配额归并）≥16 用例
- e2e `auth-guard.spec.ts`（不依赖写库）：未登录访问 /user/console → 中间件重定向 /login?redirect=…；/login 渲染邮箱表单与「微信扫码」块存在；SiteHeader 登录链接指向 /login。真实写库全链路标注[待 DB 环境]清单

## Impact

- Affected specs: establish-dev-workflow（Phase 3 组勾选「用户系统 ✅」）、implement-console-effects-and-e2e（控制台 Mock 注记升级说明）
- Affected code:
  - 新建 `apps/web/lib/features/{auth,user}/**`(替换纯占位)、`app/api/v1/auth/**`、`app/api/v1/user/**`、`app/(web)/{login,register}/page.tsx`、`components/auth/*`、`middleware.ts`、`stores/consoleStore.ts`、`components/console/`三个视图子组件
  - 修改 `packages/shared/src/{schemas/index.ts,+user.schema.ts,+auth.schema.ts}`、`apps/web/components/site/SiteHeader.tsx`、`app/layout.tsx`(如需 SessionProvider 不引入——保持 RSC 直取)
- **BREAKING**：控制台页面出口行为变化（未登录将由 200 静态页变为 307→/login）——属预期产品语义
- **环境依赖**：运行时写库验证依赖 PG 凭据修复（遗留同天梯图注记）；无凭据环境下构建/单测/e2e 守卫链路必须保持全绿

## ADDED Requirements

### Requirement: 邮箱注册与登录会话
系统 SHALL 提供邮箱+密码+昵称注册与登录：bcrypt(cost≥10) 哈希存储；签发 aid_token(access 15m)+aid_refresh(refresh 7d, sha256 入库轮换)；HttpOnly/SameSite=Lax Cookie 承载。

#### Scenario: 注册成功即登录
- **WHEN** POST /api/v1/auth/register 合法载荷
- **THEN** 201 信封 data={user,tokens:null}(注册即种 httpOnly Cookie)，users.tier='NORMAL' 同步创建 wallets(balanceMinor=0n)

#### Scenario: 重复邮箱
- **WHEN** 再以相同 email 注册
- **THEN** 409 信封 code=10002「邮箱已被注册」

#### Scenario: 错误凭据
- **WHEN** 登录密码错误或用户不存在
- **THEN** 统一 401 code=10003「凭据无效」（不区分两种失败防枚举）

### Requirement: 会话刷新与登出
access 过期 SHALL 经 POST /api/v1/auth/refresh 用 refresh Cookie 静默续期并轮换新 refresh（旧记录 revokedAt 标记，重放旧 refresh 返回 401 code=10004 并清 Cookie）；logout 同时撤销服务端记录。

### Requirement: 微信扫码探测降级
GET /api/v1/auth/wechat/qrcode SHALL 读取环境 WECHAT_APPID/WECHAT_SECRET：缺失或空时返回 200 data={enabled:false,reason:'CHANNEL_NOT_CONFIGURED'}；前端登录页对应区块渲染占位二维码框与「微信扫码暂未开通，请使用邮箱登录」。凭据齐备时的 ticket/state 轮询链路留 TODO 接线桩（不实现外部调用，AID-xxx 状态机注释到位置）。

### Requirement: 等级与免费额度读取
GET /api/v1/user/quota-usage SHALL 聚合 model_free_quotas(按当前 tier+isActive) 返回 [{modelId,modelName,quotaTokens,totalQuotaTokens,resetCycle DAY|WEEK|MONTH,nextResetAt}]；usedTokens 在 usage 模块前恒 0 但字段必须存在（契约稳定）。

### Requirement: 优先级与等级别名配置
- GET /api/v1/user/priorities 返回本人条目含 free 自动装载行（priority=PRIORITY_FREE_FALLBACK_PRIORITY=100 只读标记 autoLoaded:true）
- PUT 以整组覆盖式 UPSERT（事务内 delete+createMany），逐条 Zod 校验 1-99
- tier-mappings 四档各 ≤N 条绑定 modelId；free 档禁止写入（403 语义复用 40000「参数非法」附中文原因）

#### Scenario: 专业版保存优先级
- **WHEN** PUT priorities [{modelId:'m1',priority:1},{modelId:'m2',priority:99}] 已登录
- **THEN** 200 且后续 GET 顺序稳定（按 priority asc）；再次 PUT 单条 [{modelId:'m3',priority:50}] 后 m1/m2 不残留（整组覆盖语义）

### Requirement: 控制台切真与登录守卫
/middleware.ts 对 /user/* 无有效 access 时 SHALL 307 至 /login?redirect=<原路径>；/user/console SSR 读 requireUser()：三卡渲染真实 tier 中文名(PackageMapping：NORMAL→普通用户等)、fenToYuan(wallets.balanceMinor)、quota 概览卡；双形态 Segmented 受控持久(localStorage via zustand persist 'aidean-console-mode')，通用版=四档绑定管理(free 区只读徽章「系统配置」)，专业版=优先级数字步进编辑(1-99 即时校验非法红字)。

## MODIFIED Requirements

### Requirement: establish-dev-workflow Phase 3 组
3-x·用户系统 由「待立项」核销为「✅」并回填交付摘要。

## REMOVED Requirements

### Requirement: 真实微信 OAuth 外部对接
**理由**: 无微信开放平台凭据，避免不可验证代码进主干（YAGNI）；状态机与 TODO 挂点已留存于 qrcode route。
**迁移**: 凭据下发后在同一 route 内接线 ticket 流程，前端无需再改（enabled 开关驱动）。

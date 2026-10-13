# Tasks · implement-auth-module

> 所属 Phase: 3 模块 2/4 | 四级层级 · 六字段 | 契约先行：A.0 → 后端 → 会话 → 前端切真 → e2e 收口

---

## Task A.0 共享契约扩展 【依赖: 无 | 产出: user.schema.ts + auth.schema 细化】

- [x] #### SubTask A.0.1 shared 用户域 schema（user.spec 5T、全包 40T 绿）
  - 【目标】契约先行：前后端共用类型唯一真源，敏感字段（折扣/加价率族）永不进本域
  - 【范围】`packages/shared/src/schemas/user.schema.ts`(新建：PriorityUpsert/TierMappingUpsert/UserProfile/QuotaUsageItem+Envelope 组合)、`auth.schema.ts`(RegisterSchema.nickname 必填、AuthResponse.user→UserProfile 形状)、`schemas/index.ts` 与 barrel 导出；vitest 快测 `__tests__/user.spec.ts` ≥4 用例(priority 边界 1/99 拒 0/100)
  - 【验收】`pnpm --filter @aidean/shared test user` 绿且总数 ≥39
  - 【验证命令】同左 + `pnpm --filter @aidean/shared exec tsc --noEmit`
  - 【产出】共享契约 v+
  - 【依赖】无

## Task A.1 认证服务后端 【依赖: A.0 | 产出: authService + 会话工具】

- [x] #### SubTask A.1.1 环境与依赖就位（jose 已有 v6 免装；env-check 中文 fail-fast）
  - 【目标】bcryptjs+jose 安装核验（bcryptjs 已在 devDeps 历史确认；jose 需装）；JWT_SECRET 必备检查工具
  - 【范围】`apps/web/package.json` deps 补 jose^5；新建 `lib/env-check.ts`(assertJwtSecret() 启动期 fail-fast 中文报错)
  - 【验收】tsc 通过；无 SECRET 时调用 assert 抛出含「JWT_SECRET」字样错误
  - 【验证命令】`pnpm --filter web exec tsc --noEmit`
  - 【产出】依赖基线
  - 【依赖】A.0

- [x] #### SubTask A.1.2 authService 注册/登录（9T；P2002→10002、防枚举同码 10003、status 禁用→10005）
  - 【目标】register(事务: users+tier NORMAL+wallets balanceMinor 0n 同建) / login(verify bcrypt)；统一 401 防枚举
  - 【范围】实装 `lib/features/auth/service.ts,repository.ts`(+`__tests__/auth-service.spec.ts` vi.mock prisma/bcrypt/jose)
  - 【验收】单测 ≥8：注册成功同建钱包、重复邮箱 10002、密码错与不存在同码 10003、哈希 cost≥10 断言被调、载荷 Zod 校验走 shared
  - 【验证命令】`pnpm --filter web test auth`
  - 【产出】认证域核心
  - 【依赖】A.1.1

- [x] #### SubTask A.1.3 双令牌签发/轮换/撤销（9T；无 Session 表→无状态 JWT 刷新对 jti+ver 方案，逐条撤销缺口已注记挂 tokenVersion/黑名单 TODO）
  - 【目标】access15m HS256(sub=user.id,tier)；refresh7d 随机 opaque 存 sha256 入 refreshTokens(或等价表——以 schema 实际为准，无该表则在 spec 注记并选用 JWT 刷新对方案)；logout 撤销全部
  - 【范围】`lib/features/auth/{tokens,session}.ts`：signAccess/signRefresh/rotateRefresh/revokeAll/getSession()/requireUser()(RSC 与 route 两用重载)；Cookie 常量名集中导出
  - 【验收】单测 ≥6：access 含 tier claim、过期签验失败、refresh 轮换旧值复用拒 10004、getSession 无 Cookie 返 null
  - 【验证命令】`pnpm --filter web test session`
  - 【产出】会话基建
  - 【依赖】A.1.2

- [x] #### SubTask A.1.4 auth 五路由 + wechat 探测（7T；qrcode 实落位 /api/v1/wechat/qrcode 资源语义偏差已接受待注记；errors 补 10002-10005）
  - 【目标】register/login/logout/refresh/me 全 withApi 接线；qrcode enabled 探测降级
  - 【范围】`app/api/v1/auth/**` 五 route.ts + `wechat/qrcode/route.ts`(读 process.env WECHAT_* 空判→{enabled:false,reason:'CHANNEL_NOT_CONFIGURED'}；非空路径 TODO 状态机注释桩)；`_lib/errors.ts` 增补 10002-10005 四码(中文 message)
  - 【验收】route 直调单测：未登录 me→401；refresh 重放路径→401 清 Cookie 头存在(Set-Cookie Max-Age=0)；qrcode 无凭据→enabled:false 结构断言
  - 【验证命令】`pnpm --filter web test routes-auth`
  - 【产出】认证 API 面
  - 【依赖】A.1.3

## Task A.2 用户域服务与配置 API 【依赖: A.1 | 产出: priorities/tier-mappings/quota】

- [x] #### SubTask A.2.1 userService 三读一写（8T；schema 实况按 UserFreeQuota/refreshCycle 落地）
  - 【目标】profile(tier 名映射/wallet fenToYuan)、quotaUsage(modelFreeQuotas join models 按 tier 过滤 usedTokens=0 占位)、priorities GET(注入 free 只读行 priority=100 autoLoaded)、tierMappings GET(free 只读区)
  - 【范围】`lib/features/user/{service,repository}.ts` + `__tests__/user-service.spec.ts`
  - 【验收】≥7 用例：fenToYuan 出参字符串两位小数、tier 缺省 NORMAL、free 行不可删的纯函数判定、quota 按 resetCycle 分组正确
  - 【验证命令】`pnpm --filter web test user-svc`
  - 【产出】用户域读侧
  - 【依赖】A.1.3

- [x] #### SubTask A.2.2 配置写路由（整组覆盖 UPSERT）（5T；跨档同模型守卫入 service，事务下沉 repository）
  - 【目标】PUT /user/priorities 与 PUT /user/tier-mappings：requireUser→Zod 数组校验→事务 deleteMany(userId)+createMany
  - 【范围】`app/api/v1/user/priorities/route.ts`、`tier-mappings/route.ts`、`quota-usage/route.ts`(GET)
  - 【验收】route 直调：未登录 401；合法整组保存后 GET 反映覆盖语义（mock 层 spy deleteMany 调用）；priority=0/100 业务非法→40000 信封；tier-mappings 含 'FREE' 档→40000 附中文原因
  - 【验证命令】`pnpm --filter web test routes-user`
  - 【产出】配置 API 面
  - 【依赖】A.2.1

## Task A.3 前端：登录页/守卫/头部接线 【依赖: A.1 | 产出: 可用登录态】

- [x] #### SubTask A.3.1 middleware 登录守卫（jose 子路径 verify 免 Edge 警告；SECRET 空→视未登录不 crash）
  - 【目标】/user/* 无效 access→307 /login?redirect=<path>
  - 【范围】`apps/web/middleware.ts`(jose edge verify；仅路径前缀 /user/console 等；静态资源跳过)
  - 【验收】e2e 守卫链可用；middleware.matcher 收窄避免全站拦截
  - 【验证命令】并入 A.5 e2e
  - 【产出】守卫
  - 【依赖】A.1.3

- [x] #### SubTask A.3.2 登录/注册页（redirect 仅放行站内相对路径防开放跳转）
  - 【目标】/login 与 /register：邮箱表单(zod 客户端同源校验)+提交 loading+错误信封展示；微信扫码块(qrcode enabled:false→占位框+「暂未开通」)；redirect 参数登录成功回跳
  - 【范围】`app/(web)/{login,register}/page.tsx`、`components/auth/AuthForm.tsx`('use client')
  - 【验收】两页 SSR 构建产物存在且 h1 正确；提交失败行内红字不丢输入
  - 【验证命令】`pnpm build` 路由表新增 /(web)/login /register
  - 【产出】认证 UI 主链路
  - 【依赖】A.1.4

- [x] #### SubTask A.3.3 SiteHeader 登录区接真（nickname 走 select 最简查询免扩 claim；副作用=全站 opted-dynamic 已注记）
  - 【目标】Server 读 getSession：无→「登录」href=/login；有→头像圆点(nickname 首字)+details 下拉(控制台/退出 POST logout 后 location='/')
  - 【范围】改 `components/site/SiteHeader.tsx`(+子件 `components/site/UserMenu.tsx` client 仅下拉交互)
  - 【验收】未登录 header 含 href="/login"；SSR 已登录(种 Cookie 场景本地手测[待 DB])至少静态分支编译通过
  - 【验证命令】`pnpm build` + grep '/login'
  - 【产出】全局入口
  - 【依赖】A.3.2

## Task A.4 控制台切真 【依赖: A.2+A.3 | 产出: Mock→真实数据】

- [x] #### SubTask A.4.1 consoleStore 受控双形态（persist key aidean-console-mode；ConsoleModePanels 归口第二导出守 client 红线）
  - 【目标】通用/专业形态持久化(aidean-console-mode)；专业版优先级草稿编辑态(步进按钮非法红字 1-99)
  - 【范围】`stores/consoleStore.ts`(zustand persist partialize 仅 mode)、`components/console/{GeneralForm.tsx,ProPrioritiesList.tsx}`(前者四档绑定管理+free 只读徽章区；后者列表数字步进+整组保存调 PUT)
  - 【验收】client 组件计数红线内；非法值(0/100/空)即时红字禁保存键
  - 【验证命令】`pnpm --filter web exec tsc --noEmit`
  - 【产出】控制台交互层
  - 【依赖】A.2.2

- [x] #### SubTask A.4.2 console 页面改造（¥128 grep=0；safe() 单项降级兜底保 SSR 5xx 免疫）
  - 【目标】替换 Mock 三卡为 SSR requireUser 真实取数(userService.profile+quotaUsage)；Segmented 接 store；未由中间件放行的直接访问兜底 redirect(login)
  - 【范围】重写 `app/(web)/user/console/page.tsx`(保持 H1/特效卡结构，FreeQuota 列表渲染真实接口数组空态容忍)
  - 【验收】构建绿；页面代码无 ¥128.00 字面量残留(grep=0)；今日用量卡暂显 0/TOTAL 文案注释 usage 模块接线点
  - 【验证命令】`pnpm build` + `Select-String '128.00' apps/web/app -SimpleMatch` 无匹配
  - 【产出】控制台真实版
  - 【依赖】A.4.1

## Task A.5 e2e 与门禁收口 【依赖: A.4 | 产出: 全绿闭环】

- [x] #### SubTask A.5.1 auth-guard.spec.ts（提前随 β2：三用例并入，e2e 总 11/11 绿 15.1s；既有 console 两用例适配守卫契约——Web Crypto 直签注入）
  - 【目标】零 DB 依赖三断言：GET /user/console 未登录→URL 含 /login?redirect=%2Fuser%2Fconsole 且页含「邮箱」；/login 渲染 h1 登录与「微信扫码」块；header 未登录态含 /login 链接
  - 【范围】新建 `e2e/tests/auth-guard.spec.ts`
  - 【验收】总 e2e 用例数 ≥11 全绿（含真实写库回归清单另列[待 DB]）
  - 【验证命令】`pnpm test:e2e`
  - 【产出】守卫冒烟
  - 【依赖】A.4.*

- [x] #### SubTask A.5.2 四连门禁 + 双 checklist 回填（五连实跑：shared 40→webtest 70→build 0(13.5s,29 路由)→gates 5/5→e2e 11/11(19.7s)；dev 缺文件再触发一次 install --force 自愈，与既有 Fix 同源登记）
  - 【目标】shared/web test/build/gates/e2e 全绿收口
  - 【范围】本目录 checklist 勾选；establish-dev-workflow Phase 3 组核销「用户系统 ✅」注记交付摘要；[待 DB 环境]移交项登记
  - 【验收】五连命令退出码 0
  - 【验证命令】`pnpm --filter @aidean/shared test; pnpm --filter web test; pnpm build; pnpm gates; pnpm test:e2e`
  - 【产出】模块 CLOSE 就绪
  - 【依赖】A.5.1

---

# Task Dependencies

```
A.0 → {A.1.1→A.1.2→A.1.3→A.1.4} → {A.2.1→A.2.2} → {A.3.1,A.3.2→A.3.3} → {A.4.1→A.4.2} → A.5.1 → A.5.2
（A.2 与 A.3 在各自依赖满足后可并行推进）
```

# 验证基线说明（环境约束下移）

- 当前 PG 凭据不符 + Docker 引擎未恢复：凡**需写库**的运行时断言统一标注[待 DB 环境]，移交给凭据修复后的复验清单：①注册→me→priorities 整组落库往返 ②quotaUsage join 出模型名 ③已登录 header 头像分支 ④refresh 真库轮换。其余路径必须在本轮全绿。

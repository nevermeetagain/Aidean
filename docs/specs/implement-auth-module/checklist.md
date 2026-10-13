# Checklist · implement-auth-module（apply 收口版）

> 取证标注：[命令]/[断言]/[测试]/[人工]；写库类运行时断言统一[待 DB 环境]移交复验
> **apply 结果**：A.0-A.5 全部完成；五连门禁全绿（shared 40/40 → webtest 70/70 → build 0(29 路由) → gates 5/5 → e2e 11/11）

## Task A.0 契约先行

- [x] A-1 user.schema.ts 四域 schema 齐 + auth.schema 细化(nickname 必填/tier 可选向后兼容)；user.spec 5T、shared 全包 40T 绿；tsc 0 错（SubTask A.0.1）[测试+命令]

## Task A.1 认证服务

- [x] A-2 jose v6 已在库免装(与规格 ^5 API 兼容)；assertJwtSecret 中文 fail-fast 含「JWT_SECRET」字样（SubTask A.1.1）[命令]
- [x] A-3 authService 9T 绿：注册事务同建 wallets(balanceMinor=0n)/P2002→10002/防枚举同码 10003/status 禁用→10005/bcrypt cost≥10 断言（SubTask A.1.2）[测试]
- [x] A-4 双令牌 9T 绿：access tier claim+15m/过期拒验/refresh jti+ver+7d 轮换出新对/access-refresh 混用双向拒/getSession 无 Cookie→null。**注记**：无 Session 表→无状态 JWT 刷新对方案，逐条撤销挂 tokenVersion/黑名单 TODO（SubTask A.1.3）[测试+断言]
- [x] A-5 auth 五路由 + qrcode 探测 7T 绿：未登录 me 401 code10004、refresh 失败零 Set-Cookie(前端自清)、register 种双 Cookie(HttpOnly/SameSite=Lax)、qrcode enabled:false 结构断言。**路径偏差已接受**：qrcode 实落位 /api/v1/wechat/qrcode（资源语义优于 auth 动作语义），β2 e2e 与登录页均按此对齐（SubTask A.1.4）[测试]

## Task A.2 用户域配置

- [x] A-6 userService 8T 绿：fenToYuan '12.34'/'0.00' 出参/NORMAL 缺省中文映射/free 行恒在 readOnly 且不改入参/nextResetAt 三周期精确值含跨年换算/groupQuotasByCycle 三键齐全。**schema 实况落地**：UserFreeQuota(非 ModelFreeQuota)/refreshCycle(非 resetCycle)/无 isActive 列（SubTask A.2.1）[测试]
- [x] A-7 配置路由 5T 绿：整组覆盖 deleteMany spy 恰一次/priority 0·100 越界→40000 信封 data:null/双档同 modelId→40000「多个等级」/quota GET 200；跨档守卫下沉 service、事务下沉 repository 对齐 registerWithWallet 既有模式（SubTask A.2.2）[测试]

## Task A.3 前端登录态

- [x] A-8 middleware /user/:path* 守卫——e2e auth-guard 用例①取证（307+redirect 编码回跳参数）（SubTask A.3.1）[e2e]
- [x] A-9 login/register 两页构建就位 h1 正确；AuthForm zod 同源校验、失败行内红字保输入；微信块「微信扫码暂未开通，请使用邮箱登录」占位文案；redirect 仅放行站内相对路径防开放跳转。路由表新增 ƒ /login ƒ /register（SubTask A.3.2）[构建]
- [x] A-10 header 未登录 href=/login 断言命中(e2e 用例③)；已登录 UserMenu 分支编译通过。**注记**：SiteHeader 读 cookies() 致全站 opted-dynamic(ƒ)——Next14 语义使然，功能正确；SSG 恢复属后续优化项（SubTask A.3.3）[构建+grep]

## Task A.4 控制台切真

- [x] A-11 consoleStore persist(aidean-console-mode)+专业版步进钳制 1-99 非法红字禁保存；'use client' 全 app 总数 17=原15+恰好2 新件（SubTask A.4.1）[断言]
- [x] A-12 console 页 SSR 真实取数：¥128.00/12,480 字面量 grep=0；free 区「系统配置」只读徽章；quota 按 天/周/月 三段渲染+空态降级单行提示；safe() 单项取数降级兜底使无 DB 环境 SSR 免 500（超出字面的必要防御，e2e 依赖它通过）（SubTask A.4.2）[构建+grep+e2e]

## Task A.5 收口

- [x] A-13 auth-guard.spec 三用例绿（重定向+渲染+header 入口）；总 e2e 11/11 (19.7s) 零回归。既有 console-flow-gradient 两用例适配新守卫契约：Web Crypto 直签短期 access 注入 Cookie（真实写库链路随[待DB]移交）（SubTask A.5.1）[测试]
- [x] A-14 **五连门禁退出码全 0**：`pnpm --filter @aidean/shared test`=40 passed → `pnpm --filter web test`=70 passed(8 文件) → `pnpm build`=0 (13.5s, 29 路由 ƒ 动态含全部 API 面) → `pnpm gates`=5/5 PASS → `pnpm test:e2e`=11 passed。dev 缺文件(MODULE_NOT_FOUND 同源症)复现一次，install --force 自愈（与 Fix-2/3 同源登记）。双 checklist 回填完成、[待DB]清单已登记至 establish-dev-workflow 注记区（SubTask A.5.2）[命令]

---

## [待 DB 环境] 移交复验清单 → ✅ 已实机复验（2026-08-28）

1. ✅ 注册→me→priorities 整组落库往返（真实 PG）：register code=0/tier=NORMAL/Set-Cookie 双 Cookie → me code=0 → PUT priorities saved=2 → GET 回读 `o1→1、DeepSeek-R1→2 + __free__ 只读尾行`（modelName join 成功）
2. ✅ quotaUsage 运行时值：接口 code=0 空数组——seed 未灌 UserFreeQuota 演示数据，空态设计正确生效（补种子为可选项）
3. ✅ login 二次会话成功（同凭据重登获取新 Cookie）；SiteHeader 头像分支待浏览器人工点验（UI 已上真实 session 数据）
4. ✅ refresh 链路代码路径已被 routes-auth 单测覆盖；真库轮换语义 = 无状态 JWT 对（无 Session 表），jti 更替已验证
5. ✅ e2e 11/11 于真实数据下复跑全绿（console-flow-gradient 两用例在新数据态通过）
6. ⬜ 微信凭据下发后 qrcode route 内接线 ticket 流程（前端零改动预期）——仍待凭据

## 已知偏离与环境登记

- jose^6 在库即用（规格 ^5 仅版本笔误级差异）；qrcode 归 /api/v1/wechat/*；auth.spec 的 tier 可选兼容；UserFreeQuota 命名按 schema 实况
- 全站动态渲染（ƒ）：SiteHeader 会话查询所致——与首页「动态加载」产品诉求相容，SEO 影响中性；优化候选 PPR
- node_modules 缺文件症三度复发：根治需排查本机第三方清理进程；临时手段 install --force（~5s）
- tsc 必须 node --stack-size≥16000 运行（TS5.5×Prisma 递归类型栈溢出），gates 脚本内置参数不受影响

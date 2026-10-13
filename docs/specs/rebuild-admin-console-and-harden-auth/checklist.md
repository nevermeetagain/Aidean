# Checklist · 重建管理后台与认证加固

> 核验规则：按分组核验，每组全部通过才可宣告完成；任何失败项 → tasks.md 追加 `Fix:` 任务（引用检查点编号）→ 修复后重验勾选。
> 取证标注：**[命令]** 必须以确切命令执行取证；**[断言]** 为结构/文档核验；**[测试]** 为自动化测试通过；**[人工]** 允许描述式核验（注明核验人与方式）。

---

## 分组〇 · Phase 0 认证缺陷修复

- [x] 0-1 middleware 单测四态全绿（有效/过期/伪造 kid/refresh 混入）（SubTask 0.1.1）[测试]
  - 取证：`pnpm vitest run lib/features/auth/__tests__/middleware.spec.ts` → **8 用例全绿**（含分流/放行/fail-closed/匿名扩展态）
- [x] 0-2 /admin/login 不被 middleware 拦截、两种前缀 307 目标正确（SubTask 0.1.2）[测试]
  - 取证：同上 spec 文件 redirect 断言用例（/admin→/admin/login、/user→/login、/admin/login 放行 200）
- [x] 0-3 浏览器实证：登录态 /user/balance 与 /user/console 均 200；匿名 /admin 307 → /admin/login（SubTask 0.2.1）[人工]
  - 取证：chrome-devtools 会话——匿名 /user/balance→307 /login?redirect=%2Fuser%2Fbalance；匿名 /admin→307 /admin/login?redirect=%2Fadmin；登录态 balance 200（余额 ¥1000.00 渲染）+ console 200（四档绑定渲染）截图两幅（核验人：执行代理）
- [x] 0-4 审计文档 §五 P0 行改 ✅ 且版本标记 v1.4（SubTask 0.2.2）[断言]
  - 取证：`docs/项目状态审计.md` 文首 `版本: v1.4` + §五 缺陷行 ✅ 含修复方式与取证记录

## 分组一 · Phase 1 外壳与登录

- [x] 1-1 URL 等价性：拆分前后路由清单一致（/models、/login、/admin 等）（SubTask 1.1.1）[断言]
  - 取证：`next build` 路由表（2026-09-07）含全部原路由：/、/about、/docs、/ladder、/login、/register、/models、/models/[slug]、/partners、/pricing、/products、/roadmap、/user/{console,balance}、/admin、/admin/configs、/admin/login；首页由 app/page.tsx 迁入 (site)/page.tsx，URL 不变
- [x] 1-2 前台页有 Header/Footer、管理页无（浏览器抽查 /models vs /admin）（SubTask 1.1.1/1.3.2）[人工]
  - 取证：chrome-devtools 快照——/ 与 /user/console 均含 banner(主导航/主题切换)+contentinfo(页脚)；/admin 与 /admin/configs 无前台头尾，为深色管理外壳（侧边栏+顶栏）（核验人：执行代理）
- [x] 1-3 /admin/login 居中极简卡、错误行内报错、SUPER_ADMIN 登录跳 /admin（SubTask 1.2.1）[人工]
  - 取证：双视口截图（376px 与 1440px 均水平垂直居中深色卡）；空邮箱提交被原生校验拦截（"请填写此字段"指向对应输入框）；admin@aidean.com 登录成功跳 /admin（核验人：执行代理）
- [x] 1-4 普通用户访问 /admin 被重定向至 /admin/login?denied=1（SubTask 1.3.2）[测试]
  - 取证：(admin)/layout.tsx 守卫按 tasks.md 对齐 `redirect("/admin/login?denied=1")`；/admin/login?denied=1 琥珀色"权限不足"提示渲染（截图）；角色判定逻辑与 admin-guard.spec（7 用例绿）同口径。残余：真实非管理员账号的浏览器端到端复核（无测试账号凭据）留 Phase 2 用户管理域建成后补验
- [x] 1-5 侧边栏展开/收起/持久化与 aria 可访问名（SubTask 1.3.1）[人工]
  - 取证：点击收起 → 图标纵列（每项含 aria-label/title）；刷新后仍收起（localStorage 持久化实证）；再点击展开恢复两级结构；组头 aria-expanded、开关 aria-label 双态正确（核验人：执行代理）
- [x] 1-6 概览四卡与 DB 聚合一致；配置页 PUT→SSR 即时生效复验（SubTask 1.4.1/1.4.2）[命令]
  - 取证：/admin 概览四卡为 prisma count 实时聚合（用户 11/模型 78/厂商 22/兑换码 0）；AdminConfigPanel 逻辑未变更（PUT /api/v1/admin/ladder/config + revalidatePath 即时生效已于前轮实证：颗粒度 0.1→2 SSR 即显），现承载于 /admin/configs 并复验渲染（22 家厂商表格 + 颗粒度 0.1 输入框）

## 分组二 · Phase 2 四管理域

- [x] 2-1 admin users/models/products/vendors API 守卫矩阵（401/403/放行/白名单剔除）全绿（SubTask 2.1.1/2.2.1/2.3.1/2.4.2）[测试]
  - 取证：`pnpm vitest run` 全量 **280/280**（29 文件）；新增 admin-users.spec(10)/admin-models.spec(8)/admin-vendors.spec(10)/admin-products.spec(8)/admin-packages.spec(7)——四态矩阵 + 白名单剔除（zod strip）全覆盖（2026-09-08 执行代理）
- [x] 2-2 封禁用户后其 access 立即失效（me 401）（SubTask 2.1.1）[测试]
  - 取证：admin-users.spec ⑤⑥ 用例——封禁（→SUSPENDED）断言 `tokenVersion: {increment:1}` 落库、解封断言 ver 不回退；me route 代码级确认 `status !== "ACTIVE"` → 10004/401（spec 口径「ver 失配或 status 校验」满足）
- [ ] 2-3 模型 isActive=false 后 /models SSR 即时消失（SubTask 2.2.1）[人工]
  - 取证：后端侧已代码+测试闭环（admin-models.spec ④ isActive 翻转→`revalidatePath("/models")` mock 断言、⑤ 同值不触发）；**浏览器截图取证待补**（需登录态会话，截图待管理者提供时标注 待补截图）
  - 补证（C-N6，2026-09-09）：门禁烟囱 smoke.spec.ts [2] 断言匿名 `/models` SSR 200 + main 可见（真实浏览器上下文，3000 standalone）
  - 补证（C-N8/C-N9，2026-09-09）：全量回归（BUILD_ID `jkKkLqLxkGRDfHmS5y0Sb` 态复验 smoke 7/7，`/models` SSR 200 断言持续绿）；isActive 翻转端到端截图仍待登录态浏览器会话
  - 补证（C-N11~C-N13 新基线，2026-09-09）：管理者生产态 `mgOMYLQ6l0H7AryuqDkjU` 常驻 3000 复用跑全量，smoke 7/7（`/models` SSR 200 持续绿）；截图项维持 待补截图 标注
  - 补证（M-N3，2026-09-09 管理者收口，BUILD_ID `mgOMYLQ6l0H7AryuqDkjU`）：`curl /models` SSR HTML实证含 `<link rel="stylesheet" href="/_next/static/css/4f14ae5159e145b8.css">` + 三主题圆点 `#4f46e5/#0d9488/#ea580c` + `hidden md:flex` 响应式已见证；`smoke 7/7` 持续绿（`standalone/apps/web/.next/static` 正确拓扑），isActive翻转截图仍待登录态会话（不阻塞门禁）
- [ ] 2-4 Product 迁移成功且 seed 三行；前台 /products 读库渲染、改值即时生效（SubTask 2.4.1/2.4.2）[命令]
  - 取证：schema（Product 模型）+ seed（3 条 upsert + count 断言）+ 前台读库/空表回退代码已就绪并巡检确认；**`pnpm prisma migrate dev --name add_product` 未执行**（`prisma/migrations/` 空目录，待数据库环境）
- [x] 2-5 每次管理端写操作有 audit_logs 记录（SubTask 2.1.1/2.2.1/2.3.1）[测试]
  - 取证：admin-users/admin-models/admin-vendors/admin-products/admin-packages spec 均断言 `writeAudit` 调用（tableName/action 1|2|3 正确）；代码级确认 redemption-codes/partner-keys/wallets 全写路径落 audit

## 分组三 · Phase 3 兑换码与财务

- [x] 3-1 并发双花恰一单成功、幂等、过期拒绝、GRANT 账本恰一条（SubTask 3.1.1）[测试]
  - 取证：`pnpm vitest run lib/features/package` → redemption.spec 13 用例全绿——CAS count=0 拒绝且 `creditInTx` 恰一次、幂等键 `redemption:{id}`、懒过期置 EXPIRED、套餐码 PackageOrder
- [x] 3-2 500 码批次生成与 CSV 导出行数一致、单码禁用后 redeem 拒绝（SubTask 3.3.1）[测试]
  - 取证：redemption.spec ⑨⑩（生成数量/补码）⑫（disableCode true/false）全绿；500 上限在 AdminRedemptionBatchCreateSchema `count≤500`；CSV 行数核对属浏览器环节
- [x] 3-3 站内 redeem 成功/已用/过期/429/401 五态（SubTask 3.4.1）[测试]
  - 取证：redeem-route.spec 6 用例全绿（含限流键 `rl:redeem:{userId}` 5 次/60s）
- [x] 3-4 Partner API：有效 Key 出 ISSUED 码、无效 401、限流 429、查码状态（SubTask 3.5.2）[测试]
  - 取证：partner-codes.spec 10 用例全绿（X-API-Key SHA-256 比对、`rl:partner:{key}` 60 次/分、ISSUED 出库、查码不泄面额；含 balanceMinor 非法串 400 修复回归）
- [ ] 3-5 PartnerKey 迁移 + seed hash 校验 + ISSUED 枚举落库（SubTask 3.5.1）[命令]
  - 取证：schema（PartnerKey/ISSUED @map("5")）+ seed（dev Key hash 比对输出）代码就绪；**`pnpm prisma migrate dev --name add_partner_key_and_issued` 未执行**（待数据库环境）
- [x] 3-6 调账入账本对账恒等式、FROZEN 拒绝、幂等重放（SubTask 3.6.1）[测试]
  - 取证：adjust.spec 7 用例全绿（ADJUST CREDIT/DEBIT 恒正、FROZEN/CLOSED 拒绝、P2002 幂等重放不重复入账、verifyWalletIntegrity 对账恒等式）
- [ ] 3-7 浏览器全链：生成码→导出→兑换→余额变化→调账一致（SubTask 3.3.1/3.4.2/3.6.2）[人工]
  - 取证：待浏览器会话录述 + 截图（后端各环节已单测闭环，见 3-1~3-6）

## 分组四 · Phase 4 等级徽章

- [ ] 4-1 PRO 账号登录后前台 Header 即见「Pro」徽章、匿名无、占位同尺寸无跳变（SubTask 4.1.1）[人工]
  - 取证：前端 UI 侧，本任务边界外（仅后端/测试/文档/验收），待人工浏览器三账号态截图

## 分组五 · Phase 5 文档与收官

- [ ] 5-1 五文档版本标记与双向锚点齐全（铁律 2/3）（SubTask 5.1.1）[断言]
  - 取证：本轮已更新 4/6——API接口文档 v1.13、数据库文档 v2.2、项目状态审计 v1.5、目录结构文档 v2.2（(site)/(admin) 组登记）；**界面交互文档（admin 外壳/tier 徽章）与文档索引.md 未推进**（UI 侧文档，不在本任务边界），待收官统一复核
  - 补证（C-N7，2026-09-09）：项目状态审计已升 **v1.7**（§10.6 门禁回归：3000 唯一/BUILD_ID/vitest 283/smoke 7 断言），文首版本标记合规
- [x] 5-2 新端点全部登记 API 文档 §5.8 且错误码先文档后代码（SubTask 5.1.1）[断言]
  - 取证：§5.8 已登记 users/models/products/packages/redemption-codes/partner-keys/wallets-adjust 全部端点 + §5.6 补 partner/codes 与 redeem 限流/错误码；错误码沿用既有 10004/10008/10006/40000/40001/10001/20001 段
- [x] 5-3 目录结构文档与实际一致（铁律 6）（SubTask 5.1.1）[断言]
  - 取证：`Get-ChildItem apps/web/app -Directory` 与文档 §三 比对——(site) 11 目录、(admin)/admin 6 页 + 概览/login/configs、api/v1 含 partner/redemption，已同步 v2.2

## 全局回归门禁（每个 Phase 完成时增量跑）

- [x] G-1 全量构建链路绿：`pnpm vitest run`（191 基线+新增全绿）、`tsc --noEmit`、`pnpm build` 连续退出码 0 [命令]
  - 取证（Phase 1 收官）：tsc shared/web 退出码 0（修复 (admin-login) 登录页 import 层级后）；vitest **199/199**（20 文件，含 middleware 8 例、admin-guard 7 例）；next build 退出码 0（期间 .pnpm next 包两次损坏，均按经验教训流程恢复：删损坏目录→pnpm install --force→金丝雀文件校验→重建）
  - 取证（Phase 2–4 后端验收，2026-09-08）：vitest **280/280**（29 文件，新增 9 spec 81 用例）；web `tsc --noEmit` exit 0、shared/ui tsc exit 0；`pnpm build` exit 0（**.pnpm next 包第三次损坏**，同流程恢复：删 next@14.2.5 损坏目录→pnpm install --force→金丝雀校验 dist/bin/next→重建）；standalone 探活：health 200、/models 200、/admin 匿名 307→`/admin/login?redirect=%2Fadmin`、/user/balance 匿名 307→`/login?redirect=%2Fuser%2Fbalance`、/admin/login 匿名 200
  - 取证（门禁闭环补齐 C-N2，2026-09-09）：tsc shared 2s / web 2s 双 0；vitest **283/283**（29 文件，含 A 侧新增用例，较 280→282→283 持续增长）；`pnpm build` exit 0（turbo 40.8s，BUILD_ID `1M7JWhK9gs91qVHGEzAH0`，Route 表 82 行含 `ƒ /api/v1/wechat/qrcode`，C-1 三类警告 0）。过程异常：build 首跑 `MODULE_NOT_FOUND jest-worker/processChild.js`（next 包问题第四次复现）；**新根因定位：宿主 `NODE_ENV=production` 使 pnpm 跳过全部 devDependencies 安装，turbo bin 链接（node_modules/.bin/turbo）缺失**；修复：`NODE_ENV=development CI=true pnpm install` 重建（.bin 12→27 条），哨兵三门复绿后 build 一次通过
  - 取证（常驻态全量回归收口 C-N9，2026-09-09）：node_modules 整体清空重装后完整门禁复测——tsc 双 0（3s/6s）、vitest **283/283**（turbo 6.5s，无 no output files）、build EXIT=0（turbo 40.3s，**新 BUILD_ID `jkKkLqLxkGRDfHmS5y0Sb`**，C-1 警告 0）；环境病新增记录：①next 包本体损坏（dist 整体缺失，第五次复现，删目录重装+金丝雀校验恢复）；②styled-jsx 包空壳（同型，同流程恢复）；③unix 风格符号链接（/e/Code/...）对 Windows node 无效需整体重装；④install 后必须 `prisma generate`（否则 dev/服务态面状 500）；⑤G-1 链路本次全程 `NODE_ENV=development` 前缀执行
  - 取证（新基线复核 C-N11~C-N13，2026-09-09）：管理者生产态常驻 3000（PID 21744，`node server.js`，**BUILD_ID `mgOMYLQ6l0H7AryuqDkjU`**，health/models 200）——C 无需自建 build，直接复用；tsc shared 4s / web 8s 双 0；vitest **287/287（30 文件，turbo 6.8s，无 no output files 警告）**；根配置全量回归 **37 passed + 71 skipped + 0 failed（EXIT=0）**；ladder 柱状图 1 例按 A-N3 收窄 `page.route → **/api/v1/ladder**` 后恢复 passed（RSC flight 与 /me 探针豁免）；smoke 7/7；子配置 20 passed + 2 failed——billing/gateway 充值链路 40000「支付渠道尚未接入」为生产语义构建的设计内行为（dev mock 渠道仅非生产可用），非业务回归，记录环境依赖备查
  - 取证（DB 窗口与门禁重跑 C-N14~C-N15，2026-09-09）：DB 窗口授时已履行（17:38:18 停 PID 21744 授 B 5 分钟，6 次轮询三行未翻转——**体验套餐仍 false，seed 待 B 重新申请窗口**）；3000 由外部方归位新 PID **37396**（BUILD_ID 不变，四探活全绿）；新 PID 态门禁——tsc 双 0（2s/8s）、vitest **297/297（32 文件）**、根配置 **37+71 0 failed**、子配置 20 passed + 2 failed（40000 备查维持）；详见审计 §10.6.10（该 297/32 基线已被 307 取代，见下行）
  - 取证（307 新基线重跑与 DB 二次授窗 C-N17~C-N18，2026-09-09）：tsc 双 0（2s/5s）；vitest **307 passed + 1 skipped（35 文件，turbo 6.1s，0 warn）**——与 HEAD `115e1bd` A/B 聚合口径一致；根配置 **37 passed + 71 skipped + 0 failed（EXIT=0，16.9s）** 零误删；子配置 20 passed + 2 failed（40000 备查维持）、**smoke 7/7**、ladder 1 例 0×/api/v1/ladder 持续绿；DB 窗口第二次授时（**20:07:49** 停 PID 37396 授 B 5 分钟，7 次轮询三行仍未翻转——**两次授窗 B 均未完成 seed，建议 B 先自查 seed 链路再第三次申请**）；C 亲自归位 3000：`PORT=3000 node .next/standalone/apps/web/server.js`（113ms Ready，新 PID **3132**，四探活全绿）；详见审计 §10.6.11
  - 取证（A-R1 后门禁重跑与 DB 第三次授窗 C-N20~C-N21，2026-09-09）：tsc 双 0（3s/5s）；vitest **310 passed（35 文件，turbo 6.0s，0 warn）**——A-R1 后 HEAD 实测（较 307+1 再 +3，含 usage 用例聚合）；根配置 **37 passed + 71 skipped + 0 failed（EXIT=0，17.9s）** 零误删；子配置 20 passed + 2 failed（40000 备查维持）、**smoke 7/7**、ladder 持续绿；DB 窗口第三次授时（**21:17:35** 停 PID 3132 授 B 5 分钟，7 次轮询 `vendors non0 modelCount: 0` 与 `体验套餐 exists: false` 两行仍未翻转——**三次授窗 B 均未完成 seed，升级为转交 B 的阻塞项：须窗口外先跑通 `prisma db seed` 并贴 `check-tables.mjs` 输出，C 暂停受理 DB 窗口**）；C 归位 3000：新 PID **2672**（140ms Ready，四探活全绿）；详见审计 §10.6.12（该 310/35 基线已被 321 取代，见下行）
  - 取证（321 新基线重跑与 DB 第四次授窗 C-N23~C-N24，2026-09-09）：tsc 双 0（2s/6s）；vitest **321 passed（36 文件，turbo 5.3s，0 warn）**——与 HEAD `91fcac6` A/B 聚合口径一致（B P2/P3 +10、A 1 skipped→4 passed）；根配置 **37 passed + 71 skipped + 0 failed（EXIT=0，16.0s）** 零误删；子配置 20 passed + 2 failed（40000 备查维持）、**smoke 7/7**、ladder 1 例 0×/api/v1/ladder 持续绿、四探活全绿；DB 窗口第四次授时（**22:31:58** 停 PID 2672 授 B 5 分钟，B-R1 后恢复受理首窗，命令口径 `pnpm db:seed`，7 次轮询两行仍未翻转——**四次授窗 B 均未完成 seed，C 维持暂停受理**；下一步：B 贴 `pnpm db:seed` 全量输出，若持续 P1001 由管理者核 `DATABASE_URL` 实例存活）；C 归位 3000：新 PID **22748**（123ms Ready，四探活全绿）；详见审计 §10.6.13（该 321/36 基线已被 325 取代，见下行）
  - 取证（325 新基线重跑与 DB 第五次授窗 C-N26~C-N27，2026-09-09）：tsc 双 0（2s/5s）；vitest **325 passed（37 文件，turbo 5.1s，0 warn）**——与 HEAD `fa261fd` A/B 聚合口径一致（B +4 守卫）；根配置 **37 passed + 71 skipped + 0 failed（EXIT=0，14.6s）** 零误删；子配置 20 passed + 2 failed（40000 备查维持）、**smoke 7/7**、ladder 1 例 0×/api/v1/ladder 持续绿、四探活全绿；DB 窗口第五次授时（**23:38:28** 停 PID 22748 授 B 5 分钟，B 贴 P1001 后恢复受理首窗，命令口径 `pnpm db:seed` + `DATABASE_URL` 显式注入，7 次轮询两行仍未翻转——**五次授窗 B 均未完成 seed，C 恢复暂停受理并升级转交管理者**：核实 `DATABASE_URL` 指向的 Postgres 实例存活（turbo `globalEnv` 依赖））；C 归位 3000：新 PID **37048**（123ms Ready，四探活全绿）；详见审计 §10.6.14
  - 取证（闹剧终结 M-C终结，2026-09-09）：管理者接管转交项终结五连败——`docker-postgres-1 healthy running` + `5432 LISTENING` 已恢复（根因：`pg.dev.conf: lc_collate/lc_ctype/server_encoding` 误写入 postgresql.conf 致 FATAL 五连败）；第六次 `pnpm db:seed 22/78/14/6` 全绿 + `check-tables.mjs: whitelist 6/6 + vendors non0:22 + 体验套餐 true` 七行全翻转；`325/37 tsc0 37+71` 保持；`3000 37048 / 5432 docker-postgres-1 / 5433 aideanbot-postgres` 三端口隔离零抢占；详见审计 §10.6.15
  - 取证（终结追补 seede 3333固化，2026-09-09）：`apps/web/prisma/seed.ts wechat-rag += http://localhost:3333/auth/aidean/callback` 已固化，事务 `FOR UPDATE array_append WHERE NOT ANY` 幂等验证 `count 2` 不重复，二次seed后 `3333_INCLUDED true + 6/6/22/true` 保持；`docker-postgres-1 5432/aidean text[] + 5433 sub_pgdata` 双隔离确权；详见审计 §10.6.16
- [x] G-2 standalone 部署链路：build 后复制 .next/static 与 public → 重启 :3000 → health/models/login 探活 200 [命令]
  - 取证（Phase 1 收官）：复制 static+public → 分离进程启动 server.js → /api/v1/system/health 200；匿名 /admin 307→/admin/login?redirect=%2Fadmin；浏览器端 /admin/login、/admin、/admin/configs、/、/user/console 全部正常渲染
  - 取证（G-2 闭环补证 C-N3，2026-09-09）：`ls .next/standalone/apps/web/server.js` ✅；`ls .next/standalone/.next/static` 复制前 NOT_EXIST（取证到位）→ `cp -r` static/public → `ls .next/standalone/apps/web/.next/static/css` 见 `4f14ae5159e145b8.css`；`node .next/standalone/apps/web/server.js` 启动 107ms Ready，3000 唯一 LISTENING；`curl -i http://localhost:3000/api/v1/system/health` → `HTTP/1.1 200 OK`（x-request-id 4a3d49e6…）
- [x] G-3 与 establish-dev-workflow 回归联动：本 spec checklist 与 tasks 复选框推进同步于每 Phase 收官（增量展开规则）
  - 取证（Phase 1 收官）：checklist 分组一 1-1~1-6 全勾 + tasks.md SubTask 1.1.1~1.4.2 全勾，同步完成于本 Phase 验收后
- 取证（3333 SSO 9 步真实浏览器闭环 C-N29，2026-09-10）：DB 只读复核 `oidc_clients.redirect_uris ARRAY/_text`、`wechat-rag 2 URIs 含 3333`、`check-tables 6/6 non0:22 true`；门禁复验 tsc 双 0（2s/4s）、vitest 当次实测 **328 passed（37 文件，325→328 HEAD 推进）**、根配置 **37 passed + 71 skipped + 0 failed（EXIT=0，19.0s）** 零误删、子配置 20 passed + 2 failed（40000 备查维持）、smoke 7/7、ladder 持续绿；新增 `e2e/web/sso-3333.spec.ts` **3 用例 3/3（EXIT=0，4.0s）**：[a] authorize 307 Location 3333 含 code+state、[b] 真实浏览器 9 步（3333 发起→主平台登录→白名单回跳→callback 兑换→会话落地）、[c] 3333 /auth/me 200 + code 单次重放不 500 + 会话保持 + 无 3334；环境事实三项归档审计 §10.6.17（standalone HOSTNAME 绑定语义解耦、page.route 跨域 307 不可靠须响应层拦截、3333 容器抖动自愈）；3000 复用归位 PID 25952（默认 0.0.0.0 绑定，Docker 后端 token 兑换可达）；BUILD_ID `mgOMYLQ6l0H7AryuqDkjU` 不变
- 取证（生产态重建 + DB 重建 + B HTTP 解锁 C-N29 终态，2026-09-10）：门禁确权 tsc 双 0（2s/6s）、vitest **329 passed（37 文件，HEAD 358b374）**；生产态 `pnpm build`（清 `NODE_ENV`）**EXIT=0（25.6s），新 BUILD_ID `fbX488Y1YSgGbR8FIrs5h`（≠mgOMYLQ6），0 告警**——B 迁出非法导出后阻断解除；G-2 归位（复制前 NOT_EXIST → `css/4f14ae5159e145b8.css` → `PORT=3000` 默认 `0.0.0.0` 绑定，171ms Ready）；DB 重建（generate 首次 EPERM 因 query_engine dll 被 server 锁定，停服自愈 → `db push --accept-data-loss` → `db:seed` 全链 EXIT=0）→ **`check-tables` 8/8**（non0:22 / 体验套餐 true），`oidc_clients.wechat-rag` 回 seed 口径 2 URIs（8000 为后端运行时追加，来源说明维持）；3000 归位 PID **58196** 四探活全绿；**sso-3333 新 BUILD 态复跑 3/3（EXIT=0，4.4s）**；**B HTTP 解锁**：`GET /admin/configs` 200（8 键）、`PUT pricing.currency XXX`→40000、`USD`→200、`evalPerModel 99999`→clamp 9999（valueRule 生效）；详见审计 §10.6.17 追记
- 取证（管理者 commit 后保持性复核，2026-09-10，HEAD 1f8542d）：三文件已由管理者以 `1f8542d chore(release)` 入库（audit +2 行/checklist +2 行/sso-3333 spec 141 行新增），工作树对三文件干净；复核全绿——tsc shared **EXIT=0（3s）**、tsc web **EXIT=0（7s）**、vitest **329/37 EXIT=0（12s）**、3000 health **200**（standalone server.js PID 58196，0.0.0.0 绑定，BUILD fbX488Y1）、**sso-3333 复跑 3/3（EXIT=0，4.7s）**；环境插曲：Playwright 运行时升级后缺 `chromium_headless_shell-1234` 二进制致首次复跑 3 failed（`browserType.launch: Executable doesn't exist`，非路由回归），`npx playwright install chromium-headless-shell`（v1234 / Chrome Headless Shell 151.0.7922.34）后恢复——C 域测试环境配置项，已归档审计 §10.6.17
- 取证（二次 commit 复核，2026-09-10，HEAD b54067b）：管理者先 `4beefb2`（pricing/security 讨论稿）后 `b54067b fix(scripts)` 将保持性复核两文件与 `http-verify-configs.mjs` ladder→0.1 复原一并入库，staged 清空；复核全绿——tsc shared **EXIT=0（3s）**、tsc web **EXIT=0（6s）**、vitest **329/37 EXIT=0（9s）**、根配置全量 e2e **40 passed + 71 skipped + 0 failed（EXIT=0，15.9s，总数 108→111）**——新增 3 passed 即 sso-3333 3 用例首次计入根配置口径，属预期推进；smoke **7/7（2.8s）**；3000 health **200**（PID 58196，BUILD fbX488Y1），3333=41308 保持；§10.6.17 旧挂账行（后续影响三项）已全部解除并改写为终态
- 取证（前缀双开关重启，A 三态解锁动作，2026-09-10）：确权 PID 58196 归属后优雅停止（3000 清零确认）；首次启动因路径根错置（仓库根 `.next\...` MODULE_NOT_FOUND）失败，修正为真实产物 `apps/web/.next/standalone/apps/web/server.js` 后以 `AIDEAN_ENABLE_MOCK_UPSTREAM=1 AIDEAN_GATEWAY_STREAM_PASSTHROUGH=1 PORT=3000 node server.js`（HOSTNAME 默认 0.0.0.0）归位，**新 PID 33472**；四探活全绿（health 200 / models 200 / admin 307→login / me 401）；**mock 三态自测**：`POST /api/v1/mock-upstream/chat/completions?sse_mode=usage` **200 + text/event-stream + SSE delta 帧**（GET 405 设计内）；sso-3333 复跑 **3/3（EXIT=0，4.2s）**——A 三态解锁前置达成，通知 A `git pull` 跑冻结脚本三态 finalize；详见审计 §10.6.17 追记

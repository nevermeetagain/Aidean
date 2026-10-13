# Tasks

- [x] Task 1: ladder/config 读写闭环核验（修正：读侧早已接通——config.ts getLadderGranularity 被 models/ladder SSR 消费，默认 0.1 值域 [0.01,10]；零编辑，tsc 0 + vitest 32/32）
  - [x] SubTask 1.1: 确认配置载体 SystemConfig/system_configs，configKey="ladder_score_granularity"，NUMBER 型，clamp 域 [0.01,10]
  - [x] SubTask 1.2: 读函数已存在（config.ts，全捕获回退，绝不抛不阻首屏）——无需新建，避免双真源
  - [x] SubTask 1.3: SSR 接线已存在（models/page.tsx:11/47/51 + ladder/page.tsx + LadderBoard useState(granularity)）
  - [x] SubTask 1.4: 核验通过（tsc exit 0；ladder vitest 32/32；浏览器实证移交 Task 5.3）
- [x] Task 2: admin 门禁矩阵测试（已完成：2 spec 文件 16 用例；四态实际值：未登录 401(10004)/USER 403(10008)/ADMIN·SUPER_ADMIN 放行+回库复核 role；auth 42/42，全量 186/186）
  - [x] SubTask 2.1: admin-guard.spec.ts ×7（未登录 10004、USER 10008、ADMIN/SUPER_ADMIN 放行、查无此人/软删 10008、MODERATOR 10008）
  - [x] SubTask 2.2: admin-routes.spec.ts ×9（vendors+ladder/config 四 handler 守卫拒绝→401/403 信封、放行→业务分支、非法 body 40000）
- [x] Task 3: dev callback 工具页（已完成：app/oauth/dev/callback/page.tsx，Server Component 回显 code/state/error+其他参数，force-dynamic，tsc 通过）
  - [x] SubTask 3.1: 新建 app/oauth/dev/callback/page.tsx：读 searchParams 回显 code/state/error，no-store（force-dynamic），注明仅 dev 用
- [x] Task 4: billing 资金路径测试（已完成：3 新 spec 文件 20 用例，全量 17 文件 170/0 无回归；并揪出 4 个生产缺陷 → 触发 Task 7）
  - [x] SubTask 4.1: 定界完成（资金核心在 billing/service.ts：hold/captureHold/voidHold/expireOverdueInTx/sumActiveHolds/verifyWalletIntegrity；vi.mock prisma + txStub 模式）
  - [x] SubTask 4.2: hold.spec.ts ×8（余额不足 40001 零副作用、守卫、幂等、TTL、懒清理、乐观锁重试）
  - [x] SubTask 4.3: capture.spec.ts ×7（超上限 40000、三增量对账、幂等重放、竞态重读、闭环）
  - [x] SubTask 4.4: refund-reconcile.spec.ts ×5（void 对称、往返净 0、对账回退、失衡差额、缺失 50000）
- [x] Task 7（测试驱动新增）：修复 3 个资金级缺陷 + capture 防御守卫（红 5 failed → 绿 41/41；全量 191/191；tsc 0）
  - [x] SubTask 7.1: voidHold 二次解冻修复（service.ts:376-385：懒清理 released>0 重读；EXPIRED/VOIDED 幂等返回、CAPTURED 40004、仅 AUTHORIZED 解冻置 VOIDED）
  - [x] SubTask 7.2: hold() 懒清理同步内存 heldMinor（service.ts:118：expireOverdueInTx 解冻时同步扣减，可用额用新口径）
  - [x] SubTask 7.3: sumActiveHolds 仅聚合 AUTHORIZED（repository.ts:244-247 一行修复，最小偏离说明在案）
  - [x] SubTask 7.4: captureHold 防御守卫（service.ts:336-339：held>=amount 不变式，违反 40004）；回归用例 5 个（含 held 不足 40004 零副作用、幂等返回仅一次解冻、where 断言）
- [x] Task 5: 全量验证（已完成）
  - [x] SubTask 5.1: 全量 vitest 191/191（19 文件）+ tsc --noEmit exit 0
  - [x] SubTask 5.2: 期间 2 次 .pnpm 损坏（next 簇 ×2）按经验教训流程恢复（哨兵全 True）→ build exit 0 → 复制 static/public → 重启 :3000
  - [x] SubTask 5.3: 探活 health/models/login/dev-callback 全 200；E2E 实证（chrome profile 被占改 HTTP 等效验收）：SUPER_ADMIN 登录 → PUT granularity=2 → SSR 立即 2 ✅ → PUT 0.1 还原 → SSR 0.1 ✅ → 未登录 PUT 401 ✅；/admin 未登录 → meta refresh 跳 /login?redirect=/admin ✅
- [x] Task 8（验证期新增）：修复 admin 配置 ISR 呈现延迟——config.ts L9 自曝"生效=页面 3600s revalidate 首刷"，运营改配置最长 1h 不可见
  - [x] SubTask 8.1: route.ts PUT 落库后 revalidatePath("/models")+("/ladder")（v2.2 修正，含注释同步）
  - [x] SubTask 8.2: admin-routes.spec.ts 补 vi.mock("next/cache")；191/191 恢复全绿
  - [x] SubTask 8.3: E2E 实证即时生效（见 5.3）；e2e 中途误判说明：直写 DB 绕过 route 不会触发 revalidatePath 属预期，修正为走真实 PUT 链路验证
- [x] Task 6: 文档同步（依赖 Task 5）
  - [x] SubTask 6.1: 项目状态审计.md 升 v1.1（§六 深检与修复记录 + §一 admin 置信升级 + §七 编号去重为 §八）
  - [x] SubTask 6.2: 核对 API接口文档.md——admin 两端点已在 v1.11 §5.8 登记（无需改）；补 dev callback 至 §5.7 表（升 v1.12）；文档索引.md 升 v1.4 锚点同步
  - [x] SubTask 6.3: spec 三件套勾选归档 + 项目记忆摘要

# Task Dependencies
- Task 2 依赖 Task 1（已完成）；Task 5 依赖 Task 1-4、7；Task 6 依赖 Task 5；Task 2/7 可并行（文件域不相交：auth tests vs billing service）
- Task 5.2 注意：服务当前 DOWN（后台 job exit -1），重启时按经验教训流程清孤儿后重建

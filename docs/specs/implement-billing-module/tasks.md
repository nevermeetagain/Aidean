# Tasks · implement-billing-module

> 所属 Phase: 3 模块 3/4 | 四级层级 · 六字段 | 顺序 C(契约)→L(账本核心)→R(路由)→F(前端)→V(核验)

---

## Task B.1 契约与错误码先行 【依赖: 无 | 产出: shared 契约对齐 + 错误码登记】

- [x] #### SubTask B.1.1 shared 计费契约对齐与扩展（七值对齐 prisma；WalletView/LedgerPage/RechargeOrderCreate 等视图 schema 落位；shared 40T 绿）
  - 【目标】`LEDGER_ENTRY_TYPES` 七值对齐 prisma 实况（TOPUP/CONSUME/REFUND/REVERSAL/GRANT/EXPIRE/ADJUST，引用《数据库文档.md》账本口径）；billing.schema.ts 新增 WalletView/LedgerQuery/LedgerPage/RechargeOrderCreate/RechargeOrderView Zod schema
  - 【范围】修改 `packages/shared/src/constants/billing.constants.ts`、`packages/shared/src/schemas/billing.schema.ts`；确认 `packages/shared/src/index.ts` 出口已含（缺则补）
  - 【验收】shared `pnpm --filter @aidean/shared test` 全绿；新 schema 构造样例 parse 通过；LedgerEntryType 与 prisma enum 逐值一致
  - 【验证命令】`pnpm --filter @aidean/shared test` + shared tsc --noEmit
  - 【产出】对齐后的契约层
  - 【依赖】无

- [x] #### SubTask B.1.2 错误码登记与回填（文档 §4 财务段 40001~40005 → errors.ts 回填，40005→401；§5.9 锚点互引随 B.3.2 落）
  - 【目标】API 文档 §4 财务段登记 40002 订单不存在 / 40003 订单状态非法 / 40004 预扣无效 / 40005 回调验签失败；随后回填 `errors.ts` 与 `DEFAULT_STATUS_BY_CODE`（40005 → 401，其余 400）
  - 【范围】修改 `docs/architecture/API接口文档.md`（§4 + 文首版本锚，铁律 3）与 `apps/web/app/api/v1/_lib/errors.ts`
  - 【验收】文档码位与 errors.ts 键值一一对应；铁律 2：§5.9（B.3.1 建立）末尾有指向 API架构设计方案.md 的锚点互引
  - 【验证命令】Select-String 双向 grep 码位一致性
  - 【产出】错误码双源对齐
  - 【依赖】无

## Task B.2 账本核心（features/billing + wallet 读侧） 【依赖: B.1 | 产出: 双录/hold/订单/对账服务】

- [x] #### SubTask B.2.1 repository：事务化数据访问（乐观锁 updateMany 条件写/写流水幂等键/hold CRUD/SETTLED 聚合/活跃 holds 合计）
  - 【目标】提供 `prisma.$transaction` 内可组合的原子操作：乐观锁扣减/冻结钱包（`updateMany where lockVersion` 条件写）、写 LedgerEntry、hold CRUD、SETTLED 流水聚合、活跃 holds 合计
  - 【范围】实装 `apps/web/lib/features/billing/repository.ts`（现占位清空重写）
  - 【验收】乐观锁失败（lockVersion 不匹配返回 count=0）向上可辨识；金额全程 BigInt 分
  - 【验证命令】单测覆盖（vitest mock prisma）
  - 【产出】billingRepository
  - 【依赖】B.1.1

- [x] #### SubTask B.2.2 service：双录/hold/订单/对账编排（16T 全绿：幂等重放/差额捕获/40001 零副作用/mock 闭环/40005 验签/对账 diff；wallet 读侧委托 billing）
  - 【目标】`postEntry`（幂等双录）、`hold/captureHold/voidHold/releaseExpiredHolds`（懒清理）、`createRechargeOrder/getRechargeOrders/handleChannelNotify`（验签→PAID→TOPUP(+BONUS) 入账）、`verifyWalletIntegrity`；wallet 读侧 `getWalletView/getLedgerPage`（日期分组视图）
  - 【范围】实装 `apps/web/lib/features/billing/{service,types,schema}.ts`（types/schema 薄化——契约以 shared 单一来源，feature 内仅留视图类型）；`features/wallet/service.ts` 委托 billing（wallet 域对外仅读视图，避免双域写竞争）
  - 【验收】spec 六 Requirement 对应单测全绿：幂等重放、预扣-捕获-差额释放、余额不足 40001 零副作用、mock 闭环、错误验签 40005、对账 diff 明细
  - 【验证命令】`pnpm --filter web test billing` 全绿
  - 【产出】billingService / walletService（读侧）
  - 【依赖】B.2.1、B.1.2

## Task B.3 API 路由 【依赖: B.2 | 产出: /api/v1/billing/*】

- [x] #### SubTask B.3.1 路由四组 + API 文档 §5.9（wallet/ledger/recharge-orders POST+GET/notify + dev mock-pay；§5.9 五端点行 + 锚点互引铁律 2；build 通过 + e2e 401/10004、40005 取证）
  - 【目标】GET wallet（余额概览）、GET ledger（分页+日期分组）、POST/GET recharge-orders（创建/列表）、POST recharge-orders/[id]/notify（渠道回调，验签）；API 文档新增 §5.9 财务 billing 段（端点行 + 错误码引用 + 锚点互引 + 版本锚已在 B.1.2 更新则复核）
  - 【范围】新建 `apps/web/app/api/v1/billing/**`；所有路由经 `withApi` + 会话校验（notify 路由除外——渠道签名即凭证）
  - 【验收】未登录 10004/401；Zod 入参校验失败 40000；notify 幂等重放返回 0；dev mock 渠道仅 NODE_ENV!=='production' 注册
  - 【验证命令】`pnpm --filter web build` 通过 + routes-billing 单测（走 withApi 全链路 stub）
  - 【产出】四组路由 + 文档 §5.9
  - 【依赖】B.2.2

## Task B.4 控制台前端 【依赖: B.3 | 产出: /user/balance 余额页】

- [x] #### SubTask B.4.1 余额页与充值交互（Server 页 RSC 取数 + RechargePanel 五档 client 组件；console 入口卡 data-testid=balance-entry；build 通过）
  - 【目标】余额概览卡（流动模糊渐变特效沿用既有实现、reduced-motion 降级）+ 充值档位五档选择（下单→展示订单/支付待接入说明，mock 渠道提示仅 dev）+ 流水列表按日期分组（分页加载）
  - 【范围】新建 `apps/web/app/(web)/user/balance/page.tsx`（client 组件拉取接口）；console/page.tsx 加入口卡
  - 【验收】build 通过；余额/available 展示分转元；日期分组标题正确；未登录跳登录
  - 【验证命令】`pnpm --filter web build` + e2e（B.5）
  - 【产出】余额页
  - 【依赖】B.3.1

## Task B.5 核验收口 【依赖: B.4 | 产出: checklist 全绿 + 归档】

- [x] #### SubTask B.5.1 e2e + checklist 核验（e2e 全量 13 绿含 billing-flow 2 例；hold 无 HTTP 面口径注记——单测保障、网关 e2e 覆盖端到端；checklist 全绿回填）
  - 【目标】e2e 新增 billing-flow 用例（注册→mock 充值→钱包视图→流水出现 TOPUP→预扣捕获→余额正确）；checklist.md 逐条取证勾选；CL 提交
  - 【范围】根 `e2e/` 增 spec；`docs/specs/implement-billing-module/checklist.md`；涉及文档按铁律 3 更新版本锚
  - 【验收】e2e 全绿；checklist 无未决项；git log 留痕
  - 【验证命令】`pnpm e2e` + checklist 逐项勾选
  - 【产出】可验收的余额账本模块
  - 【依赖】B.4.1

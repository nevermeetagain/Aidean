# Tasks

- [x] Task 1: 五维深检侦查（只读代码，零业务代码变更）
  - [x] SubTask 1.1: UI/交互维度——页面树全清单（(web) 12 页 + oauth 8 目录 + api 全路由已枚举）；/user/balance（walletService/billingService RSC + RechargePanel）与 /user/console（userService 四路并行取数）确认真实接线
  - [x] SubTask 1.2: 联动维度——内部闭环矩阵 4 条标注证据（gateway-orchestrator.spec/admin E2E/门禁矩阵 ×16/user 组件消费方）；外部等待 3 项（子平台/支付/微信凭据，qrcode 已配置路径为注释桩）；空转盘点：13 个 seed 配置零读侧消费
  - [x] SubTask 1.3: 数据维度——system_configs 14 项判定表（1 接线/5 P1 接线/2 挂账/2 挂账或裁剪/2 裁剪候选/2 二期接线）；seed 9 个 Data 数组、模型 20+ 条，距千级压测差 1-2 量级
  - [x] SubTask 1.4: admin 维度——现状画像（page.tsx 1290B 单页 + AdminConfigPanel + 2 API + 门禁）；缺失矩阵对照 §5.8：仅榜单配置域部分覆盖，其余全域缺失
- [x] Task 2: 五问结论落档（依赖 Task 1）
  - [x] SubTask 2.1: 项目状态审计.md 升 v1.2——新增 §八 五维深检与管理端蓝图（8.1-8.5 五问逐项、证据链接），版本标记合规
  - [x] SubTask 2.2: 行动序更新——行动 4 增补 admin 扩容立项（§8.5）+ 配置治理专项（§8.4）；e2e 回归仍居行动 1
- [x] Task 3: admin 扩容蓝图（随 Task 2 落档至审计 §8.5）
  - [x] SubTask 3.1: 布局方案 A（/admin/layout.tsx 侧栏分区 + 子路由页）推荐 / 方案 B 单页 Tabs 过渡
  - [x] SubTask 3.2: P0（用户管理/订单流水只读/模型上下架）/ P1（通用配置/厂商/兑换码）/ P2（内容/同步任务/Key 池/计费规则/等级池/免费额度/套餐/审计日志）
  - [x] SubTask 3.3: API 增量清单（/admin/users、/orders、/models、/configs、/redemption-codes；权限沿用 requireAdminApi + 回库复核）
- [x] Task 4: 优化改进清单登记（随 Task 2 落档至审计 §8.3：空转配置治理/seed 扩容/性能区段/consent UI/SSE）
- [x] Task 5: checklist 核验 + spec 三件套归档 + 项目记忆更新
  - [x] 附带修复：发现上轮 v1.4/v1.12 文档编辑在 commit 前被外部还原（IDE 旧缓冲区覆盖）——API 文档 v1.12 与 dev callback 行、索引 v1.5 已重做补齐；教训入 project_memory

# Task Dependencies

- Task 2/3/4 均依赖 Task 1（侦查先行，结论可并行起草但落档统一在 Task 2 提交）
- Task 5 依赖 Task 2-4 全部完成
- 全程无业务代码变更；:3000 服务器当前已退出（job exit -1），本 spec 无需重启（纯文档产出）

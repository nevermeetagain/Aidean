# 术语表（规划增量）

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）——仅登记本规划新引入/需统一的术语；全量术语以 docs/governance/术语表.md 为准，落地时由文档同步卡并入

| 术语（唯一名） | 英文/代码名 | 定义 | 禁用别名 |
|---|---|---|---|
| 契约唯一源 | packages/shared | 前后端共享的 zod schema 与常量所在位置；冻结稿落地后以此为准 | 「双源对齐」 |
| 冻结稿 | contracts/*.contract.ts | 本规划给出的待落地契约精确内容，实施期只读 | — |
| 错误码 | ERROR_CODES | 5 位业务码（段位 1–5xxxx），与 HTTP 状态分离 | 「错误号」 |
| 就绪探针 | /api/v1/system/ready | 探测 DB 与 Redis 可用性的端点；区别于只表示进程存活的 health | 「健康检查」（指 health） |
| 功能开关 | FeatureFlag / flagCode | 以码（如 ladder.station）控制模块开/关：关闭则入口隐藏、页面 403 态、API 50011 | 「特性开关」「feature toggle」 |
| 功能关闭态 | FeatureDisabled | 页面在开关关闭时呈现的 403 状态 | — |
| 收藏 | Favorite | 登录用户对模型（MODEL）或模型站（API_STATION）的标记 | 「关注」「收藏夹」 |
| 限时优惠 | PROMOTION 价格行 | `source_type=PROMOTION` 且有 [from, until) 窗口的价格行，窗口内替代官方价 | 「折扣活动」 |
| 生效价 | EffectivePrice | 某时刻用于展示与计费的单价（优惠优先，否则当前官方价） | 「实时价」 |
| 步行骨架 | Walking Skeleton（S0） | 最小端到端闭环：ready + 鉴权写 + 表 + 迁移重放 + 真实页面 + 统一错误 | — |
| 切片 | Slice（S0–S9） | 端到端可演示的增量 | 「模块」「阶段」（指技术层时） |
| 资源锁串行边 | lock edge | 两任务允许修改路径重叠时强制的先后顺序 | — |
| 独立验证者 | Verifier | 只看 diff + 运行结果输出 PASS/FAIL/UNKNOWN 的角色 | — |
| 主 Agent / 外部 Agent | Hark / External | 前者执行核心与 UI 卡，后者执行中/简单卡 | — |

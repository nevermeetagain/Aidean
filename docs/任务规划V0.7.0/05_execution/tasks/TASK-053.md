# TASK-053：UI：价格页/详情页统一 ¥/M 展示（附原币原价注记）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-15 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b / REQ-C-03 价格透明（展示价与官方一致：原币原价须可见）
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：DESIGN-003

## 目标
/pricing 网关单价表与 /models/[slug] 参数表的价格列统一显示「¥x.xx / M Tokens」，USD 官方价以次级文字「官方 $y / M」并列（不隐藏原价）；三套浅色主题对比度 ≥4.5:1

## 输入
- 文档：`contracts/06-ux-states.contract.ts PRICING_TABLE`；`docs/product/design/UI设计文档.md`
- 契约：`EffectivePriceSchema（v0.2）`；`UX_STATES.pricingTable`
- 前置任务：TASK-048, TASK-029
- 前置状态：TASK-048、TASK-029 已合并（同页资源锁）

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/(site)/pricing/page.tsx`
  - `apps/web/app/(site)/models/[slug]/page.tsx`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-053/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 价格单元格改读 EffectivePrice.priceInput/priceOutput（已归一）
2. [ ] sourceCurrency≠CNY 时追加原币注记
3. [ ] 空态/错误态沿用契约⑥
4. [ ] 三主题截图存证
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec tsc --noEmit` 0 且 `pnpm --filter web lint` 0 error
- [ ] 页面无 `$` 作为主价格符号（e2e/人工：主列均为 ¥）
- [ ] 原币注记对 USD 行可见（人工截图）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-053/`

## 允许修改
- `apps/web/app/(site)/pricing/**`
- `apps/web/app/(site)/models/[slug]/**`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-053/**`

## 禁止修改
- `apps/web/lib/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-048, TASK-029
- 资源锁串行（同文件，须在其后执行）：TASK-067, TASK-074
- Blocks：TASK-054
- 阻塞条件：U-15 未裁决 → 不执行（条件卡）

## 建议执行档位
opus　理由：全部 UI 设计实现由主 Agent 负责；展示口径直接面向用户

## 升级条件
设计与「展示价=官方价」约束冲突 → 升 opus 并回报用户；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h

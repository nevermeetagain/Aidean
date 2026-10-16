# TASK-029：UI：后台优惠子表与创建对话框 + 前台优惠价徽标

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.4.0→V0.5.0：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-12 / REQ-C-03
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038
- 来源方案：DESIGN-002

## 目标
/admin/prices 可增改删优惠；/pricing 与 /models/[slug] 显示「限时优惠/限时免费」徽标与原价划线；五态符合契约⑥

## 输入
- 文档：`contracts/06-ux-states.contract.ts 后台限时优惠/前台价格徽标`
- 契约：`EffectivePriceSchema`
- 前置任务：TASK-027, TASK-028, TASK-023
- 前置状态：TASK-027、TASK-028 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/admin/PromotionsPanel.tsx`
  - `apps/web/components/admin/PricesManager.tsx`
  - `apps/web/components/common/PriceTag.tsx`
  - `apps/web/app/(site)/pricing/page.tsx`
  - `apps/web/app/(site)/models/[slug]/page.tsx`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-029/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] Dialog + 日期时间输入（Asia/Shanghai 展示，提交 ISO UTC）
2. [ ] PriceTag 统一价格渲染
3. [ ] 无写权限只读
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] web tsc/lint 0 error
- [ ] TASK-030 通过（独立验证者判定）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-029/`

## 允许修改
- `apps/web/components/admin/PromotionsPanel.tsx`
- `apps/web/components/admin/PricesManager.tsx`
- `apps/web/components/common/PriceTag.tsx`
- `apps/web/app/(site)/pricing/**`
- `apps/web/app/(site)/models/[slug]/**`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-029/**`

## 禁止修改
- `apps/web/app/api/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-027, TASK-028, TASK-023
- 资源锁串行（同文件，须在其后执行）：TASK-078
- Blocks：TASK-030, TASK-053
- 阻塞条件：与 TASK-023 同改 models/[slug]/page.tsx → 必须在 TASK-023 合并后开始（已列依赖）

## 建议执行档位
opus　理由：UI 设计（价格透明呈现），主 Agent 亲自完成

## 升级条件
连续 2 次验收失败 → 重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 10h　≥2h

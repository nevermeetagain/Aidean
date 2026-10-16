# TASK-078：UI 小修：天梯五维筛选「全部」全选/全不选 + 价格页充值档位改读 shared RECHARGE_TIERS

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**sonnect**

> V0.4.0→V0.5.0：V0.5.0 新增（FIX-08/15）

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-058 / REQ-F-026
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-026、REQ-F-058
- 来源方案：需求文档 §七验收:179；billing.constants.ts:43-47

## 目标
每组筛选「全部」可全选与全不选（现仅「不限」清空）；/pricing 不再硬编码档位，与 shared 常量一致

## 输入
- 文档：`docs/product/requirements/需求文档.md:179`；`apps/web/components/ladder/LadderFilterBar.tsx:5,152`；`apps/web/app/(site)/pricing/page.tsx:31`；`packages/shared/src/constants/billing.constants.ts:43-47`
- 契约：`RECHARGE_TIERS（只读引用）`
- 前置任务：TASK-023
- 前置状态：TASK-023 已合并（同 Agent-App 串行）

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/ladder/LadderFilterBar.tsx`
  - `apps/web/app/(site)/pricing/page.tsx`
  - `e2e/ladder-filter-all.spec.ts 由 TASK-079 编写`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-078/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 「全部」改为三态切换（全选/全不选），保持 URL 参数兼容
2. [ ] pricing 页 import RECHARGE_TIERS 替换硬编码数组
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `grep -nE '\[\s*10\s*,\s*55' 'apps/web/app/(site)/pricing/page.tsx'` exit=1
- [ ] tsc/lint exit 0
- [ ] TASK-079 e2e 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-078/`

## 允许修改
- `apps/web/components/ladder/LadderFilterBar.tsx`
- `apps/web/app/(site)/pricing/page.tsx`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-078/**`

## 禁止修改
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-023
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-079
- 阻塞条件：无

## 建议执行档位
sonnect　理由：两处前台 UI 小修，合并成刀避免 <2h 单刀；UI 归 Hark

## 升级条件
交互口径不明 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h

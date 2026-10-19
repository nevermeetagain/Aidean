# TASK-034：UI：顶栏搜索（桌面框 + 移动端展开 + 键盘导航）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus** ｜ **条件卡：待 U-5（顶栏搜索是否需要）裁决后下发**

> V0.8.0 状态：**条件·待裁决**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：条件·待裁决）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S5（顶栏全局搜索）
- 来源需求：REQ-F-15 / §五.2（搜索框仅在顶部导航栏）
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-002
- 来源方案：SOL-S5

## 目标
SiteHeader/MobileNav 内唯一搜索入口，防抖 250ms、AbortController、↑↓/Enter/Esc，五态符合契约⑥；其他页面不出现搜索框

## 输入
- 文档：`contracts/06-ux-states.contract.ts 顶栏全局搜索`
- 契约：`SearchResponseSchema`
- 前置任务：TASK-033, TASK-018
- 前置状态：TASK-033、TASK-018 已合并（SiteHeader 由 S2 先改）

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/site/GlobalSearch.tsx`
  - `apps/web/components/site/SiteHeader.tsx`
  - `apps/web/components/site/MobileNav.tsx`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-034/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 组件实现
2. [ ] 可访问性 role=combobox/listbox
3. [ ] 三主题对比度自查
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] web tsc/lint 0 error
- [ ] TASK-035 通过（独立验证者判定）
- [ ] `grep -rln "GlobalSearch" apps/web/app apps/web/components` 仅出现在 site/ 下
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-034/`

## 允许修改
- `apps/web/components/site/GlobalSearch.tsx`
- `apps/web/components/site/SiteHeader.tsx`
- `apps/web/components/site/MobileNav.tsx`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-034/**`

## 禁止修改
- `apps/web/app/api/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-033, TASK-018
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-035
- 阻塞条件：与 S2 TASK-018 同改 SiteHeader → 已串行

## 建议执行档位
opus　理由：全站头部交互设计，主 Agent 亲自完成

## 升级条件
连续 2 次验收失败 → 重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 8h　≥2h

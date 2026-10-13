# TASK-023：UI：收藏按钮（详情页/天梯卡片）+ 控制台「我的收藏」Tab

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-13
- 来源方案：SOL-S3

## 目标
登录用户可在 /models/[slug] 与天梯卡片收藏/取消，控制台收藏 Tab 分页展示与删除；五态与 testid 符合契约⑥

## 输入
- 文档：`contracts/06-ux-states.contract.ts 收藏按钮/我的收藏`
- 契约：`FavoriteListResponseSchema`；`PublicFeaturesSchema`
- 前置任务：TASK-022
- 前置状态：TASK-022 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/site/FavoriteButton.tsx`
  - `apps/web/components/console/FavoritesPanel.tsx`
  - `apps/web/app/(site)/models/[slug]/page.tsx`
  - `apps/web/components/ladder/*（卡片挂按钮）`
  - `apps/web/components/console/ConsoleWorkspace.tsx（加 Tab）`
  - `apps/web/hooks/useFavorites.ts`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-023/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] SWR 数据层 + 乐观更新回滚
2. [ ] 未登录点击跳 /login?redirect
3. [ ] 收藏开关关闭时隐藏按钮与 Tab
4. [ ] 复用 @aidean/ui Button/Card/Tabs
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] web tsc/lint 0 error
- [ ] TASK-024 e2e 全绿（独立验证者判定）
- [ ] 人工：天梯卡片悬浮态不遮挡分数
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-023/`

## 允许修改
- `apps/web/components/site/FavoriteButton.tsx`
- `apps/web/components/console/FavoritesPanel.tsx`
- `apps/web/components/console/ConsoleWorkspace.tsx`
- `apps/web/components/ladder/**`
- `apps/web/app/(site)/models/[slug]/**`
- `apps/web/hooks/useFavorites.ts`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-023/**`

## 禁止修改
- `apps/web/app/api/**`
- `packages/shared/**`
- `apps/web/components/site/SiteHeader.tsx（S2/S5 占用）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-022
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-024, TASK-029
- 阻塞条件：天梯卡片组件与 S5 搜索同时改 → 串行（本卡不改 SiteHeader）

## 建议执行档位
opus　理由：UI 设计与交互（乐观更新/未登录引导），主 Agent 亲自完成

## 升级条件
连续 2 次验收失败 → 重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 12h　≥2h

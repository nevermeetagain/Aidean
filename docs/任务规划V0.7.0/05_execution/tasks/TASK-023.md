# TASK-023：UI：收藏按钮（详情页/天梯卡片）+ 控制台「我的收藏」Tab

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-21 vitest include 仅 lib/**（vitest.config.ts:13），UI 验收以 e2e 为准

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-13
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-052
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
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-023/`（取证：命令输出/截图/日志）

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
- [ ] UI 行为以 e2e 用例断言（`pnpm test:e2e -g` 对应用例全绿），不得以组件单测替代——vitest 不收集 components/**
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-023/`

## 允许修改
- `apps/web/components/site/FavoriteButton.tsx`
- `apps/web/components/console/FavoritesPanel.tsx`
- `apps/web/components/console/ConsoleWorkspace.tsx`
- `apps/web/components/ladder/**`
- `apps/web/app/(site)/models/[slug]/**`
- `apps/web/hooks/useFavorites.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-023/**`

## 禁止修改
- `apps/web/app/api/**`
- `packages/shared/**`
- `apps/web/components/site/SiteHeader.tsx（S2/S5 占用）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-022
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-024, TASK-029, TASK-078
- 阻塞条件：天梯卡片组件与 S5 搜索同时改 → 串行（本卡不改 SiteHeader）

## 建议执行档位
opus　理由：UI 设计与交互（乐观更新/未登录引导），主 Agent 亲自完成

## 升级条件
连续 2 次验收失败 → 重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 12h　≥2h

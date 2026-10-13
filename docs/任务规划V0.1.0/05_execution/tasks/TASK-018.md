# TASK-018：UI：后台功能开关页 + 前台入口隐藏 + 功能关闭 403 态

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

## 归属
- 所属切片：S2（功能开关运行时（需求 §3.9））
- 来源需求：REQ-F-09（入口隐藏、页面 403）
- 来源方案：DESIGN-001

## 目标
/admin/feature-flags 可切换开关；关闭 ladder.station 后 SiteHeader/MobileNav 不显示「模型服务提供商」入口，直访 /providers 呈 feature-disabled 态（HTTP 403）

## 输入
- 文档：`contracts/06-ux-states.contract.ts 功能关闭态/后台功能开关`；`docs/product/design/UI设计文档.md`
- 契约：`PublicFeaturesSchema`；`FEATURE_GATES`
- 前置任务：TASK-015, TASK-016, TASK-017
- 前置状态：TASK-015、TASK-016、TASK-017 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/(admin)/admin/feature-flags/page.tsx`
  - `apps/web/components/admin/FeatureFlagsManager.tsx`
  - `apps/web/components/common/FeatureDisabled.tsx`
  - `apps/web/components/site/SiteHeader.tsx`
  - `apps/web/components/site/MobileNav.tsx`
  - `apps/web/lib/navigation.ts`
  - `受控页面 page.tsx（/providers、/evaluations/new、/models、/ladder）`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-018/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] RSC 读 getFeatureFlags（通过 API 层导出的服务函数，只读调用）
2. [ ] 导航按 FEATURE_GATES.pages 过滤
3. [ ] 受控页首行判定，关闭时渲染 FeatureDisabled 并设置 403（notFound 不适用，使用自定义 forbidden 呈现）
4. [ ] 后台页复用 AdminDataTable + Switch + ConfirmDialog（gateway.chat 关闭二次确认）
5. [ ] 全部状态带 data-testid（契约⑥）
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec tsc --noEmit` 与 `pnpm --filter web lint` 0 error
- [ ] TASK-019 e2e 全绿（独立验证者判定）
- [ ] 人工：三套浅色主题下开关页可读（对比度 ≥4.5:1）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-018/`

## 允许修改
- `apps/web/app/(admin)/admin/feature-flags/**`
- `apps/web/components/admin/FeatureFlagsManager.tsx`
- `apps/web/components/common/FeatureDisabled.tsx`
- `apps/web/components/site/SiteHeader.tsx`
- `apps/web/components/site/MobileNav.tsx`
- `apps/web/lib/navigation.ts`
- `apps/web/app/(site)/providers/page.tsx`
- `apps/web/app/(site)/evaluations/new/page.tsx`
- `apps/web/app/(site)/models/page.tsx`
- `apps/web/app/(site)/ladder/page.tsx`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-018/**`

## 禁止修改
- `apps/web/app/api/**`
- `packages/shared/**`
- `apps/web/lib/features/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-015, TASK-016, TASK-017
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-019, TASK-034
- 阻塞条件：RSC 需要的服务函数未导出 → 停止，提给 Agent-API

## 建议执行档位
opus　理由：UI 设计与交互决策（主 Agent 亲自完成）

## 升级条件
—（已为 opus）连续 2 次验收失败 → 重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 14h　≥2h

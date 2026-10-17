# TASK-017：后台菜单种子：新增「功能开关」入口（seed-navigation-menu + 默认树）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**haiku**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S2（功能开关运行时（需求 §3.9））
- 来源需求：REQ-F-09
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-042
- 来源方案：DESIGN-001

## 目标
seed-navigation-menu.ts 与 admin-nav-default-tree.ts 增 adm_feature_flags → /admin/feature-flags（requiredPermissions admin.configs.read），coverage 断言同步 +1

## 输入
- 文档：`apps/web/prisma/seed-navigation-menu.ts`；`apps/web/lib/admin-nav-default-tree.ts`
- 契约：`无`
- 前置任务：TASK-016
- 前置状态：TASK-016 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/prisma/seed-navigation-menu.ts`
  - `apps/web/lib/admin-nav-default-tree.ts`
  - `apps/web/prisma/seed-admin-nav-default.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-017/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 两处追加叶子
2. [ ] 更新 EXPECTED_HREFS 计数
3. [ ] 跑 admin-nav-default-tree.spec
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/admin-nav-default-tree.spec.ts lib/admin-navigation-core.spec.ts` 全绿
- [ ] 种子复跑 coverage 断言通过
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/admin-nav-default-tree.spec.ts lib/admin-navigation-core.spec.ts
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-017/`

## 允许修改
- `apps/web/prisma/seed-navigation-menu.ts`
- `apps/web/prisma/seed-admin-nav-default.ts`
- `apps/web/lib/admin-nav-default-tree.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-017/**`

## 禁止修改
- `apps/web/prisma/schema.prisma`
- `apps/web/prisma/migrations/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-016
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-018
- 阻塞条件：spec 文件位于 apps/web/lib/*.spec.ts（Agent-API 所有）需改 → 提给 Agent-API

## 建议执行档位
haiku　理由：追加种子行

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h

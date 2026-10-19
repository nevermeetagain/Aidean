# TASK-094：后台导航登记「模型源监控」：admin-nav 新增 /admin/monitoring 叶（权限 admin.sync.read）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**haiku**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖

> 历史（V0.4.0→V0.5.0）：V0.9.0 新增（058 nav 节点顺延）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-011 / REQ-M-013
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-011、REQ-M-013
- 来源方案：E9-10 / E9-15（058 顺延）

## 目标
admin-nav-default-tree.ts 在「同步与发现」分组新增 /admin/monitoring 叶（perms: ["admin.sync.read"]），admin-nav-default-tree.spec 叶数 32→33、只增不减断言同步

## 输入
- 文档：`docs/任务规划V0.10.0/25_执行记录.md §0.1 E9-10`
- 契约：`无`
- 前置任务：TASK-064
- 前置状态：TASK-064 页面已合并（避免 404 菜单）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/admin-nav-default-tree.ts`
  - `apps/web/lib/admin-nav-default-tree.spec.ts`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-094/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 新增叶 { code: "adm_monitoring", name: "模型源监控", href: "/admin/monitoring", perms: ["admin.sync.read"] }
2. [ ] spec：叶总数 33、EXPECTED_HREFS 含 /admin/monitoring、新增数 +3
3. [ ] pnpm db:seed 后菜单表含该行
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/admin-nav` 全绿
- [ ] 仅 isStaff 用户不可见该叶（权限门槛生效）
- [ ] `node scripts/check-docs-facts.mjs` exit 0（R10-01：本卡新增 route/page/spec 时同步期望值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/admin-nav
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-094/`

## 允许修改
- `apps/web/lib/admin-nav-default-tree.ts`
- `apps/web/lib/admin-nav-default-tree.spec.ts`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-094/**`

## 禁止修改
- `apps/web/app/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-064
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：064 未合并

## 建议执行档位
haiku　理由：单节点登记 + 计数断言同步

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 1h　<2h

# TASK-016：后台开关端点 GET/PATCH /api/v1/admin/feature-flags（审计+即时失效）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**镜像已落地·单测 PASS**｜V0.8.0 复核（c2da219）：admin/feature-flags/route.ts + [id]/route.ts；admin-feature-flags.spec.ts 通过（V0.7.0 判定：未开工）；剩余工时 0（原 4h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S2（功能开关运行时（需求 §3.9））
- 来源需求：REQ-F-09 / 需求 §3.10 管理留痕
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-042
- 来源方案：DESIGN-001

## 目标
GET 列表（admin.configs.read）、PATCH（admin.configs.write）写 AuditLog 并 revalidateTag('feature-flags')；单测覆盖权限拒绝/未知键/成功

## 输入
- 文档：`contracts/01-api.contract.ts API-003/004`；`contracts/03-identity.contract.ts AUTHZ_BOUNDARY`
- 契约：`AdminFeatureFlagSchema`；`AdminFeatureFlagPatchSchema`
- 前置任务：TASK-014, TASK-002
- 前置状态：TASK-014、TASK-002 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/admin/feature-flags/route.ts`
  - `apps/web/app/api/v1/admin/feature-flags/[id]/route.ts`
  - `apps/web/lib/features/auth/__tests__/admin-feature-flags.spec.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-016/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 参照 app/api/v1/admin/oidc-clients 写法
2. [ ] writeAudit(tableName='feature_flags')
3. [ ] revalidateTag('feature-flags')
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 单测 ≥6 例全绿
- [ ] MODERATOR PATCH → 403/10008（单测）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-feature-flags.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-016/`

## 允许修改
- `apps/web/app/api/v1/admin/feature-flags/**`
- `apps/web/lib/features/auth/__tests__/admin-feature-flags.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-016/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/lib/features/flags/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-014, TASK-002
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-017, TASK-018
- 阻塞条件：需要新权限域 → 停止（本规划裁定复用 admin.configs.*）

## 建议执行档位
sonnect　理由：标准 admin CRUD 模式（参照 admin/oidc-clients）

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 0h　<2h

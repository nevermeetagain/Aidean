# TASK-016：后台开关端点 GET/PATCH /api/v1/admin/feature-flags（审计+即时失效）

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.3.0→V0.4.0：沿用（V0.4.0 重核：bfb3aef 业务树=77c7952，无代码 delta；V0.2.0 判定 = 沿用）

## 归属
- 所属切片：S2（功能开关运行时（需求 §3.9））
- 来源需求：REQ-F-09 / 需求 §3.10 管理留痕
- RTM 追溯（V0.4.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-042
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
  - `docs/任务规划V0.4.0/06_validation/evidence/EVD-016/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.4.0/06_validation/evidence/EVD-016/`

## 允许修改
- `apps/web/app/api/v1/admin/feature-flags/**`
- `apps/web/lib/features/auth/__tests__/admin-feature-flags.spec.ts`
- `docs/任务规划V0.4.0/06_validation/evidence/EVD-016/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/lib/features/flags/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.4.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
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
小　约 4h　≥2h

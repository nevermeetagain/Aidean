# TASK-014：功能开关契约落地（码枚举/公开 DTO/后台 DTO/受控面映射）

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus**

> V0.4.0→V0.5.0：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S2（功能开关运行时（需求 §3.9））
- 来源需求：REQ-F-09 功能开关（需求 §3.9）
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-041
- 来源方案：DESIGN-001

## 目标
packages/shared/src/schemas/feature-flags.schema.ts 导出 FEATURE_FLAG_CODES/FeatureFlagCodeSchema/PublicFeaturesSchema/AdminFeatureFlagSchema/AdminFeatureFlagPatchSchema/FEATURE_GATES，单测断言 7 码与 seed 一致

## 输入
- 文档：`contracts/01-api.contract.ts §S2`；`docs/任务规划V0.5.0/03_solution/design/DESIGN-001-功能开关运行时.md`
- 契约：`FEATURE_FLAG_CODES`；`FEATURE_GATES`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/feature-flags.schema.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/feature-flags.spec.ts`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-014/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 原样落地冻结稿
2. [ ] 单测：码值集合 = seed.ts:240-248 flagCode 集合（读文件正则提取）
3. [ ] PATCH schema strict 拒未知键
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] shared tsc + test 全绿
- [ ] feature-flags.spec.ts ≥4 例
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-014/`

## 允许修改
- `packages/shared/src/schemas/feature-flags.schema.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/feature-flags.spec.ts`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-014/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-015, TASK-016
- 阻塞条件：U-7 裁决改变开关失败策略（fail-open/closed）→ 按裁决调整 DESIGN-001 后再落地

## 建议执行档位
opus　理由：定义开关受控面（哪些 API/页面受控），影响多模块

## 升级条件
需新增权限域 → 升 opus 复核 RBAC；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h

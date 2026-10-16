# TASK-044：Product.intro 契约扩展：screenshots（≤6，url/alt/caption）

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-4（截图素材）裁决后下发**

> V0.4.0→V0.5.0：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S9（子平台介绍页截图区块）
- 来源需求：未完成事项 #70 / R-84 介绍页充实
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-016
- 来源方案：SOL-S9

## 目标
ProductIntroSchema 增 screenshots?: ProductIntroScreenshotSchema[] (max 6)，旧数据 parse 不受影响（单测）

## 输入
- 文档：`packages/shared/src/schemas/admin.schema.ts:378-430`；`contracts/01-api.contract.ts §S9`
- 契约：`ProductIntroScreenshotSchema`
- 前置任务：TASK-001
- 前置状态：U-4 素材托管方式已裁决

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/admin.schema.ts`
  - `packages/shared/src/__tests__/schemas.spec.ts`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-044/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 加可选字段
2. [ ] 单测旧 intro v1/v2 样本仍通过
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] shared tsc+test 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-044/`

## 允许修改
- `packages/shared/src/schemas/admin.schema.ts`
- `packages/shared/src/__tests__/schemas.spec.ts`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-044/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-045
- 阻塞条件：U-4 未裁决 → 不执行

## 建议执行档位
sonnect　理由：向后兼容的可选字段扩展

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h

# TASK-032：搜索契约落地（search.schema.ts）

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**sonnect**

## 归属
- 所属切片：S5（顶栏全局搜索）
- 来源需求：REQ-F-15 顶栏搜索（需求 §五.2 隐含）
- 来源方案：SOL-S5

## 目标
packages/shared/src/schemas/search.schema.ts 落地并单测（q 去空白、types 解析、limit 上限）

## 输入
- 文档：`contracts/01-api.contract.ts §S5`
- 契约：`SearchQuerySchema`；`SearchResponseSchema`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并；U-5 已确认需要搜索

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/search.schema.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/search.spec.ts`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-032/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 原样落地
2. [ ] 单测
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] shared tsc+test 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-032/`

## 允许修改
- `packages/shared/src/schemas/search.schema.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/search.spec.ts`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-032/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：TASK-014, TASK-021, TASK-026
- Blocks：TASK-033
- 阻塞条件：U-5 否决 → 整刀 S5 取消

## 建议执行档位
sonnect　理由：冻结稿原样落地

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h

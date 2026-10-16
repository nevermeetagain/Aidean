# TASK-082：契约：PriceBatchUpsertSchema（rows≤500 + requestId）

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus**

> V0.4.0→V0.5.0：V0.5.0 新增（FIX-10）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-061
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-061
- 来源方案：ADR-P001 契约唯一源

## 目标
packages/shared 导出 PriceBatchUpsertSchema 与响应 DTO

## 输入
- 文档：`docs/product/design/功能设计文档.md:209-211`
- 契约：`PriceSchema（既有）`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/price-batch.schema.ts（新建）`
  - `packages/shared/src/index.ts`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-082/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 复用 PriceSchema 行定义
2. [ ] requestId=uuid
3. [ ] 导出
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit` exit 0
- [ ] `pnpm --filter @aidean/shared test` 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-082/`

## 允许修改
- `packages/shared/src/schemas/price-batch.schema.ts`
- `packages/shared/src/index.ts`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-082/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：TASK-014, TASK-021, TASK-026
- Blocks：TASK-081
- 阻塞条件：无

## 建议执行档位
opus　理由：契约唯一源

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h

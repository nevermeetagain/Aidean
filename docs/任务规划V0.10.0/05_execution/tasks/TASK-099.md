# TASK-099：llmtest 观测落库前置：reliability_observations 幂等键口径 + entityId/窗口口径裁定（文档与单测，不建迁移）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0 新增

> 历史（V0.4.0→V0.5.0）：V0.10.0 新增（review-ext12 D8/D12）

## 归属
- 所属切片：S12（密钥源 + 中转真实性 + AA 数据（条件刀））
- 来源需求：REQ-M-014
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-008
- 来源方案：review-ext12 D8/D12

## 目标
llmtest-observations 映射：entityId 只用平台实体 id（站点 id），域名进 meta；窗口按 Asia/Shanghai 自然日；score/isAlive 字段语义与 ReliabilityObservation 契约逐字段对齐；落库幂等键缺失（无 (entityType, entityId, windowStart) 唯一约束）登记为 TASK-071 前置（迁移归 Hark）

## 输入
- 文档：`docs/任务规划V0.9.0/06_validation/evidence/EVD-073/`
- 契约：`ReliabilityObservation（07-monitoring）`
- 前置任务：无
- 前置状态：TASK-073 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/discovery/llmtest-observations.ts`
  - `apps/web/lib/discovery/llmtest.spec.ts`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-099/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] entityId 改用站点 id 映射（无映射 → 跳过并计数）
2. [ ] 窗口改上海自然日
3. [ ] 单测更新
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] llmtest 单测全绿
- [ ] web tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/discovery/llmtest && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-099/`

## 允许修改
- `apps/web/lib/discovery/llmtest-observations.ts`
- `apps/web/lib/discovery/llmtest.spec.ts`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-099/**`

## 禁止修改
- `apps/web/prisma/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：需改契约字段 → 停

## 建议执行档位
sonnect　理由：映射口径修正

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h

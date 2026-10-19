# TASK-071：可用性与中转真实性探针：最小请求探测 → ReliabilityObservation + 身份信号（含 Claude thinking signature 检查）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus** ｜ **条件卡：待 U-M3（中转探针真实调用预算）裁决后下发**

> V0.10.0 状态：**条件·待裁决**｜V0.10.0：条件卡，待 U-M3 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S12（密钥源 + 中转真实性 + AA 数据（条件刀））
- 来源需求：REQ-M-008/015/016
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-008、REQ-M-016
- 来源方案：DESIGN-004 / ADR-P007

## 目标
lib/monitoring/probe/ 对 enabled 中转源按预算执行最小请求（max_tokens≤16）记录延迟/成功率写 ReliabilityObservation；对声称 Claude 的模型做 thinking signature 存在性检查，结果仅作「身份信号」，不得据此自动下架或 promote

## 输入
- 文档：`docs/任务规划V0.10.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/任务规划V0.10.0/19_外部来源核验证据.md（Veridrop 方法与 AGPL 许可）`
- 契约：`AvailabilityProbeResultSchema`
- 前置任务：TASK-070
- 前置状态：U-M3 已裁决（预算/是否允许真实调用）；TASK-070 已合并；reliability_observations 需新增 (entity_type, entity_id, window_start) 唯一约束（迁移由 Hark 在本卡前补，review-ext12 D8）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/monitoring/probe/`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-071/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 每源每日预算上限（env MONITOR_PROBE_DAILY_BUDGET_USD），超限即停
2. [ ] 不引入 Veridrop 代码（AGPL-3.0），仅参考公开方法自研
3. [ ] 结果写 ReliabilityObservation(entityType='station')
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿（mock fetch）
- [ ] 预算超限用例断言不再发请求
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/probe && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-071/`

## 允许修改
- `apps/web/lib/monitoring/probe/`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-071/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-070
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-M3 未裁决 → 不执行（条件卡）

## 建议执行档位
opus　理由：涉及真实付费调用、反伪造判定逻辑与误报风险，高难度

## 升级条件
误报争议 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 10h　≥2h

# TASK-061：变更检测：快照 diff → catalog_change_events（新上架/下架/价格变动/新模型首次出现）+ 证据链

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-004/005/008
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-005、REQ-M-008
- 来源方案：DESIGN-004 / ADR-P007

## 目标
lib/monitoring/diff/ 对同源相邻两次快照产出 4 类事件（listed/delisted/price_changed/model_first_seen），每条事件携带 sourceKey、snapshotId、sourceUrl、before/after，价格变动阈值 ≥1% 才记

## 输入
- 文档：`docs/任务规划V0.7.0/03_solution/design/DESIGN-004-模型源监控体系.md`
- 契约：`CatalogChangeEventSchema`
- 前置任务：TASK-059, TASK-060
- 前置状态：TASK-059、TASK-060 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/monitoring/diff/detect.ts`
  - `apps/web/lib/monitoring/diff/persist.ts`
  - `apps/web/lib/monitoring/diff/__tests__/detect.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-061/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] detect(prev, curr) 纯函数（按 externalModelId 对齐）
2. [ ] model_first_seen：externalModelId 规范化后在全部源观测中首次出现
3. [ ] persist：事件写 catalog_change_events，并为 model_first_seen 写 EvidenceChain(evidenceType='discovery', source='aggregator', sourceUrl)
4. [ ] 单测：4 类事件 + 阈值边界 0.99%/1%
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/monitoring/diff` 全绿
- [ ] 事件均可被 CatalogChangeEventSchema.parse
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/diff && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-061/`

## 允许修改
- `apps/web/lib/monitoring/diff/`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-061/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-059, TASK-060
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-062, TASK-063
- 阻塞条件：无

## 建议执行档位
sonnect　理由：纯函数 diff + 写事件，规则在 DESIGN-004 已冻结

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h

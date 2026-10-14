# TASK-066：公开 API：GET /api/v1/models/{id}/offerings（该模型在各监控源的上架与原币价格，含来源与采集时间）

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.3.0→V0.4.0：新增（V0.4.0 模型源监控）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-006/007/014
- RTM 追溯（V0.4.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-006、REQ-M-014
- 来源方案：DESIGN-004 / ADR-P007

## 目标
按 AiModel.code ↔ observation.normalizedModelId 匹配，返回 {items:[{sourceKey,tier,isListed,priceInputUsdPer1M,priceOutputUsdPer1M,firstSeenAt,lastSeenAt,sourceUrl}]}；中转源（kind=relay）条目必须带 identityVerified=false 标志

## 输入
- 文档：`docs/任务规划V0.4.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/07-monitoring.contract.ts`
- 契约：`ModelOfferingsResponse`
- 前置任务：TASK-059, TASK-056
- 前置状态：TASK-059 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/models/[id]/offerings/route.ts`
  - `apps/web/lib/monitoring/__tests__/offerings-route.spec.ts`
  - `docs/任务规划V0.4.0/06_validation/evidence/EVD-066/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 只返回 monitoring_sources.tos_status ∈ {allowed, attribution_required} 的源（pending 源仅后台可见，ADR-P007）；attribution_required 源填 attribution
2. [ ] PUBLIC 鉴权；Redis 缓存 600s（键 cache:model-offerings:<id>，沿用 05-events 缓存标签规则）
3. [ ] 未知模型 → MODEL_NOT_FOUND 20001
4. [ ] 按 tier 排序 S1>S2>A>B>C
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 路由单测全绿（含 20001、relay 标志用例）
- [ ] 响应 parse 通过
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/__tests__/offerings-route.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.4.0/06_validation/evidence/EVD-066/`

## 允许修改
- `apps/web/app/api/v1/models/[id]/offerings/`
- `apps/web/lib/monitoring/__tests__/offerings-route.spec.ts`
- `docs/任务规划V0.4.0/06_validation/evidence/EVD-066/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.4.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-059, TASK-056
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-067
- 阻塞条件：无

## 建议执行档位
sonnect　理由：只读查询路由，契约冻结

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h

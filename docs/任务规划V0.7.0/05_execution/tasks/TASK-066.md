# TASK-066：扩展既有 GET /api/v1/models/[id]/stations：追加各监控源上架状态与原币价格（向后兼容，不新建 offerings 端点）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-02 已有 /api/v1/models/[id]/stations 与详情页「提供商与折扣价」区块 → 改为扩展既有接口（兼容旧字段），由 Hark 设计并实现，避免重复建设

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-006/007/014
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-006、REQ-M-014
- 来源方案：DESIGN-004 / ADR-P007

## 目标
按 AiModel.code ↔ observation.normalizedModelId 匹配，返回 {items:[{sourceKey,tier,isListed,priceInputUsdPer1M,priceOutputUsdPer1M,firstSeenAt,lastSeenAt,sourceUrl}]}；中转源（kind=relay）条目必须带 identityVerified=false 标志

## 输入
- 文档：`docs/任务规划V0.7.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/07-monitoring.contract.ts`
- 契约：`ModelOfferingsResponse`
- 前置任务：TASK-059, TASK-056
- 前置状态：TASK-059 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/models/[id]/offerings/route.ts`
  - `apps/web/lib/monitoring/__tests__/offerings-route.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-066/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 读取既有 route.ts:1-37 响应形状，新增字段只追加不改名
2. [ ] 数据来自 059 写入的 ProviderModelObservation 最新行
3. [ ] 单测覆盖：旧字段不变 / 新字段存在 / 无观测时为空数组
4. [ ] 运行「验证命令」并将完整输出存入证据目录

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
`docs/任务规划V0.7.0/06_validation/evidence/EVD-066/`

## 允许修改
- `apps/web/app/api/v1/models/[id]/stations/`
- `apps/web/lib/monitoring/__tests__/offerings-route.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-066/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-059, TASK-056
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-067
- 阻塞条件：无

## 建议执行档位
opus　理由：既有公开接口的兼容扩展（不得破坏旧字段），属契约兼容决策

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h

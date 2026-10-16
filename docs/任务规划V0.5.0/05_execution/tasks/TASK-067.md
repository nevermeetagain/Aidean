# TASK-067：前台 UI：模型详情页「在哪里可调用」区块（多源上架/价格对比/中转风险提示/来源署名）

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.4.0→V0.5.0：V0.5.0 修正：FIX-02 改造既有「提供商与折扣价」区块（page.tsx:246-290），不另起区块

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-006/007/014/015
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-006、REQ-M-014、REQ-M-015
- 来源方案：DESIGN-004 / ADR-P007

## 目标
/models/[slug] 新增区块：表格列 源（tier 徽章）/上架状态/输入·输出原币价/最后采集时间/来源链接；relay 源显示「身份未验证」提示；五态齐全；数据来自 TASK-066

## 输入
- 文档：`docs/任务规划V0.5.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/06-ux-states.contract.ts`；`docs/product/design/UI设计文档.md`
- 契约：`ModelOfferingsResponse`；`MONITORING_UX_STATES`
- 前置任务：TASK-066
- 前置状态：TASK-066 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/models/ModelOfferings.tsx（新建）`
  - `apps/web/app/(site)/models/[slug]/page.tsx（挂载区块）`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-067/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 在 page.tsx:246-290 既有区块内扩展多源列，不新增并列区块
2. [ ] 价格以原币 USD/1M 显示并标注来源，不做汇率换算（U-15 未决前不得出现 ¥ 换算值）
3. [ ] 若数据含 Artificial Analysis 来源，区块底部显示署名链接（ADR-P007）
4. [ ] testid：offerings-empty/loading/error/ready
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] tsc exit 0；lint 0 error
- [ ] next build 通过
- [ ] 人工：桌面/移动截图存证；relay 提示可见
- [ ] UI 行为以 e2e 用例断言（`pnpm test:e2e -g` 对应用例全绿），不得以组件单测替代——vitest 不收集 components/**
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && cd apps/web && npx next build
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-067/`

## 允许修改
- `apps/web/components/models/ModelOfferings.tsx`
- `apps/web/app/(site)/models/[slug]/page.tsx`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-067/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-066
- 资源锁串行（同文件，须在其后执行）：TASK-023, TASK-029
- Blocks：TASK-074
- 阻塞条件：无

## 建议执行档位
opus　理由：用户可见 UI 设计与实现（用户指令：UI 由主 Agent 完成）

## 升级条件
设计与天梯模块口径冲突 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 8h　≥2h

# TASK-052：RC-02 遗留文档闭环：发布环境契约 + 发布回滚与恢复验收

> 版本: v0.2 | 更新: 2026-10-14 | 变更: 任务规划V0.2.0（基于 main@59e83dd 复核；未实现需求核查/统一规划体系）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-3（生产部署资源）裁决后下发**

> V0.1.0→V0.2.0：新增：V0.2.0 核查 specs 未勾项发现 RC-02 文档交付物（C4/C5）从未成文

## 归属
- 所属切片：S8（生产部署实弹（含 RC-02 文档闭环））
- 来源需求：REQ-NF-02 可运维 / harden-rc02-standalone-address checklist C4/C5（未勾）
- RTM 追溯（V0.2.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-004、REQ-NF-009、REQ-L-008
- 来源方案：SOL-S8

## 目标
docs/engineering/发布环境契约.md（env 五件套、NEXT_PUBLIC_SITE_URL 构建期注入、端口 3000）与 docs/engineering/发布回滚与恢复验收.md（引用 TASK-042 演练 diff=0 证据）成文并登记文档索引；RC-02 checklist 中代码侧已满足项按证据补勾

## 输入
- 文档：`docs/specs/harden-rc02-standalone-address/spec.md`；`apps/web/middleware.ts:65（RC-02 已落码）`；`apps/web/app/oauth/authorize/route.ts:80-86`
- 契约：`contracts/04-resources.contract.ts（公开基址规则）`
- 前置任务：TASK-042
- 前置状态：TASK-042 已合并

## 输出
- 新增/修改的文件路径：
  - `docs/engineering/发布环境契约.md（新建）`
  - `docs/engineering/发布回滚与恢复验收.md（新建）`
  - `docs/specs/harden-rc02-standalone-address/checklist.md`
  - `docs/文档索引.md`
  - `docs/任务规划V0.2.0/06_validation/evidence/EVD-052/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 成文两份
2. [ ] checklist A1 依代码证据补勾，B/C 段需运行态项保持未勾并注明
3. [ ] 文档索引登记
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] check-docs-rule exit 0
- [ ] 两文档带版本头且登记索引
- [ ] checklist 每个补勾项附证据路径
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs
```

## 证据路径
`docs/任务规划V0.2.0/06_validation/evidence/EVD-052/`

## 允许修改
- `docs/engineering/发布环境契约.md`
- `docs/engineering/发布回滚与恢复验收.md`
- `docs/specs/harden-rc02-standalone-address/checklist.md`
- `docs/文档索引.md`
- `docs/任务规划V0.2.0/06_validation/evidence/EVD-052/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.2.0/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.2.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/**（上一版规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-042
- 资源锁串行（同文件，须在其后执行）：TASK-020, TASK-025, TASK-031, TASK-036
- Blocks：无
- 阻塞条件：无

## 建议执行档位
sonnect　理由：以既有 RC-02 spec 与 TASK-042 演练证据成文

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 4h　≥2h

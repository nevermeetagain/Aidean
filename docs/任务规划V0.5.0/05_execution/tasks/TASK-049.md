# TASK-049：存量价格行口径盘点脚本（只读：币种×计价单位×来源）

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.4.0→V0.5.0：V0.5.0 修正：FIX-19 去掉对 006 的依赖（只需 DATABASE_URL）；grep 验收改为「文件存在 ∧ grep exit=1」

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b（为 U-15 裁决提供数据）
- RTM 追溯（V0.5.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：ADR-P005

## 目标
`node scripts/audit/price-normalization-audit.mjs` 对任意库输出 model_prices 中 is_current=true 行按 billing_currency × billing_unit × source_type 的计数表与 5 条样例，退出码恒 0

## 输入
- 文档：`03_solution/decisions/ADR-P005-计价口径归一.md`
- 契约：`无（只读盘点）`
- 前置任务：无
- 前置状态：TASK-006 已合并（CI 有 seed 后的 PG16）

## 输出
- 新增/修改的文件路径：
  - `scripts/audit/price-normalization-audit.mjs（新建）`
  - `docs/任务规划V0.5.0/06_validation/evidence/EVD-049/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 用 @prisma/client 只读查询（无写语句；脚本内 grep 自检无 create/update/delete）
2. [ ] 输出 markdown 表到 stdout
3. [ ] 在 CI seed 后库运行一次并存证
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] seed 后库输出含 USD 与 CNY 两行，合计 = is_current 行总数
- [ ] `test -f scripts/audit/price-unit-census.mjs` exit 0 且对其 grep 违规模式 exit=1（exit=2 视为失败）
- [ ] 输出按 (priceCurrency, billingUnit, source) 三维分组计数
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/audit/price-normalization-audit.mjs
```

## 证据路径
`docs/任务规划V0.5.0/06_validation/evidence/EVD-049/`

## 允许修改
- `scripts/audit/**`
- `docs/任务规划V0.5.0/06_validation/evidence/EVD-049/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无 DATABASE_URL → 打印用法后 exit 0 并在证据注明

## 建议执行档位
sonnect　理由：只读统计脚本

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h

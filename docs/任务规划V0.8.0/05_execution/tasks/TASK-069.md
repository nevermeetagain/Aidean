# TASK-069：发现引擎汇率统一：pricing-extraction.ts 硬编码 7.2 → 读 system_configs pricing.fxUsdCny

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.8.0 状态：**条件·待裁决**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：条件·待裁决）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-F-02b（计价口径）/ REQ-M-007
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-007
- 来源方案：DESIGN-004 / ADR-P007

## 目标
apps/web/lib/discovery/pricing-extraction.ts:217-243 四处 7.2 全部改为注入的 fx（来自 pricing.fxUsdCny，缺失时抛 GATEWAY_NO_ROUTE 语义的可识别错误并跳过写 PriceRule）

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/decisions/ADR-P005-计价口径归一.md`
- 契约：`FxConfigSchema`
- 前置任务：TASK-055
- 前置状态：TASK-055 已合并（fx 种子）；U-15 已裁决

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/discovery/pricing-extraction.ts`
  - `apps/web/lib/discovery/__tests__/pricing-extraction-fx.spec.ts（新建）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-069/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 抽出 toMinorCny(value, unit, fx) 纯函数
2. [ ] 调用方读取 SystemConfig（复用既有 config 读取工具）
3. [ ] 单测：fx=5 与 fx=7.2 两组 + 缺失 fx
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `grep -n '7\.2' apps/web/lib/discovery/pricing-extraction.ts` 无输出
- [ ] vitest 全绿
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
! grep -n '7\.2' apps/web/lib/discovery/pricing-extraction.ts && pnpm --filter web exec vitest run lib/discovery && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-069/`

## 允许修改
- `apps/web/lib/discovery/pricing-extraction.ts`
- `apps/web/lib/discovery/__tests__/pricing-extraction-fx.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-069/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-055
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-15 未裁决 → 不执行（条件卡）

## 建议执行档位
sonnect　理由：单文件常量替换 + 单测

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h

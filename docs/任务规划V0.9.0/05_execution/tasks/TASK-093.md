# TASK-093：天梯读侧改用生效价：ladder 矩阵/详情的价格读取改走 resolveEffectivePrice（优惠期显示优惠价）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.9.0 状态：**未开工**｜V0.9.0 新增

> 历史（V0.4.0→V0.5.0）：V0.9.0 新增（STEP-2 审查：ladder 读 isCurrent 价无卡承接）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-038 / REQ-F-063
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038、REQ-F-063
- 来源方案：DESIGN-002 §2 接入点；V0.9.0 STEP-2 审查缺口

## 目标
apps/web/lib/features/ladder/repository.ts 中读 isCurrent 价格的 3 处（:27/:38/:180）改为生效价（窗口内 PROMOTION 优先，否则 isCurrent），返回形状不变；单测覆盖优惠期/窗口外

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-002-限时优惠计费.md`；`apps/web/lib/features/pricing/effective-price.ts`
- 契约：`EffectivePriceSchema`
- 前置任务：无
- 前置状态：TASK-027 已完成（V0.9.0）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/ladder/repository.ts`
  - `apps/web/lib/features/ladder/__tests__/ladder-effective-price.spec.ts`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-093/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 以 effectivePriceWhere(at) + pickEffectivePrice 替换 `prices: { where: { isCurrent: true }, take: 1 }` 三处，保持返回字段与 Decimal 精度
2. [ ] 补单测：优惠窗口内天梯价=优惠价、窗口外=当前价、无价=null
3. [ ] ladder 既有 __tests__ 全绿
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] ladder 相关 vitest 全绿
- [ ] 新单测 ≥3 例
- [ ] web tsc exit 0
- [ ] diff 仅落在允许范围
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/ladder && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-093/`

## 允许修改
- `apps/web/lib/features/ladder/repository.ts`
- `apps/web/lib/features/ladder/__tests__/ladder-effective-price.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-093/**`

## 禁止修改
- `apps/web/lib/features/pricing/**（只读复用）`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-029
- 阻塞条件：无

## 建议执行档位
sonnect　理由：读侧替换，规则已由 027 冻结

## 升级条件
排名算法依赖价格字段且口径需变 → 停，回报 Hark；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h

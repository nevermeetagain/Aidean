# TASK-055：种子：系统配置新增 pricing.fxUsdCny 默认行（值取 U-15 裁决）

> **2026-10-20 变更（27_核心与非核心重划分）**：取代——由 TASK-101 每日汇率采集替代，本卡不执行

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**haiku** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.10.0 状态：**条件·待裁决**｜V0.10.0：条件卡，待 U-15 裁决

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-20 依赖 047；验收加「键存在于 ADMIN_CONFIG_REGISTRY」

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-011 计价口径归一（汇率默认值）
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：ADR-P005

## 目标
apps/web/prisma/seed.ts systemConfigsData 追加 {configKey:'pricing.fxUsdCny', configGroup:'pricing', configValue:<U-15 裁决值>}，db:seed 幂等复跑后该行存在

## 输入
- 文档：`03_solution/decisions/ADR-P005-计价口径归一.md`；`apps/web/lib/features/auth/__tests__/admin-config-seed-parity.spec.ts（registry⊆seed 守卫）`
- 契约：`PRICE_NORMALIZATION.FX_CONFIG_KEY`
- 前置任务：TASK-047
- 前置状态：U-15 已裁决（给出汇率数值）

## 输出
- 新增/修改的文件路径：
  - `apps/web/prisma/seed.ts`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-055/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 在 systemConfigsData 追加一行（configType 与 047 的 registry 条目一致：STRING，值为十进制字符串）
2. [ ] 本地 db:seed 两次
3. [ ] 运行 parity 守卫
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `grep -n "pricing.fxUsdCny" apps/web/prisma/seed.ts` 恰 1 行
- [ ] `pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-config-seed-parity.spec.ts` 通过
- [ ] 新增 seed 键全部存在于 ADMIN_CONFIG_REGISTRY（反向校验，admin-config-seed-parity 只覆盖 registry→seed）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-config-seed-parity.spec.ts
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-055/`

## 允许修改
- `apps/web/prisma/seed.ts`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-055/**`

## 禁止修改
- `apps/web/prisma/schema.prisma`
- `apps/web/prisma/migrations/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-047
- 资源锁串行（同文件，须在其后执行）：TASK-008
- Blocks：TASK-069
- 阻塞条件：U-15 未裁决 → 不执行（条件卡）

## 建议执行档位
haiku　理由：seed 单行数据追加

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 1h　<2h

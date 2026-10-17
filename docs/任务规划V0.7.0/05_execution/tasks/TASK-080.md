# TASK-080：缓存命中 token 计价（priceCache / discountCache）接入网关扣费

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-15 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-09）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-060
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-060
- 来源方案：ADR-P005 计价口径归一；功能设计文档 D.4

## 目标
cachedTokens 按缓存价计费（无缓存价时按输入价），单测覆盖三种组合

## 输入
- 文档：`docs/product/design/功能设计文档.md:322-324`；`apps/web/lib/features/gateway/service.ts:681-704,712-860`
- 契约：`EffectivePrice（026）`
- 前置任务：TASK-048
- 前置状态：TASK-048 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/gateway/service.ts`
  - `apps/web/lib/features/gateway/__tests__/cache-billing.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-080/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 预估与结算两处均纳入 cachedTokens
2. [ ] 缓存价缺失回退输入价并记录
3. [ ] 单测：有缓存价/无缓存价/cachedTokens=0
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿
- [ ] 既有网关用例数不减
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/gateway && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-080/`

## 允许修改
- `apps/web/lib/features/gateway/service.ts`
- `apps/web/lib/features/gateway/__tests__/cache-billing.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-080/**`

## 禁止修改
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-048
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-15 未裁决

## 建议执行档位
opus　理由：资金路径

## 升级条件
需新增价格字段 → 升 fable；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h

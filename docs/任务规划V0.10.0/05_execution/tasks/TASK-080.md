# TASK-080：缓存命中 token 计价（priceCache / discountCache）接入网关扣费

> **2026-10-20 完成（Hark）**：新增 chargeUsageMinor（service.ts）统一非流式与流式透传结算；OpenAI/DeepSeek/Gemini 的 cached 含于 prompt，Anthropic 的 cache_read 另计（此前漏计）；缓存价缺失回退输入价并记 info；预扣仍按全量输入价估算（cached 事前未知，保守上界）。缓存写入（cache_creation_input_tokens）暂按未计，另行立卡。证据 EVD-080。

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.10.0 状态：**条件·待裁决**｜V0.10.0：条件卡，待 U-15 裁决

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-09）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-060
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-060
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
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-080/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.10.0/06_validation/evidence/EVD-080/`

## 允许修改
- `apps/web/lib/features/gateway/service.ts`
- `apps/web/lib/features/gateway/__tests__/cache-billing.spec.ts`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-080/**`

## 禁止修改
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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

# TASK-030：计费集成 e2e：优惠窗口内按优惠价扣费、窗外按原价

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖；029 已完成（EVD-029 运行态 7/7）；优惠自然起止页面最多 5 分钟滞后（097 ISR 300s），e2e 需按此等待或直接断言 API/计费

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-12 / REQ-F-07
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038
- 来源方案：DESIGN-002

## 目标
e2e/tests/promotion-billing.spec.ts：建优惠（priceInput=0）→ 网关调用 → 用户余额不变且 usage_log quotaMinor=0 → 删除优惠 → 再调用 → 按原价扣费（逐分断言）

## 输入
- 文档：`e2e/tests/gateway-flow.spec.ts（参照）`
- 契约：`EffectivePriceSchema`；`PromotionPriceCreateSchema`
- 前置任务：TASK-006
- 前置状态：TASK-029 已合并；CI 注入 AIDEAN_ENABLE_MOCK_UPSTREAM=1

## 输出
- 新增/修改的文件路径：
  - `e2e/tests/promotion-billing.spec.ts`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-030/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] admin 建优惠
2. [ ] 用户调网关
3. [ ] 查余额/流水
4. [ ] 清理
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test e2e/tests/promotion-billing.spec.ts --config e2e/playwright.config.ts --workers=1` 通过（TASK-037 收敛后改为根配置）
- [ ] `node scripts/check-docs-facts.mjs` exit 0（R10-01：本卡新增 route/page/spec 时同步期望值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test e2e/tests/promotion-billing.spec.ts --config e2e/playwright.config.ts --workers=1
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-030/`

## 允许修改
- `e2e/tests/promotion-billing.spec.ts`
- `scripts/check-docs-facts.mjs（仅限 R10-01：同步本卡引起的 route/page/spec/lib-features 计数期望值，不改逻辑）`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-030/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-031
- 阻塞条件：mock-upstream 未在 CI 启用 → 停止交 TASK-006 补 env

## 建议执行档位
sonnect　理由：E2E 脚本（mock-upstream 已有）

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h

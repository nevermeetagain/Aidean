# TASK-015：开关服务 + 公开端点 + API 受控面接入（网关/测评/天梯站榜）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.8.0 状态：**镜像已落地·单测 PASS**｜V0.8.0 复核（c2da219）：lib/features/flags/{service,repository}.ts + system/features 公开端点 + gateway/evaluations/ladder 三路由接入；flags/route-gate spec 通过（V0.7.0 判定：未开工）；剩余工时 0（原 10h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S2（功能开关运行时（需求 §3.9））
- 来源需求：REQ-F-09
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-001、REQ-F-041
- 来源方案：DESIGN-001

## 目标
lib/features/flags 提供 getFeatureFlags()（unstable_cache tag feature-flags）与 requireFeature(code)；GET /api/v1/system/features 上线；FEATURE_GATES 中 API 在开关关闭时返回 403+50011

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-001-功能开关运行时.md`；`contracts/05-events.contract.ts CACHE_TAGS`
- 契约：`PublicFeaturesSchema`；`FEATURE_GATES`；`FEATURE_DISABLED(50011)`
- 前置任务：TASK-014, TASK-002
- 前置状态：TASK-014、TASK-002 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/flags/{repository,service}.ts（新建）`
  - `apps/web/lib/features/flags/__tests__/*.spec.ts`
  - `apps/web/app/api/v1/system/features/route.ts（新建）`
  - `apps/web/app/api/v1/gateway/chat/route.ts`
  - `apps/web/app/api/v1/evaluations/route.ts`
  - `apps/web/app/api/v1/ladder/route.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-015/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] repository：读 feature_flags（isEnabled + enableFrom/Until 时间窗）
2. [ ] service：DB 异常 fail-open（DESIGN-001，待 U-7 确认）并 console.error
3. [ ] requireFeature 置于 withApi handler 首行（鉴权之前，避免泄露）
4. [ ] 接入：gateway/chat POST、evaluations POST、ladder GET type=stations/models
5. [ ] 单测：开/关/时间窗/DB 异常四态
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] flags 单测 ≥8 例全绿
- [ ] web 全量 vitest 不回归
- [ ] 关闭 gateway.chat 后 POST /api/v1/gateway/chat 返回 403 且 code=50011（单测 route 级）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web test
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-015/`

## 允许修改
- `apps/web/lib/features/flags/**`
- `apps/web/app/api/v1/system/features/**`
- `apps/web/app/api/v1/gateway/chat/route.ts`
- `apps/web/app/api/v1/evaluations/route.ts`
- `apps/web/app/api/v1/ladder/route.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-015/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/lib/features/gateway/**（计费逻辑不动）`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-014, TASK-002
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-018, TASK-022
- 阻塞条件：开关读取需新增 DB 列 → 停止（禁止提前加表）

## 建议执行档位
opus　理由：触达统一计费网关与测评计费路径，跨模块高风险

## 升级条件
网关回归失败 → 立即回滚该接入点并升 opus 复审；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 0h　<2h

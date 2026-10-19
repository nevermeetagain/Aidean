# TASK-081：后台价格批量写入 POST /api/v1/admin/prices/batch-upsert（requestId 幂等）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.9.0 状态：**未开工**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-082 移出卡集

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-10）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-061
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-061
- 来源方案：功能设计文档 §209-211

## 目标
批量 upsert ≤500 行；同一 requestId 重放返回首次结果且不重复写；逐行写 audit_logs

## 输入
- 文档：`docs/product/design/功能设计文档.md:209-211`；`apps/web/app/api/v1/admin/models/batch/route.ts（参照）`
- 契约：`PriceBatchUpsertSchema（由 TASK-082 落入 shared）`
- 前置任务：TASK-028
- 前置状态：TASK-082 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/admin/prices/batch-upsert/route.ts（新建）`
  - `apps/web/lib/features/auth/__tests__/admin-prices-batch.spec.ts（新建）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-081/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] requestId 存幂等键（复用既有幂等机制，若无则停止提 ADR）；同 requestId 重放返回首次结果（replayed=true）
2. [ ] 逐行独立 upsert + writeAudit（每行各自事务；单行失败记入 failed[]，不回滚已成功行——E9-05 部分成功语义）
3. [ ] 响应满足 PriceBatchUpsertResponseSchema（total = created + updated + failed.length）；billingMode 缺省：新建 PER_TOKEN、更新保留原值
4. [ ] 单测：全成功 / 部分失败 / 重放 / 超限 501 行 / 越权 403
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿
- [ ] tsc exit 0
- [ ] 非 admin 调用返回 403
- [ ] 部分失败用例：成功行已落库且 failed[] 精确列出失败行 index
- [ ] 重放用例：第二次调用不新增价格行且 replayed=true
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-prices-batch.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-081/`

## 允许修改
- `apps/web/app/api/v1/admin/prices/batch-upsert/`
- `apps/web/lib/features/auth/__tests__/admin-prices-batch.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-081/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-028
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无既有幂等存储 → 停止提 ADR

## 建议执行档位
sonnect　理由：CRUD 扩展，幂等模式参照 models/batch

## 升级条件
需新表 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h

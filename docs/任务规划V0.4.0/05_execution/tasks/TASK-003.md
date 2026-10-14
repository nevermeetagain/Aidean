# TASK-003：新增 GET /api/v1/system/ready（DB+Redis 就绪探针）

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.3.0→V0.4.0：沿用（V0.4.0 重核：bfb3aef 业务树=77c7952，无代码 delta；V0.2.0 判定 = 沿用）

## 归属
- 所属切片：S0（步行骨架与契约守卫）
- 来源需求：REQ-NF-02 可运维性（步行骨架 health 维度；现 /system/health 仅返回 ok 不探依赖）
- RTM 追溯（V0.4.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-002
- 来源方案：SOL-S0

## 目标
DB 与 Redis 均可达时 200 + SystemReadySchema；任一不可达 503 + 错误码 50010，单测覆盖三分支

## 输入
- 文档：`contracts/01-api.contract.ts §S0`
- 契约：`SystemReadySchema`；`SERVICE_UNAVAILABLE(50010)`
- 前置任务：TASK-002
- 前置状态：TASK-002 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/system/ready/route.ts（新建）`
  - `apps/web/lib/features/system/readiness.ts（新建）`
  - `apps/web/lib/features/system/__tests__/readiness.spec.ts（新建）`
  - `docs/任务规划V0.4.0/06_validation/evidence/EVD-003/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] readiness.ts：prisma.$queryRaw`SELECT 1` 不可用（check-docs-facts 断言业务代码 $queryRaw=0）→ 改用 prisma.user.count({take:1}) 等价轻查询；Redis 用 lib/db/redis.ts 客户端 PING，各 1s 超时
2. [ ] route.ts：force-dynamic，失败抛 ApiError(50010, "依赖不可用: db|redis")
3. [ ] 单测 mock prisma/redis 覆盖 ok / db 挂 / redis 挂
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] readiness.spec.ts 3 例通过
- [ ] 本地无 DB 时 `curl -s -o /dev/null -w %{http_code} localhost:3000/api/v1/system/ready` = 503
- [ ] `grep -rn "queryRaw" apps/web/lib/features/system` 无输出（facts 门禁 queryraw-biz=0 约束；计数类断言由 TASK-009 同步）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/system && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.4.0/06_validation/evidence/EVD-003/`

## 允许修改
- `apps/web/app/api/v1/system/ready/**`
- `apps/web/lib/features/system/**`
- `docs/任务规划V0.4.0/06_validation/evidence/EVD-003/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/lib/db/**`
- `apps/web/app/api/v1/system/health/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.4.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-002
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-005, TASK-009, TASK-043
- 阻塞条件：lib/db/redis.ts 无可复用 ping 能力需改 → 停止，提给 Agent-Data

## 建议执行档位
sonnect　理由：单端点 + 单测，契约已冻结

## 升级条件
2 次验收失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 4h　≥2h

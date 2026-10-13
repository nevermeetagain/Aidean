# TASK-033：搜索 API GET /api/v1/search（模型/产品/资讯，仅已发布）

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

## 归属
- 所属切片：S5（顶栏全局搜索）
- 来源需求：REQ-F-15
- 来源方案：SOL-S5

## 目标
按契约返回分组命中；仅 AiModel 未软删且 verifiedStatus 口径一致、Product ACTIVE、NewsItem PUBLISHED；限流复用 lib/rate-limit.ts；单测 ≥8 例

## 输入
- 文档：`contracts/01-api.contract.ts API-012`
- 契约：`SearchQuerySchema`；`SearchResponseSchema`
- 前置任务：TASK-032
- 前置状态：TASK-032 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/search/**（新建）`
  - `apps/web/app/api/v1/search/route.ts`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-033/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 三路 Promise.all，contains+mode insensitive，各 take=limit
2. [ ] tookMs 计时
3. [ ] IP 级限流
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 单测 ≥8 例
- [ ] web tsc 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/search && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-033/`

## 允许修改
- `apps/web/lib/features/search/**`
- `apps/web/app/api/v1/search/**`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-033/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/prisma/**（无基线前禁止加索引/扩展）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-032
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-034
- 阻塞条件：需 pg_trgm 等扩展 → 停止（无基线禁止优化，§9.1）

## 建议执行档位
sonnect　理由：只读聚合查询

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h

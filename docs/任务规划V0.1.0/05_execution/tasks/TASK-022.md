# TASK-022：收藏 API：GET/POST /api/v1/user/favorites + DELETE /[id]

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-13
- 来源方案：SOL-S3

## 目标
三端点按契约实现：POST 幂等、目标存在性校验 20003、DELETE 非本人 40000、受 favorites.enabled 控制；repository/service/route 单测 ≥10 例

## 输入
- 文档：`contracts/01-api.contract.ts API-005..007`；`apps/web/prisma/schema.prisma model Favorite（@@unique userId,refType,refId）`
- 契约：`Favorite*`；`FAVORITE_TARGET_NOT_FOUND`
- 前置任务：TASK-021, TASK-015
- 前置状态：TASK-021、TASK-015 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/favorites/**（新建）`
  - `apps/web/app/api/v1/user/favorites/route.ts`
  - `apps/web/app/api/v1/user/favorites/[id]/route.ts`
  - `docs/任务规划V0.1.0/06_validation/evidence/EVD-022/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] repository：upsert by unique、分页 list（userId 索引已存在）、deleteMany({id,userId})
2. [ ] 目标校验：MODEL→aiModel 未软删；API_STATION→apiStation 存在且启用
3. [ ] requireFeature('favorites.enabled')
4. [ ] target 投影 {name,href,slug}，目标缺失返回 null
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] favorites 单测 ≥10 例全绿
- [ ] web tsc 0 错误
- [ ] 无 N+1：列表投影使用一次 IN 查询（单测断言 prisma 调用次数）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/favorites && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.1.0/06_validation/evidence/EVD-022/`

## 允许修改
- `apps/web/lib/features/favorites/**`
- `apps/web/app/api/v1/user/favorites/**`
- `docs/任务规划V0.1.0/06_validation/evidence/EVD-022/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.1.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-021, TASK-015
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-023
- 阻塞条件：需新增索引/列 → 停止（现索引已覆盖 userId 与唯一键）

## 建议执行档位
sonnect　理由：标准用户域 CRUD（参照 user/api-keys）

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h

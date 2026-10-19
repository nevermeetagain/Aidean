# TASK-022：收藏 API：GET/POST /api/v1/user/favorites + DELETE /[id]

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**镜像已落地·单测 PASS**｜V0.8.0 复核（c2da219）：app/api/v1/user/favorites/{route,[id]/route}.ts + lib/features/favorites/{service,repository}.ts；favorites-api.spec.ts 通过（V0.7.0 判定：未开工）；剩余工时 0（原 6h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-13
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-052
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
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-022/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.8.0/06_validation/evidence/EVD-022/`

## 允许修改
- `apps/web/lib/features/favorites/**`
- `apps/web/app/api/v1/user/favorites/**`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-022/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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
中　约 0h　<2h

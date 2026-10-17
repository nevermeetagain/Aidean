# TASK-063：管理端 API：/api/v1/admin/monitoring/{sources, sources/:key, sources/:key/run, changes}

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-009/011/012
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-009、REQ-M-011
- 来源方案：DESIGN-004 / ADR-P007

## 目标
4 端点按 07-monitoring.contract.ts 实现：GET 源列表（含健康）、PATCH 启停/cadence（仅 enabled、cadenceCron 可改）、POST run（Redis 锁防重入，202）、GET changes 分页；未授权 401/403，未知源 20004，缺凭证源 run → 50012

## 输入
- 文档：`docs/任务规划V0.7.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/07-monitoring.contract.ts`
- 契约：`AdminMonitoringSourceListResponse`；`AdminMonitoringSourcePatchBody`；`AdminMonitoringChangeQuery`；`MONITORING_ERROR_CODES`
- 前置任务：TASK-058, TASK-061
- 前置状态：TASK-058、TASK-061 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/admin/monitoring/sources/route.ts`
  - `apps/web/app/api/v1/admin/monitoring/sources/[key]/route.ts`
  - `apps/web/app/api/v1/admin/monitoring/sources/[key]/run/route.ts`
  - `apps/web/app/api/v1/admin/monitoring/changes/route.ts`
  - `apps/web/lib/monitoring/__tests__/admin-routes.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-063/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 鉴权：requireAdminApi('admin:sync:read') 读、'admin:sync:write' 写（复用既有权限码，见 03-identity）
2. [ ] run：SETNX lock:monitor:run:<key> TTL 300s；已锁返回 TOO_MANY_REQUESTS
3. [ ] changes：page/pageSize/sourceKey/kind/since 过滤，按 detectedAt desc
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/monitoring/__tests__/admin-routes.spec.ts` 全绿（含 401/403/20004/50012 用例）
- [ ] 响应均可被对应 zod Response schema parse
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/__tests__/admin-routes.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-063/`

## 允许修改
- `apps/web/app/api/v1/admin/monitoring/`
- `apps/web/lib/monitoring/__tests__/admin-routes.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-063/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-058, TASK-061
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-064
- 阻塞条件：需要新增权限码 → 停止，提 ADR（Identity 契约冻结）

## 建议执行档位
sonnect　理由：CRUD 路由，契约冻结，复用 requireAdminApi

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h

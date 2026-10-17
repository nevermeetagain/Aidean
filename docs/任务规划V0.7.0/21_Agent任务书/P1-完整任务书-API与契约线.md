# P1 完整任务书——API 与契约实现线（Agent-API / Agent-Contract 的外部卡）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 本书自包含：18 张卡（其中条件卡 6 张），合计 79h。按「序」执行（全局拓扑序）。

## 范围
你只做本书列出的卡。你的写入范围是这些卡「允许修改」的路径（属于 Agent-API：apps/web/app/api/、apps/web/lib/features/、lib/sync（不含 writers）、lib/discovery、lib/monitoring 等；以及少量 Agent-Contract 的 packages/shared/src/ 卡）。

## 0. 开工前必读（不可跳过）
1. 仓库：`https://github.com/nevermeetagain/Aidean`，分支 `main`。开工前 `git fetch && git status`，基线为 `ffa158c`（业务树=77c7952）；先确认 TASK-085（主线归一）已完成；若 HEAD 已前进，先对照本卡「验证命令」重测，不得按本书的旧结论跳过任务。
2. 读根目录 `AGENTS.md`：文档治理六条铁律（单一事实来源、双向链接、版本头 `> 版本: vX.Y | 更新: YYYY-MM-DD | 变更: …`、历史只读、技术栈锁定 Next.js 15 + PG16 + Redis + Prisma + Tailwind 4、文档即结构）与六步开发循环 PLAN→SPEC→**APPROVE**→IMPLEMENT→VERIFY→…。**未获用户 APPROVE 不得开工**（见 12_风险与待裁决.md「APPROVE」）。
3. 端口：Aidean 只用 3000–3100（默认 3000）；BotHot 回调保留 3200 段；AideanBot 3333 待 P-2 裁决。
4. 契约唯一源：`packages/shared/src/`（zod）。你不得修改契约，除非本卡就是契约卡。
5. 所有权：只改本卡「允许修改」的路径；越出 = blocked，写 ADR 草稿交 Hark，不得「先写了再说」。
6. 条件卡（标 ⛔/条件 U-*、P-*）在对应裁决给出前**不执行**。
7. 完成定义（DoD）：所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 验证命令可复现 ∧ 证据写入 `docs/任务规划V0.7.0/06_validation/evidence/EVD-<任务号>/` ∧ 不修改冻结契约。
8. 熔断：同一卡连续 2 次验收失败 → 停止改代码，写明失败原因与已尝试方案，交 Hark 重写任务书或升档；禁止第 3 次硬撞。
9. 防自证：你只负责执行与提交证据；PASS/FAIL 由独立验证者只看 diff + 运行结果判定。
10. 等待规则：卡的「Depends on」里有不属于你的卡时，必须等该卡在 main 上合并（以 `git log --grep TASK-xxx` 或其证据目录存在为准）再开工；期间先做本书中已满足依赖的后续卡。
11. 提交信息：`feat(TASK-xxx): <名称>` / `test(TASK-xxx)` / `docs(TASK-xxx)`，一卡一个或数个提交；不得夹带其他卡的改动。

## 1. 执行顺序

| 序 | 任务 | 切片 | 名称 | 档位 | 工时 | 依赖（★=他人卡，须等待） | 条件 |
|---|---|---|---|---|---|---|---|
| 1 | TASK-002 | S0 | web 侧错误码改为从 shared 重导出（消除双源） | sonnect | 3h | ★001(Hark) | — |
| 2 | TASK-003 | S0 | 新增 GET /api/v1/system/ready（DB+Redis 就绪探针） | sonnect | 4h | 002 | — |
| 3 | TASK-016 | S2 | 后台开关端点 GET/PATCH /api/v1/admin/feature-flags（审计+ | sonnect | 4h | ★014(Hark)、002 | — |
| 4 | TASK-021 | S3 | 收藏契约落地（favorites.schema.ts） | sonnect | 2h | ★001(Hark) | — |
| 5 | TASK-022 | S3 | 收藏 API：GET/POST /api/v1/user/favorites + DELETE  | sonnect | 6h | 021、★015(Hark) | — |
| 6 | TASK-028 | S4 | 后台限时优惠端点 /api/v1/admin/prices/promotions（CRUD+窗口 | opus | 6h | ★026(Hark)、★011(Hark) | — |
| 7 | TASK-032 | S5 | 搜索契约落地（search.schema.ts） | sonnect | 2h | ★001(Hark) | U-5 |
| 8 | TASK-033 | S5 | 搜索 API GET /api/v1/search（模型/产品/资讯，仅已发布） | sonnect | 5h | 032 | U-5 |
| 9 | TASK-044 | S9 | Product.intro 契约扩展：screenshots（≤6，url/alt/captio | sonnect | 2h | ★001(Hark) | U-4 |
| 10 | TASK-061 | S10 | 变更检测：快照 diff → catalog_change_events（新上架/下架/价格变动 | sonnect | 6h | ★059(P2)、★060(Hark) | — |
| 11 | TASK-063 | S10 | 管理端 API：/api/v1/admin/monitoring/{sources, sourc | sonnect | 6h | ★058(Hark)、061 | — |
| 12 | TASK-069 | S11 | 发现引擎汇率统一：pricing-extraction.ts 硬编码 7.2 → 读 syste | sonnect | 3h | ★055(P2) | U-15 |
| 13 | TASK-070 | S12 | 密钥源目录采集：SiliconFlow /v1/models、DeepSeek /models  | sonnect | 8h | ★060(Hark) | U-M1 |
| 14 | TASK-072 | S12 | Artificial Analysis Data API v2 适配器重写（/api/v2/la | sonnect | 4h | ★056(Hark) | U-M2 |
| 15 | TASK-073 | S11 | llmtest 观测入时序：composite 分数/存活/通过计数写 ReliabilityO | sonnect | 4h | ★058(Hark) | — |
| 16 | TASK-076 | S1 | 后端红线核验测试：字段所有权（sync 不覆盖人工字段）+ model_change_logs  | sonnect | 5h | ★085(Hark) | — |
| 17 | TASK-077 | S0 | OIDC 安全红线回归测试：PKCE 仅 S256 / refresh 重放撤整链 / host | sonnect | 4h | ★001(Hark) | — |
| 18 | TASK-081 | S4 | 后台价格批量写入 POST /api/v1/admin/prices/batch-upsert（ | sonnect | 5h | ★082(Hark)、028 | — |

## 2. 跨线等待
- 你要等待的他人卡：TASK-001(Hark)、TASK-011(Hark)、TASK-014(Hark)、TASK-015(Hark)、TASK-026(Hark)、TASK-055(P2)、TASK-056(Hark)、TASK-058(Hark)、TASK-059(P2)、TASK-060(Hark)、TASK-082(Hark)、TASK-085(Hark)
- 等你完成才能开工的他人卡：TASK-005(P3)、TASK-009(P2)、TASK-015(Hark)、TASK-017(P2)、TASK-018(Hark)、TASK-023(Hark)、TASK-029(Hark)、TASK-034(Hark)、TASK-043(Hark)、TASK-045(Hark)、TASK-062(P3)、TASK-064(Hark)、TASK-071(Hark)

## 3. 任务卡全文（与 05_execution/tasks/ 一致，以该目录为准）

#### TASK-002：web 侧错误码改为从 shared 重导出（消除双源）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**他线声称完成·证据不足**｜V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-002/）；镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；app/api/v1/system/ 仅 health、navigation（无 ready）。处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（含 V0.7.0 主线归一前置））
- 来源需求：REQ-NF-01
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-001
- 来源方案：ADR-P001

## 目标
apps/web/app/api/v1/_lib/errors.ts 不再定义码值，仅重导出 shared；web 全量单测与 tsc 保持全绿

## 输入
- 文档：`contracts/02-errors.contract.ts`
- 契约：`ERROR_CODES`；`DEFAULT_STATUS_BY_CODE`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/_lib/errors.ts`
  - `apps/web/app/api/v1/_lib/response.ts（如需改为 import shared 映射）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-002/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] errors.ts 中 ERROR_CODES/DEFAULT_STATUS_BY_CODE 改为 `export { ERROR_CODES, DEFAULT_STATUS_BY_CODE } from "@aidean/shared"`，保留 formatZodMessage 与 ApiError（运行时类）
2. [ ] response.ts 继续 import ./errors（路径不变，零调用方改动）
3. [ ] 运行 web tsc 与 vitest 全量
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec tsc --noEmit` 退出码 0
- [ ] `pnpm --filter web test` 1081+ 例全绿
- [ ] `grep -nE "^\s+[A-Z_]+: [0-9]{5}," apps/web/app/api/v1/_lib/errors.ts` 无输出（无本地码值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web test
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-002/`

## 允许修改
- `apps/web/app/api/v1/_lib/errors.ts`
- `apps/web/app/api/v1/_lib/response.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-002/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/app/api/v1/**/route.ts`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-003, TASK-015, TASK-016
- 阻塞条件：任何 route 因类型变化需改动 → 停止，回报 Agent-Contract

## 建议执行档位
sonnect　理由：机械重构，契约已冻结，有既有 1081 单测兜底

## 升级条件
单测失败 2 次 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-003：新增 GET /api/v1/system/ready（DB+Redis 就绪探针）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**他线声称完成·证据不足**｜V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-003/）；镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；app/api/v1/system/ 仅 health、navigation（无 ready）。处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（含 V0.7.0 主线归一前置））
- 来源需求：REQ-NF-02 可运维性（步行骨架 health 维度；现 /system/health 仅返回 ok 不探依赖）
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-002
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
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-003/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.7.0/06_validation/evidence/EVD-003/`

## 允许修改
- `apps/web/app/api/v1/system/ready/**`
- `apps/web/lib/features/system/**`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-003/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/lib/db/**`
- `apps/web/app/api/v1/system/health/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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


---

#### TASK-016：后台开关端点 GET/PATCH /api/v1/admin/feature-flags（审计+即时失效）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S2（功能开关运行时（需求 §3.9））
- 来源需求：REQ-F-09 / 需求 §3.10 管理留痕
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-042
- 来源方案：DESIGN-001

## 目标
GET 列表（admin.configs.read）、PATCH（admin.configs.write）写 AuditLog 并 revalidateTag('feature-flags')；单测覆盖权限拒绝/未知键/成功

## 输入
- 文档：`contracts/01-api.contract.ts API-003/004`；`contracts/03-identity.contract.ts AUTHZ_BOUNDARY`
- 契约：`AdminFeatureFlagSchema`；`AdminFeatureFlagPatchSchema`
- 前置任务：TASK-014, TASK-002
- 前置状态：TASK-014、TASK-002 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/admin/feature-flags/route.ts`
  - `apps/web/app/api/v1/admin/feature-flags/[id]/route.ts`
  - `apps/web/lib/features/auth/__tests__/admin-feature-flags.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-016/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 参照 app/api/v1/admin/oidc-clients 写法
2. [ ] writeAudit(tableName='feature_flags')
3. [ ] revalidateTag('feature-flags')
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 单测 ≥6 例全绿
- [ ] MODERATOR PATCH → 403/10008（单测）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-feature-flags.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-016/`

## 允许修改
- `apps/web/app/api/v1/admin/feature-flags/**`
- `apps/web/lib/features/auth/__tests__/admin-feature-flags.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-016/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/lib/features/flags/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-014, TASK-002
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-017, TASK-018
- 阻塞条件：需要新权限域 → 停止（本规划裁定复用 admin.configs.*）

## 建议执行档位
sonnect　理由：标准 admin CRUD 模式（参照 admin/oidc-clients）

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 4h　≥2h


---

#### TASK-021：收藏契约落地（favorites.schema.ts）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-13 收藏（需求 §二 免费注册用户「收藏」）
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-052
- 来源方案：SOL-S3

## 目标
packages/shared/src/schemas/favorites.schema.ts 导出 FavoriteCreate/ListQuery/Item/ListResponse/DeleteResponse，单测覆盖非法 refType 与超长 note

## 输入
- 文档：`contracts/01-api.contract.ts §S3`
- 契约：`Favorite*`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/favorites.schema.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/favorites.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-021/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 原样落地
2. [ ] 单测
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] shared tsc+test 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-021/`

## 允许修改
- `packages/shared/src/schemas/favorites.schema.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/favorites.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-021/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：TASK-014
- Blocks：TASK-022
- 阻塞条件：U-8 否决收藏 → 整刀 S3 取消

## 建议执行档位
sonnect　理由：冻结稿原样落地

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h


---

#### TASK-022：收藏 API：GET/POST /api/v1/user/favorites + DELETE /[id]

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-13
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-052
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
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-022/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.7.0/06_validation/evidence/EVD-022/`

## 允许修改
- `apps/web/lib/features/favorites/**`
- `apps/web/app/api/v1/user/favorites/**`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-022/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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


---

#### TASK-028：后台限时优惠端点 /api/v1/admin/prices/promotions（CRUD+窗口不重叠校验）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-18 契约名改为 PromotionPrice*（prices.promotions）；FIX-22 资金路径升 opus

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-12
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038
- 来源方案：DESIGN-002

## 目标
GET/POST/PATCH/DELETE 按契约实现（PromotionPrice*（packages/shared/src/schemas/promotion.schema.ts）），同模型窗口重叠 → 40000，写审计并 revalidatePath('/pricing')；单测 ≥8 例

## 输入
- 文档：`contracts/01-api.contract.ts API-008..011`
- 契约：`PromotionPriceCreateSchema`；`PromotionPricePatchSchema`
- 前置任务：TASK-026, TASK-011
- 前置状态：TASK-026、TASK-011 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/admin/prices/promotions/route.ts`
  - `apps/web/app/api/v1/admin/prices/promotions/[id]/route.ts`
  - `apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-028/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 写入 sourceType=PROMOTION, isCurrent=false
2. [ ] 重叠检测查询
3. [ ] DELETE 仅允许 PROMOTION 行
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 单测 ≥8 例全绿
- [ ] 尝试删除 OFFICIAL 行 → 40000
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-promotions.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-028/`

## 允许修改
- `apps/web/app/api/v1/admin/prices/promotions/**`
- `apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-028/**`

## 禁止修改
- `apps/web/app/api/v1/admin/prices/route.ts`
- `apps/web/app/api/v1/admin/prices/[id]/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-026, TASK-011
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-029, TASK-081
- 阻塞条件：无

## 建议执行档位
opus　理由：资金路径（优惠价直接影响扣费），按 10 号预算规则资金路径=opus

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h


---

#### TASK-032：搜索契约落地（search.schema.ts）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-5（顶栏搜索是否需要）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-5 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S5（顶栏全局搜索）
- 来源需求：REQ-F-15 顶栏搜索（需求 §五.2 隐含）
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-002
- 来源方案：SOL-S5

## 目标
packages/shared/src/schemas/search.schema.ts 落地并单测（q 去空白、types 解析、limit 上限）

## 输入
- 文档：`contracts/01-api.contract.ts §S5`
- 契约：`SearchQuerySchema`；`SearchResponseSchema`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并；U-5 已确认需要搜索

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/search.schema.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/search.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-032/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 原样落地
2. [ ] 单测
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] shared tsc+test 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-032/`

## 允许修改
- `packages/shared/src/schemas/search.schema.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/search.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-032/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：TASK-014, TASK-021, TASK-026, TASK-047, TASK-082
- Blocks：TASK-033
- 阻塞条件：U-5 否决 → 整刀 S5 取消

## 建议执行档位
sonnect　理由：冻结稿原样落地

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h


---

#### TASK-033：搜索 API GET /api/v1/search（模型/产品/资讯，仅已发布）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-5（顶栏搜索是否需要）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-5 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S5（顶栏全局搜索）
- 来源需求：REQ-F-15
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-002
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
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-033/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.7.0/06_validation/evidence/EVD-033/`

## 允许修改
- `apps/web/lib/features/search/**`
- `apps/web/app/api/v1/search/**`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-033/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/prisma/**（无基线前禁止加索引/扩展）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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


---

#### TASK-044：Product.intro 契约扩展：screenshots（≤6，url/alt/caption）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-4（截图素材）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-4 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S9（子平台介绍页截图区块）
- 来源需求：未完成事项 #70 / R-84 介绍页充实
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-016
- 来源方案：SOL-S9

## 目标
ProductIntroSchema 增 screenshots?: ProductIntroScreenshotSchema[] (max 6)，旧数据 parse 不受影响（单测）

## 输入
- 文档：`packages/shared/src/schemas/admin.schema.ts:378-430`；`contracts/01-api.contract.ts §S9`
- 契约：`ProductIntroScreenshotSchema`
- 前置任务：TASK-001
- 前置状态：U-4 素材托管方式已裁决

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/admin.schema.ts`
  - `packages/shared/src/__tests__/schemas.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-044/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 加可选字段
2. [ ] 单测旧 intro v1/v2 样本仍通过
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] shared tsc+test 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-044/`

## 允许修改
- `packages/shared/src/schemas/admin.schema.ts`
- `packages/shared/src/__tests__/schemas.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-044/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-045
- 阻塞条件：U-4 未裁决 → 不执行

## 建议执行档位
sonnect　理由：向后兼容的可选字段扩展

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h


---

#### TASK-061：变更检测：快照 diff → catalog_change_events（新上架/下架/价格变动/新模型首次出现）+ 证据链

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-004/005/008
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-005、REQ-M-008
- 来源方案：DESIGN-004 / ADR-P007

## 目标
lib/monitoring/diff/ 对同源相邻两次快照产出 4 类事件（listed/delisted/price_changed/model_first_seen），每条事件携带 sourceKey、snapshotId、sourceUrl、before/after，价格变动阈值 ≥1% 才记

## 输入
- 文档：`docs/任务规划V0.7.0/03_solution/design/DESIGN-004-模型源监控体系.md`
- 契约：`CatalogChangeEventSchema`
- 前置任务：TASK-059, TASK-060
- 前置状态：TASK-059、TASK-060 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/monitoring/diff/detect.ts`
  - `apps/web/lib/monitoring/diff/persist.ts`
  - `apps/web/lib/monitoring/diff/__tests__/detect.spec.ts`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-061/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] detect(prev, curr) 纯函数（按 externalModelId 对齐）
2. [ ] model_first_seen：externalModelId 规范化后在全部源观测中首次出现
3. [ ] persist：事件写 catalog_change_events，并为 model_first_seen 写 EvidenceChain(evidenceType='discovery', source='aggregator', sourceUrl)
4. [ ] 单测：4 类事件 + 阈值边界 0.99%/1%
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/monitoring/diff` 全绿
- [ ] 事件均可被 CatalogChangeEventSchema.parse
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/diff && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-061/`

## 允许修改
- `apps/web/lib/monitoring/diff/`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-061/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-059, TASK-060
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-062, TASK-063
- 阻塞条件：无

## 建议执行档位
sonnect　理由：纯函数 diff + 写事件，规则在 DESIGN-004 已冻结

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h


---

#### TASK-063：管理端 API：/api/v1/admin/monitoring/{sources, sources/:key, sources/:key/run, changes}

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


---

#### TASK-069：发现引擎汇率统一：pricing-extraction.ts 硬编码 7.2 → 读 system_configs pricing.fxUsdCny

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-15 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-F-02b（计价口径）/ REQ-M-007
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-007
- 来源方案：DESIGN-004 / ADR-P007

## 目标
apps/web/lib/discovery/pricing-extraction.ts:217-243 四处 7.2 全部改为注入的 fx（来自 pricing.fxUsdCny，缺失时抛 GATEWAY_NO_ROUTE 语义的可识别错误并跳过写 PriceRule）

## 输入
- 文档：`docs/任务规划V0.7.0/03_solution/decisions/ADR-P005-计价口径归一.md`
- 契约：`FxConfigSchema`
- 前置任务：TASK-055
- 前置状态：TASK-055 已合并（fx 种子）；U-15 已裁决

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/discovery/pricing-extraction.ts`
  - `apps/web/lib/discovery/__tests__/pricing-extraction-fx.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-069/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 抽出 toMinorCny(value, unit, fx) 纯函数
2. [ ] 调用方读取 SystemConfig（复用既有 config 读取工具）
3. [ ] 单测：fx=5 与 fx=7.2 两组 + 缺失 fx
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `grep -n '7\.2' apps/web/lib/discovery/pricing-extraction.ts` 无输出
- [ ] vitest 全绿
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
! grep -n '7\.2' apps/web/lib/discovery/pricing-extraction.ts && pnpm --filter web exec vitest run lib/discovery && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-069/`

## 允许修改
- `apps/web/lib/discovery/pricing-extraction.ts`
- `apps/web/lib/discovery/__tests__/pricing-extraction-fx.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-069/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-055
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-15 未裁决 → 不执行（条件卡）

## 建议执行档位
sonnect　理由：单文件常量替换 + 单测

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-070：密钥源目录采集：SiliconFlow /v1/models、DeepSeek /models 等官方/托管目录（缺凭证时健康=credential_missing）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-M1（keyed 源 API Key 提供与保管）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-M1 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 中等难度适配器，外包

## 归属
- 所属切片：S12（密钥源 + 中转真实性 + AA 数据（条件刀））
- 来源需求：REQ-M-002/010/016
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-002、REQ-M-010、REQ-M-016
- 来源方案：DESIGN-004 / ADR-P007

## 目标
lib/monitoring/keyed/ 实现 S1/S2/A 级 keyed collector（首批按 U-M1 清单），凭证仅从环境变量读取（MONITOR_KEY_<SOURCE>），日志与快照中不得出现凭证；缺凭证返回 MONITOR_SOURCE_CREDENTIAL_MISSING 而非异常

## 输入
- 文档：`docs/任务规划V0.7.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/任务规划V0.4.0/19_外部来源核验证据.md（SiliconFlow 无 key 实测 401）`
- 契约：`MonitoringSourceSchema`；`MONITORING_ERROR_CODES`
- 前置任务：TASK-060
- 前置状态：U-M1 已裁决并提供凭证；TASK-060 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/monitoring/keyed/`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-070/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 每源 collector + fixture 单测（fixture 由持 key 者一次性录制并脱敏）
2. [ ] secret-scan 规则（TASK-007）覆盖 MONITOR_KEY_ 前缀
3. [ ] SiliconFlow 仅返回 id/object/owned_by（实测文档），价格不从该接口取
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿
- [ ] `grep -rn 'sk-' apps/web/lib/monitoring/keyed` 无输出
- [ ] 缺 env 时 collector 返回 credential_missing（单测）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/keyed && node scripts/guard/secret-scan.mjs
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-070/`

## 允许修改
- `apps/web/lib/monitoring/keyed/`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-070/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-060
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-071
- 阻塞条件：U-M1 未裁决/未提供凭证 → 不执行（条件卡）

## 建议执行档位
sonnect　理由：按既有 collector 框架（060）加 keyed 源，模式已定

## 升级条件
厂商 ToS 禁止自动化列举 → 停止并回报；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 8h　≥2h


---

#### TASK-072：Artificial Analysis Data API v2 适配器重写（/api/v2/language/models/free，x-api-key，署名字段）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-M2（Artificial Analysis key 与条款）裁决后下发**

> V0.7.0 状态：**条件·待裁决**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；条件卡，待 U-M2 裁决；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S12（密钥源 + 中转真实性 + AA 数据（条件刀））
- 来源需求：REQ-M-002/015
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-015
- 来源方案：DESIGN-004 / ADR-P007

## 目标
artificial-analysis.ts 改为调用 https://artificialanalysis.ai/api/v2/language/models/free（x-api-key），移除已 404 的 /api/leaderboard 主路径；每日请求 ≤ 免费额度 100/24h；产出数据带 attribution='Artificial Analysis' + sourceUrl

## 输入
- 文档：`docs/任务规划V0.4.0/19_外部来源核验证据.md（AA 文档：Free 100 次/24h、需署名、再分发需联系）`
- 契约：`无新增（沿用 RawModelData + attribution 字段）`
- 前置任务：TASK-056
- 前置状态：U-M2 已裁决（申请 key 并接受条款）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/adapters/artificial-analysis.ts`
  - `apps/web/lib/sync/__tests__/artificial-analysis-v2.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-072/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 分页 page=1..total_pages，遵守 X-RateLimit-Remaining
2. [ ] 缺 key 时回落到既有 OpenRouter benchmarks 代理路径并标注 source='openrouter-proxy'
3. [ ] 单测 fixture 取自官方文档示例
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿
- [ ] `grep -n 'api/leaderboard' apps/web/lib/sync/adapters/artificial-analysis.ts` 无输出
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/sync/__tests__/artificial-analysis-v2.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-072/`

## 允许修改
- `apps/web/lib/sync/adapters/artificial-analysis.ts`
- `apps/web/lib/sync/__tests__/artificial-analysis-v2.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-072/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-056
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-M2 未裁决 → 不执行（条件卡）

## 建议执行档位
sonnect　理由：单适配器重写，文档已核验

## 升级条件
条款不允许展示 → 停止回报；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h


---

#### TASK-073：llmtest 观测入时序：composite 分数/存活/通过计数写 ReliabilityObservation（不再只塞 description）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-008
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-008
- 来源方案：DESIGN-004 / ADR-P007

## 目标
每次 llmtest 采集把 score/isAlive/total_checks/pass_count/last_alive_at 写 ReliabilityObservation(entityType='station' 或 candidate 关联)，窗口=采集日；保留既有候选发现行为不变

## 输入
- 文档：`apps/web/lib/discovery/llmtest.ts`；`docs/任务规划V0.4.0/19_外部来源核验证据.md（composite 实测 51 条、rank 从 2 开始）`
- 契约：`无新增`
- 前置任务：TASK-058
- 前置状态：TASK-058 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/discovery/llmtest.ts`
  - `apps/web/lib/discovery/llmtest.spec.ts`
  - `apps/web/lib/discovery/llmtest-observations.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-073/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 新增 mapLlmtestItemToObservation 纯函数
2. [ ] llmtest.spec.ts 增 3 用例（缺字段/isAlive=false/重复采集）
3. [ ] rank 缺 1 的现象记录为数据源特性，不做补齐
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/discovery/llmtest.spec.ts` 全绿
- [ ] 既有用例不变（用例数只增不减）
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/discovery/llmtest.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-073/`

## 允许修改
- `apps/web/lib/discovery/llmtest.ts`
- `apps/web/lib/discovery/llmtest.spec.ts`
- `apps/web/lib/discovery/llmtest-observations.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-073/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-058
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无

## 建议执行档位
sonnect　理由：既有映射扩展 + 单测

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h


---

#### TASK-076：后端红线核验测试：字段所有权（sync 不覆盖人工字段）+ model_change_logs 全写入面 + 通用版等级固定序

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**他线声称完成·证据不足**｜V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-076/）；镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；app/api/v1/system/ 仅 health、navigation（无 ready）。处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-04/05/11）

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性，已确认缺陷））
- 来源需求：REQ-F-054 / REQ-F-055 / REQ-F-062
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-054、REQ-F-055、REQ-F-062
- 来源方案：功能设计文档 §五 D-2=C

## 目标
vitest 用例证明：sync 写入器只 SET sync 字段；人工与 sync 写操作均写 model_change_logs；通用版等级序 Opus>Sonnet>Fable>Haiku 与专业版默认映射 1/2/3/4

## 输入
- 文档：`docs/product/design/功能设计文档.md:233-281`；`docs/product/requirements/需求文档.md:66,90-92`；`apps/web/lib/sync/writers/index.ts`；`apps/web/lib/features/admin/model-change-log.ts`
- 契约：`无新增`
- 前置任务：TASK-085
- 前置状态：无

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/admin/__tests__/field-ownership.spec.ts（新建）`
  - `apps/web/lib/features/admin/__tests__/change-log-coverage.spec.ts（新建）`
  - `apps/web/lib/features/gateway/__tests__/tier-order.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-076/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 逐字段列出 sync 字段集合与人工字段集合（来自功能设计文档表）
2. [ ] 对 writers 做 mock prisma 断言 update data 键 ⊆ sync 字段
3. [ ] 枚举全部写入面（grep modelChangeLog.create），每个写入面一条断言
4. [ ] 发现缺陷 → 记录到证据并停止，不修业务代码（另立卡）
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/features/admin/__tests__ lib/features/gateway/__tests__/tier-order.spec.ts` 全绿或失败用例已登记为缺陷
- [ ] 证据含写入面清单（文件:行）
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/admin/__tests__ lib/features/gateway/__tests__/tier-order.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-076/`

## 允许修改
- `apps/web/lib/features/admin/__tests__/field-ownership.spec.ts`
- `apps/web/lib/features/admin/__tests__/change-log-coverage.spec.ts`
- `apps/web/lib/features/gateway/__tests__/tier-order.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-076/**`

## 禁止修改
- `apps/web/lib/sync/writers/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-085
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：测试失败即业务缺陷 → 停止并登记，不得改业务代码

## 建议执行档位
sonnect　理由：只读核验 + 单测补齐，不改业务逻辑

## 升级条件
发现资金/数据覆盖缺陷 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h


---

#### TASK-077：OIDC 安全红线回归测试：PKCE 仅 S256 / refresh 重放撤整链 / host-only Cookie

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**他线声称完成·证据不足**｜V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-077/）；镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；app/api/v1/system/ 仅 health、navigation（无 ready）。处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-06）

## 归属
- 所属切片：S0（步行骨架与契约守卫（含 V0.7.0 主线归一前置））
- 来源需求：REQ-F-056
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-056
- 来源方案：子平台SSO接入指南

## 目标
三条红线各有至少一个失败路径用例：plain 被拒、重放 refresh 后整链失效、Set-Cookie 不含 Domain=

## 输入
- 文档：`docs/product/modules/子平台SSO接入指南.md:55,89,141,215-229`；`apps/web/lib/features/auth/repository.ts:59,67`
- 契约：`既有错误码（invalid_request / invalid_grant）`
- 前置任务：TASK-001
- 前置状态：无

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/auth/__tests__/oidc-redlines.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-077/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 定位 authorize/token 处理函数
2. [ ] plain → 400 invalid_request
3. [ ] 同一 refresh 用两次 → 第二次 invalid_grant 且同链 access 失效
4. [ ] Cookie 断言无 Domain 属性
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/features/auth/__tests__/oidc-redlines.spec.ts` 全绿或失败用例已登记为安全缺陷
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/oidc-redlines.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-077/`

## 允许修改
- `apps/web/lib/features/auth/__tests__/oidc-redlines.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-077/**`

## 禁止修改
- `apps/web/lib/features/auth/*.ts（只读）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：红线不成立 → 停止并登记安全缺陷，交 Hark/opus

## 建议执行档位
sonnect　理由：按接入指南写回归测试

## 升级条件
安全缺陷 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 4h　≥2h


---

#### TASK-081：后台价格批量写入 POST /api/v1/admin/prices/batch-upsert（requestId 幂等）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.7.0 状态：**未开工**｜沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-10）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-061
- RTM 追溯（V0.7.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-061
- 来源方案：功能设计文档 §209-211

## 目标
批量 upsert ≤500 行；同一 requestId 重放返回首次结果且不重复写；逐行写 audit_logs

## 输入
- 文档：`docs/product/design/功能设计文档.md:209-211`；`apps/web/app/api/v1/admin/models/batch/route.ts（参照）`
- 契约：`PriceBatchUpsertSchema（由 TASK-082 落入 shared）`
- 前置任务：TASK-082, TASK-028
- 前置状态：TASK-082 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/admin/prices/batch-upsert/route.ts（新建）`
  - `apps/web/lib/features/auth/__tests__/admin-prices-batch.spec.ts（新建）`
  - `docs/任务规划V0.7.0/06_validation/evidence/EVD-081/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] requestId 存幂等键（复用既有幂等机制，若无则停止提 ADR）
2. [ ] 事务内逐行 upsert + writeAudit
3. [ ] 单测：成功/重放/超限/越权
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿
- [ ] tsc exit 0
- [ ] 非 admin 调用返回 403
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-prices-batch.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.7.0/06_validation/evidence/EVD-081/`

## 允许修改
- `apps/web/app/api/v1/admin/prices/batch-upsert/`
- `apps/web/lib/features/auth/__tests__/admin-prices-batch.spec.ts`
- `docs/任务规划V0.7.0/06_validation/evidence/EVD-081/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-082, TASK-028
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无既有幂等存储 → 停止提 ADR

## 建议执行档位
sonnect　理由：CRUD 扩展，幂等模式参照 models/batch

## 升级条件
需新表 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h


---

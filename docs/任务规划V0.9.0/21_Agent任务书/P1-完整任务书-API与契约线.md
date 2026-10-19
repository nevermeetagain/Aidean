# P1 完整任务书——API 与契约实现线（Agent-API / Agent-Contract 的外部卡）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 本书自包含：12 张卡（其中条件卡 6 张），合计 53h。按「序」执行（全局拓扑序）。

## 范围
你只做本书列出的卡。你的写入范围是这些卡「允许修改」的路径（属于 Agent-API：apps/web/app/api/、apps/web/lib/features/、lib/sync（不含 writers）、lib/discovery、lib/monitoring 等；以及少量 Agent-Contract 的 packages/shared/src/ 卡）。

## 0. 开工前必读（不可跳过）
1. 仓库：`https://github.com/nevermeetagain/Aidean`，分支 `main`（B-0' 已裁决 A'：镜像 main 为唯一开发线，2026-10-19）。开工前 `git fetch && git status`，与 origin/main 一致后再动；V0.9.0 基线见 `25_执行记录.md` 末尾的推送 sha；若 HEAD 已前进，先对照本卡「验证命令」重测，不得按本书的旧结论跳过任务。已完成卡（089/026/082/027/056/058/060/057 及 V0.8.0 判镜像落地的 0 工时卡）不在本书，依赖它们的卡可直接开工。
2. 读根目录 `AGENTS.md`：文档治理六条铁律（单一事实来源、双向链接、版本头 `> 版本: vX.Y | 更新: YYYY-MM-DD | 变更: …`、历史只读、技术栈锁定 Next.js 15 + PG16 + Redis + Prisma + Tailwind 4、文档即结构）与六步开发循环 PLAN→SPEC→**APPROVE**→IMPLEMENT→VERIFY→…。**APPROVE 已由用户给出（2026-10-19，Hark 核心卡）；外部卡仍按各卡条件执行**（见 12_风险与待裁决.md「APPROVE」）。
3. 端口：Aidean 只用 3000–3100（默认 3000）；BotHot 回调保留 3200 段；AideanBot 3333 待 P-2 裁决。
4. 契约唯一源：`packages/shared/src/`（zod）。你不得修改契约，除非本卡就是契约卡。
5. 所有权：只改本卡「允许修改」的路径；越出 = blocked，写 ADR 草稿交 Hark，不得「先写了再说」。
6. 条件卡（标 ⛔/条件 U-*、P-*）在对应裁决给出前**不执行**。
7. 完成定义（DoD）：所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 验证命令可复现 ∧ 证据写入 `docs/任务规划V0.9.0/06_validation/evidence/EVD-<任务号>/` ∧ 不修改冻结契约。
8. 熔断：同一卡连续 2 次验收失败 → 停止改代码，写明失败原因与已尝试方案，交 Hark 重写任务书或升档；禁止第 3 次硬撞。
9. 防自证：你只负责执行与提交证据；PASS/FAIL 由独立验证者只看 diff + 运行结果判定。
10. 等待规则：卡的「Depends on」里有不属于你的卡时，必须等该卡在 main 上合并（以 `git log --grep TASK-xxx` 或其证据目录存在为准）再开工；期间先做本书中已满足依赖的后续卡。
11. 提交信息：`feat(TASK-xxx): <名称>` / `test(TASK-xxx)` / `docs(TASK-xxx)`，一卡一个或数个提交；不得夹带其他卡的改动。

## 1. 执行顺序

| 序 | 任务 | 切片 | 名称 | 档位 | 工时 | 依赖（★=他人卡，须等待） | 条件 |
|---|---|---|---|---|---|---|---|
| 1 | TASK-028 | S4 | 后台限时优惠端点 /api/v1/admin/prices/promotions（CRUD+窗口 | opus | 6h | — | — |
| 2 | TASK-032 | S5 | 搜索契约落地（search.schema.ts） | sonnect | 2h | — | U-5 |
| 3 | TASK-033 | S5 | 搜索 API GET /api/v1/search（模型/产品/资讯，仅已发布） | sonnect | 5h | 032 | U-5 |
| 4 | TASK-044 | S9 | Product.intro 契约扩展：screenshots（≤6，url/alt/captio | sonnect | 2h | — | U-4 |
| 5 | TASK-061 | S10 | 变更检测：快照 diff → catalog_change_events（新上架/下架/价格变动 | sonnect | 6h | ★059(P2) | — |
| 6 | TASK-063 | S10 | 管理端 API：/api/v1/admin/monitoring/{sources, sourc | sonnect | 6h | 061 | — |
| 7 | TASK-069 | S11 | 发现引擎汇率统一：pricing-extraction.ts 硬编码 7.2 → 读 syste | sonnect | 3h | ★055(P2) | U-15 |
| 8 | TASK-070 | S12 | 密钥源目录采集：SiliconFlow /v1/models、DeepSeek /models  | sonnect | 8h | — | U-M1 |
| 9 | TASK-072 | S12 | Artificial Analysis Data API v2 适配器重写（/api/v2/la | sonnect | 4h | — | U-M2 |
| 10 | TASK-073 | S11 | llmtest 观测入时序：composite 分数/存活/通过计数写 ReliabilityO | sonnect | 4h | — | — |
| 11 | TASK-081 | S4 | 后台价格批量写入 POST /api/v1/admin/prices/batch-upsert（ | sonnect | 5h | 028 | — |
| 12 | TASK-093 | S4 | 天梯读侧改用生效价：ladder 矩阵/详情的价格读取改走 resolveEffectivePr | sonnect | 2h | — | — |

## 2. 跨线等待
- 你要等待的他人卡：TASK-055(P2)、TASK-059(P2)
- 等你完成才能开工的他人卡：TASK-029(Hark)、TASK-034(Hark)、TASK-045(Hark)、TASK-062(P3)、TASK-064(Hark)、TASK-071(Hark)

## 3. 任务卡全文（与 05_execution/tasks/ 一致，以该目录为准）

#### TASK-028：后台限时优惠端点 /api/v1/admin/prices/promotions（CRUD+窗口不重叠校验）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-026、TASK-011 移出卡集；V0.9.0 STEP-2 审查：真库探针证实优惠行误标 isCurrent=true 时过期后会被当当前价，解析器已防御（027），写侧须在本卡根治

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-18 契约名改为 PromotionPrice*（prices.promotions）；FIX-22 资金路径升 opus

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-12
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038
- 来源方案：DESIGN-002

## 目标
GET/POST/PATCH/DELETE 按契约实现（PromotionPrice*（packages/shared/src/schemas/promotion.schema.ts）），同模型窗口重叠 → 40000，写审计并 revalidatePath('/pricing')；单测 ≥8 例

## 输入
- 文档：`contracts/01-api.contract.ts API-008..011`
- 契约：`PromotionPriceCreateSchema`；`PromotionPricePatchSchema`
- 前置任务：无
- 前置状态：TASK-026、TASK-011 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/admin/prices/promotions/route.ts`
  - `apps/web/app/api/v1/admin/prices/promotions/[id]/route.ts`
  - `apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-028/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 写入 sourceType=PROMOTION, isCurrent=false
2. [ ] 重叠检测查询
3. [ ] DELETE 仅允许 PROMOTION 行
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 单测 ≥8 例全绿
- [ ] 尝试删除 OFFICIAL 行 → 40000
- [ ] 优惠行强制 is_current=false、source_type=PROMOTION（单测：请求体无法写入 isCurrent=true）
- [ ] effectiveUntil 必填且 > effectiveFrom；与同模型既有优惠窗口重叠 → 40000
- [ ] billingCurrency / billingUnit / billingMode 与该模型当前价一致，不一致 → 40000（防 R9-04 计费口径漂移）
- [ ] 价格字符串小数位 ≤ 6（Decimal(19,6) 静默舍入防护，E9-11）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-promotions.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-028/`

## 允许修改
- `apps/web/app/api/v1/admin/prices/promotions/**`
- `apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-028/**`

## 禁止修改
- `apps/web/app/api/v1/admin/prices/route.ts`
- `apps/web/app/api/v1/admin/prices/[id]/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-5（顶栏搜索是否需要）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-001 移出卡集；条件卡，待 U-5 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S5（顶栏全局搜索）
- 来源需求：REQ-F-15 顶栏搜索（需求 §五.2 隐含）
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-002
- 来源方案：SOL-S5

## 目标
packages/shared/src/schemas/search.schema.ts 落地并单测（q 去空白、types 解析、limit 上限）

## 输入
- 文档：`contracts/01-api.contract.ts §S5`
- 契约：`SearchQuerySchema`；`SearchResponseSchema`
- 前置任务：无
- 前置状态：TASK-001 已合并；U-5 已确认需要搜索

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/search.schema.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/search.spec.ts`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-032/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-032/`

## 允许修改
- `packages/shared/src/schemas/search.schema.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/search.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-032/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：TASK-047
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-5（顶栏搜索是否需要）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；条件卡，待 U-5 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S5（顶栏全局搜索）
- 来源需求：REQ-F-15
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-002
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
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-033/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-033/`

## 允许修改
- `apps/web/lib/features/search/**`
- `apps/web/app/api/v1/search/**`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-033/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/prisma/**（无基线前禁止加索引/扩展）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-4（截图素材）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-001 移出卡集；条件卡，待 U-4 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S9（子平台介绍页截图区块）
- 来源需求：未完成事项 #70 / R-84 介绍页充实
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-016
- 来源方案：SOL-S9

## 目标
ProductIntroSchema 增 screenshots?: ProductIntroScreenshotSchema[] (max 6)，旧数据 parse 不受影响（单测）

## 输入
- 文档：`packages/shared/src/schemas/admin.schema.ts:378-430`；`contracts/01-api.contract.ts §S9`
- 契约：`ProductIntroScreenshotSchema`
- 前置任务：无
- 前置状态：U-4 素材托管方式已裁决

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/admin.schema.ts`
  - `packages/shared/src/__tests__/schemas.spec.ts`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-044/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-044/`

## 允许修改
- `packages/shared/src/schemas/admin.schema.ts`
- `packages/shared/src/__tests__/schemas.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-044/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.9.0 状态：**未开工**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-060 移出卡集；V0.9.0 STEP-4 审查：060 已交付 3 个 collector（AIHubMix 价格取 pricing_lines 默认档、计划退役不判下架，E9-16）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-004/005/008
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-005、REQ-M-008
- 来源方案：DESIGN-004 / ADR-P007

## 目标
lib/monitoring/diff/ 对同源相邻两次快照产出 4 类事件（listed/delisted/price_changed/model_first_seen），每条事件携带 sourceKey、snapshotId、sourceUrl、before/after，价格变动阈值 ≥1% 才记

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-004-模型源监控体系.md`
- 契约：`CatalogChangeEventSchema`
- 前置任务：TASK-059
- 前置状态：TASK-059、TASK-060 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/monitoring/diff/detect.ts`
  - `apps/web/lib/monitoring/diff/persist.ts`
  - `apps/web/lib/monitoring/diff/__tests__/detect.spec.ts`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-061/`（取证：命令输出/截图/日志）

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
- [ ] 同一快照内多个 external_model_id 归一到同一 normalized_model_id 时（全量实测 OpenRouter 95 组），按 (snapshot_id, normalized_model_id, kind) 合并为一条事件且证据列全部 external id；不得因唯一键冲突整批失败（单测覆盖）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/diff && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-061/`

## 允许修改
- `apps/web/lib/monitoring/diff/`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-061/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-059
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.9.0 状态：**未开工**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-058 移出卡集

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-009/011/012
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-009、REQ-M-011
- 来源方案：DESIGN-004 / ADR-P007

## 目标
4 端点按 07-monitoring.contract.ts 实现：GET 源列表（含健康）、PATCH 启停/cadence（仅 enabled、cadenceCron 可改）、POST run（Redis 锁防重入，202）、GET changes 分页；未授权 401/403，未知源 20004，缺凭证源 run → 50012

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/07-monitoring.contract.ts`
- 契约：`AdminMonitoringSourceListResponse`；`AdminMonitoringSourcePatchBody`；`AdminMonitoringChangeQuery`；`MONITORING_ERROR_CODES`
- 前置任务：TASK-061
- 前置状态：TASK-059、TASK-061 已合并；TASK-090 已在 API接口文档 §4 登记 20004/50012（先登记后实现，E9-15）

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/admin/monitoring/sources/route.ts`
  - `apps/web/app/api/v1/admin/monitoring/sources/[key]/route.ts`
  - `apps/web/app/api/v1/admin/monitoring/sources/[key]/run/route.ts`
  - `apps/web/app/api/v1/admin/monitoring/changes/route.ts`
  - `apps/web/lib/monitoring/__tests__/admin-routes.spec.ts`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-063/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-063/`

## 允许修改
- `apps/web/app/api/v1/admin/monitoring/`
- `apps/web/lib/monitoring/__tests__/admin-routes.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-063/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-061
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；条件卡，待 U-15 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-F-02b（计价口径）/ REQ-M-007
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-007
- 来源方案：DESIGN-004 / ADR-P007

## 目标
apps/web/lib/discovery/pricing-extraction.ts:217-243 四处 7.2 全部改为注入的 fx（来自 pricing.fxUsdCny，缺失时抛 GATEWAY_NO_ROUTE 语义的可识别错误并跳过写 PriceRule）

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/decisions/ADR-P005-计价口径归一.md`
- 契约：`FxConfigSchema`
- 前置任务：TASK-055
- 前置状态：TASK-055 已合并（fx 种子）；U-15 已裁决

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/discovery/pricing-extraction.ts`
  - `apps/web/lib/discovery/__tests__/pricing-extraction-fx.spec.ts（新建）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-069/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-069/`

## 允许修改
- `apps/web/lib/discovery/pricing-extraction.ts`
- `apps/web/lib/discovery/__tests__/pricing-extraction-fx.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-069/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-M1（keyed 源 API Key 提供与保管）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-060 移出卡集；条件卡，待 U-M1 裁决

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 中等难度适配器，外包

## 归属
- 所属切片：S12（密钥源 + 中转真实性 + AA 数据（条件刀））
- 来源需求：REQ-M-002/010/016
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-002、REQ-M-010、REQ-M-016
- 来源方案：DESIGN-004 / ADR-P007

## 目标
lib/monitoring/keyed/ 实现 S1/S2/A 级 keyed collector（首批按 U-M1 清单），凭证仅从环境变量读取（MONITOR_KEY_<SOURCE>），日志与快照中不得出现凭证；缺凭证返回 MONITOR_SOURCE_CREDENTIAL_MISSING 而非异常

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/任务规划V0.4.0/19_外部来源核验证据.md（SiliconFlow 无 key 实测 401）`
- 契约：`MonitoringSourceSchema`；`MONITORING_ERROR_CODES`
- 前置任务：无
- 前置状态：U-M1 已裁决并提供凭证；TASK-060 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/monitoring/keyed/`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-070/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-070/`

## 允许修改
- `apps/web/lib/monitoring/keyed/`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-070/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-M2（Artificial Analysis key 与条款）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-056 移出卡集；条件卡，待 U-M2 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S12（密钥源 + 中转真实性 + AA 数据（条件刀））
- 来源需求：REQ-M-002/015
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-015
- 来源方案：DESIGN-004 / ADR-P007

## 目标
artificial-analysis.ts 改为调用 https://artificialanalysis.ai/api/v2/language/models/free（x-api-key），移除已 404 的 /api/leaderboard 主路径；每日请求 ≤ 免费额度 100/24h；产出数据带 attribution='Artificial Analysis' + sourceUrl

## 输入
- 文档：`docs/任务规划V0.4.0/19_外部来源核验证据.md（AA 文档：Free 100 次/24h、需署名、再分发需联系）`
- 契约：`无新增（沿用 RawModelData + attribution 字段）`
- 前置任务：无
- 前置状态：U-M2 已裁决（申请 key 并接受条款）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/adapters/artificial-analysis.ts`
  - `apps/web/lib/sync/__tests__/artificial-analysis-v2.spec.ts（新建）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-072/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-072/`

## 允许修改
- `apps/web/lib/sync/adapters/artificial-analysis.ts`
- `apps/web/lib/sync/__tests__/artificial-analysis-v2.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-072/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.9.0 状态：**未开工**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-058 移出卡集

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-008
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-008
- 来源方案：DESIGN-004 / ADR-P007

## 目标
每次 llmtest 采集把 score/isAlive/total_checks/pass_count/last_alive_at 写 ReliabilityObservation(entityType='station' 或 candidate 关联)，窗口=采集日；保留既有候选发现行为不变

## 输入
- 文档：`apps/web/lib/discovery/llmtest.ts`；`docs/任务规划V0.4.0/19_外部来源核验证据.md（composite 实测 51 条、rank 从 2 开始）`
- 契约：`无新增`
- 前置任务：无
- 前置状态：TASK-058 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/discovery/llmtest.ts`
  - `apps/web/lib/discovery/llmtest.spec.ts`
  - `apps/web/lib/discovery/llmtest-observations.ts（新建）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-073/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-073/`

## 允许修改
- `apps/web/lib/discovery/llmtest.ts`
- `apps/web/lib/discovery/llmtest.spec.ts`
- `apps/web/lib/discovery/llmtest-observations.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-073/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
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

#### TASK-081：后台价格批量写入 POST /api/v1/admin/prices/batch-upsert（requestId 幂等）

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


---

#### TASK-093：天梯读侧改用生效价：ladder 矩阵/详情的价格读取改走 resolveEffectivePrice（优惠期显示优惠价）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**sonnect**

> V0.9.0 状态：**未开工**｜V0.9.0 新增

> 历史（V0.4.0→V0.5.0）：V0.9.0 新增（STEP-2 审查：ladder 读 isCurrent 价无卡承接）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-038 / REQ-F-063
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038、REQ-F-063
- 来源方案：DESIGN-002 §2 接入点；V0.9.0 STEP-2 审查缺口

## 目标
apps/web/lib/features/ladder/repository.ts 中读 isCurrent 价格的 3 处（:27/:38/:180）改为生效价（窗口内 PROMOTION 优先，否则 isCurrent），返回形状不变；单测覆盖优惠期/窗口外

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-002-限时优惠计费.md`；`apps/web/lib/features/pricing/effective-price.ts`
- 契约：`EffectivePriceSchema`
- 前置任务：无
- 前置状态：TASK-027 已完成（V0.9.0）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/ladder/repository.ts`
  - `apps/web/lib/features/ladder/__tests__/ladder-effective-price.spec.ts`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-093/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 以 effectivePriceWhere(at) + pickEffectivePrice 替换 `prices: { where: { isCurrent: true }, take: 1 }` 三处，保持返回字段与 Decimal 精度
2. [ ] 补单测：优惠窗口内天梯价=优惠价、窗口外=当前价、无价=null
3. [ ] ladder 既有 __tests__ 全绿
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] ladder 相关 vitest 全绿
- [ ] 新单测 ≥3 例
- [ ] web tsc exit 0
- [ ] diff 仅落在允许范围
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/ladder && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-093/`

## 允许修改
- `apps/web/lib/features/ladder/repository.ts`
- `apps/web/lib/features/ladder/__tests__/ladder-effective-price.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-093/**`

## 禁止修改
- `apps/web/lib/features/pricing/**（只读复用）`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-029
- 阻塞条件：无

## 建议执行档位
sonnect　理由：读侧替换，规则已由 027 冻结

## 升级条件
排名算法依赖价格字段且口径需变 → 停，回报 Hark；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h


---

# Hark（主 Agent）自执行计划——核心/高难度/全部 UI

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 本书自包含：31 张卡（其中条件卡 9 张），合计 185h。按「序」执行（全局拓扑序）。

## 范围
所有执行者为 Hark(主Agent) 的卡：契约语义、迁移、资金路径、真库 CI、需求口径、全部前台/后台 UI。

## 0. 开工前必读（不可跳过）
1. 仓库：`https://github.com/nevermeetagain/Aidean`，分支 `main`。开工前 `git fetch && git status`，基线为 `ffa158c`（业务树=77c7952）；先确认 TASK-085（主线归一）已完成；若 HEAD 已前进，先对照本卡「验证命令」重测，不得按本书的旧结论跳过任务。
2. 读根目录 `AGENTS.md`：文档治理六条铁律（单一事实来源、双向链接、版本头 `> 版本: vX.Y | 更新: YYYY-MM-DD | 变更: …`、历史只读、技术栈锁定 Next.js 15 + PG16 + Redis + Prisma + Tailwind 4、文档即结构）与六步开发循环 PLAN→SPEC→**APPROVE**→IMPLEMENT→VERIFY→…。**未获用户 APPROVE 不得开工**（见 12_风险与待裁决.md「APPROVE」）。
3. 端口：Aidean 只用 3000–3100（默认 3000）；BotHot 回调保留 3200 段；AideanBot 3333 待 P-2 裁决。
4. 契约唯一源：`packages/shared/src/`（zod）。你不得修改契约，除非本卡就是契约卡。
5. 所有权：只改本卡「允许修改」的路径；越出 = blocked，写 ADR 草稿交 Hark，不得「先写了再说」。
6. 条件卡（标 ⛔/条件 U-*、P-*）在对应裁决给出前**不执行**。
7. 完成定义（DoD）：所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 验证命令可复现 ∧ 证据写入 `docs/任务规划V0.8.0/06_validation/evidence/EVD-<任务号>/` ∧ 不修改冻结契约。
8. 熔断：同一卡连续 2 次验收失败 → 停止改代码，写明失败原因与已尝试方案，交 Hark 重写任务书或升档；禁止第 3 次硬撞。
9. 防自证：你只负责执行与提交证据；PASS/FAIL 由独立验证者只看 diff + 运行结果判定。
10. 等待规则：卡的「Depends on」里有不属于你的卡时，必须等该卡在 main 上合并（以 `git log --grep TASK-xxx` 或其证据目录存在为准）再开工；期间先做本书中已满足依赖的后续卡。
11. 提交信息：`feat(TASK-xxx): <名称>` / `test(TASK-xxx)` / `docs(TASK-xxx)`，一卡一个或数个提交；不得夹带其他卡的改动。

## 1. 执行顺序

| 序 | 任务 | 切片 | 名称 | 档位 | 工时 | 依赖（★=他人卡，须等待） | 条件 |
|---|---|---|---|---|---|---|---|
| 1 | TASK-001 | S0 | 错误码唯一源迁入 shared + 删除冲突旧表 + 新增 3 码 + SystemReady  | opus | 0h | ★085(P3) | — |
| 2 | TASK-006 | S0 | CI 新增 e2e-skeleton job（PG16+Redis7 服务容器、空库迁移重放、: | opus | 8h | ★005(P3)、★004(P3)、★009(P2) | — |
| 3 | TASK-011 | S1 | ADR-P003 + 迁移 M-001：is_current 改为部分唯一索引（WHERE is | opus | 0h | ★010(P2) | — |
| 4 | TASK-014 | S2 | 功能开关契约落地（码枚举/公开 DTO/后台 DTO/受控面映射） | opus | 0h | 001 | — |
| 5 | TASK-015 | S2 | 开关服务 + 公开端点 + API 受控面接入（网关/测评/天梯站榜） | opus | 0h | 014、★002(P1) | — |
| 6 | TASK-026 | S4 | 限时优惠契约落地（PromotionPrice*/EffectivePrice） | opus | 3h | 001 | — |
| 7 | TASK-027 | S4 | 生效价解析服务 + 网关计费/前台展示接入 | opus | 12h | 026、011 | — |
| 8 | TASK-029 | S4 | UI：后台优惠子表与创建对话框 + 前台优惠价徽标 | opus | 10h | 027、★028(P1)、★023(P1) | — |
| 9 | TASK-034 | S5 | UI：顶栏搜索（桌面框 + 移动端展开 + 键盘导航） | opus | 8h | ★033(P1)、★018(P1) | U-5 |
| 10 | TASK-040 | S7 | 需求文档 v1.15 对齐代码事实与用户裁决 | opus | 4h | ★009(P2) | — |
| 11 | TASK-043 | S8 | 生产部署实弹（条件方案 A：自有服务器 docker compose prod） | opus | 16h | ★042(P3)、★007(P3)、★003(P1) | U-3 |
| 12 | TASK-045 | S9 | UI：介绍页截图画廊区块 + 后台 intro 编辑器截图条目 | opus | 8h | ★044(P1) | U-4 |
| 13 | TASK-047 | S4 | 计价口径归一契约：币种 CNY + 每百万 Token + 汇率配置键（EffectivePri | opus | 4h | 026 | U-15 |
| 14 | TASK-048 | S4 | 生效价解析器接入币种/单位归一（网关扣费与读侧同口径） | opus | 8h | 047、027 | U-15 |
| 15 | TASK-051 | S7 | 统一需求追溯矩阵入库 + 台账内部状态矛盾消解（#17/#36） | opus | 3h | ★041(P2) | — |
| 16 | TASK-053 | S4 | UI：价格页/详情页统一 ¥/M 展示（附原币原价注记） | opus | 6h | 048、029 | U-15 |
| 17 | TASK-056 | S10 | 监控契约落地：monitoring.schema.ts（源/快照/观测/变更事件/管理端 DTO | opus | 4h | 001 | — |
| 18 | TASK-057 | S10 | 文档：模型源监控设计入库 + 需求文档新增 §3.4.2「模型源监控」+ 文档索引登记 | opus | 4h | 056 | — |
| 19 | TASK-058 | S10 | 迁移 M-002：monitoring_sources / catalog_snapshots  | opus | 8h | 011、056 | — |
| 20 | TASK-060 | S10 | 目录采集器框架 + 3 个公开源（OpenRouter /api/v1/models、AIHub | opus | 10h | 056 | — |
| 21 | TASK-064 | S10 | 后台 UI：「模型源监控」页（源分级卡片 + 健康/最后运行 + 变更流 + 手动运行，五态齐全 | opus | 10h | ★063(P1) | — |
| 22 | TASK-066 | S11 | 扩展既有 GET /api/v1/models/[id]/stations：追加各监控源上架状态 | opus | 4h | ★059(P2)、056 | — |
| 23 | TASK-067 | S11 | 前台 UI：模型详情页「在哪里可调用」区块（多源上架/价格对比/中转风险提示/来源署名） | opus | 8h | 066 | — |
| 24 | TASK-068 | S11 | 上架同步：观测 → ProviderModelOffering（源↔平台实体映射，listedA | opus | 8h | ★059(P2) | U-M5 |
| 25 | TASK-071 | S12 | 可用性与中转真实性探针：最小请求探测 → ReliabilityObservation + 身份 | opus | 10h | ★070(P1) | U-M3 |
| 26 | TASK-074 | S11 | UI：模型详情页基准测试弹窗 + 历史测评示例（多模型回答并排）替换「即将上线」占位 | opus | 10h | 067 | — |
| 27 | TASK-080 | S4 | 缓存命中 token 计价（priceCache / discountCache）接入网关扣费 | opus | 6h | 048 | U-15 |
| 28 | TASK-082 | S4 | 契约：PriceBatchUpsertSchema（rows≤500 + requestId） | opus | 2h | 001 | — |
| 29 | TASK-089 | S1 | 修复集成测试门控：persist-prices.int.spec.ts 改为显式开关 RUN_D | sonnect | 1h | ★085(P3) | — |
| 30 | TASK-086 | S0 | 他线 S0–S3 落地独立复核：30 张卡逐卡跑验证命令并裁决 PASS/FAIL/UNKNOW | opus | 6h | 089、★091(P3) | — |
| 31 | TASK-092 | S3 | UI 运行态验收：S2 功能开关页/入口隐藏/403 态 + S3 收藏按钮/控制台 Tab/筛 | opus | 4h | 086、★023(P1)、★078(P1)、★018(P1) | — |

## 2. 跨线等待
- 你要等待的他人卡：TASK-002(P1)、TASK-003(P1)、TASK-004(P3)、TASK-005(P3)、TASK-007(P3)、TASK-009(P2)、TASK-010(P2)、TASK-018(P1)、TASK-023(P1)、TASK-028(P1)、TASK-033(P1)、TASK-041(P2)、TASK-042(P3)、TASK-044(P1)、TASK-059(P2)、TASK-063(P1)、TASK-070(P1)、TASK-078(P1)、TASK-085(P3)、TASK-091(P3)
- 等你完成才能开工的他人卡：TASK-002(P1)、TASK-004(P3)、TASK-010(P2)、TASK-012(P2)、TASK-016(P1)、TASK-018(P1)、TASK-019(P3)、TASK-021(P1)、TASK-022(P1)、TASK-024(P3)、TASK-028(P1)、TASK-030(P3)、TASK-032(P1)、TASK-035(P3)、TASK-037(P3)、TASK-039(P3)、TASK-041(P2)、TASK-042(P3)、TASK-044(P1)、TASK-046(P2)、TASK-054(P2)、TASK-055(P2)、TASK-059(P2)、TASK-061(P1)、TASK-063(P1)、TASK-065(P3)、TASK-070(P1)、TASK-072(P1)、TASK-073(P1)、TASK-075(P3)、TASK-077(P1)、TASK-079(P3)、TASK-081(P1)、TASK-084(P3)、TASK-088(P2)、TASK-091(P3)

## 3. 任务卡全文（与 05_execution/tasks/ 一致，以该目录为准）

#### TASK-001：错误码唯一源迁入 shared + 删除冲突旧表 + 新增 3 码 + SystemReady 契约

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus**

> V0.8.0 状态：**镜像已落地·单测 PASS**｜V0.8.0 复核（c2da219）：packages/shared/src/errors.ts 新建（26 处码定义）；types/index.ts 旧表删除；system.schema.ts SystemReady；单测证据 docs/任务规划V0.8.0/06_validation/evidence/EVD-BASELINE-V8/web-vitest.txt / shared-vitest.txt（V0.7.0 判定：他线声称完成·证据不足）；剩余工时 0（原 6h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.8.0：代码已叠加，剩回补与复核））
- 来源需求：REQ-NF-01 契约唯一源（开发流程.md §五.2）/ REQ-F-09 功能开关 / REQ-F-13 收藏
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-001
- 来源方案：ADR-P001

## 目标
packages/shared/src/errors.ts 成为唯一错误码源（25 码），旧 types/index.ts ErrorCode 删除，shared 单测断言码值无重复且含 22 个既有码原值

## 输入
- 文档：`contracts/02-errors.contract.ts`；`contracts/01-api.contract.ts §S0`；`docs/architecture/API接口文档.md §4`
- 契约：`ERROR_CODES`；`DEFAULT_STATUS_BY_CODE`；`httpStatusOf`；`ErrorBodySchema`；`ERROR_PRESENTATION`；`SystemReadySchema`
- 前置任务：TASK-085
- 前置状态：HEAD=77c7952 基线全绿（shared vitest 118 / web vitest 1081）

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/errors.ts（新建）`
  - `packages/shared/src/schemas/system.schema.ts（新建）`
  - `packages/shared/src/types/index.ts（删除 ErrorCode/ErrorCodeValue）`
  - `packages/shared/src/index.ts（导出）`
  - `packages/shared/src/__tests__/errors.spec.ts（新建）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-001/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 将 contracts/02-errors.contract.ts 的 ERROR_CODES/DEFAULT_STATUS_BY_CODE/httpStatusOf/ErrorBodySchema/ERROR_PRESENTATION/FAILURE_PATHS 原样落入 packages/shared/src/errors.ts
2. [ ] 将 contracts/01-api.contract.ts 的 SystemReadySchema 落入 schemas/system.schema.ts
3. [ ] 删除 packages/shared/src/types/index.ts 中 ErrorCode/ErrorCodeValue（全仓 0 引用，先 grep 复核）
4. [ ] index.ts 增加 export * from "./errors" 与 "./schemas/system.schema"，确认无命名冲突（ErrorCode 类型名在 web errors.ts:97 仍为本地类型，不受影响）
5. [ ] 新增 errors.spec.ts：码值唯一、22 既有码与 apps/web/app/api/v1/_lib/errors.ts 逐值相等（读取对象比对）、httpStatusOf 映射表驱动断言
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit` 退出码 0
- [ ] `pnpm --filter @aidean/shared test` 全绿且用例数 ≥ 118+新增
- [ ] `grep -rn "ErrorCode =" packages/shared/src` 无输出（旧表已删）
- [ ] contracts 自检脚本 selfcheck.ts 输出 mism=0、dup=[]
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-001/`

## 允许修改
- `packages/shared/src/errors.ts`
- `packages/shared/src/schemas/system.schema.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/errors.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-001/**`

## 禁止修改
- `apps/**`
- `apps/web/prisma/migrations/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-085
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-002, TASK-004, TASK-014, TASK-021, TASK-026, TASK-032, TASK-044, TASK-056, TASK-077, TASK-082
- 阻塞条件：发现 ErrorCode 旧表在仓内存在任何运行时引用（grep 非 0）→ 停止并提 ADR

## 建议执行档位
opus　理由：契约语义与唯一源裁决，影响全端，不可逆度高

## 升级条件
需改动任一既有码值或 HTTP 映射 → 升 fable（推翻已上线契约）；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 0h　<2h


---

#### TASK-006：CI 新增 e2e-skeleton job（PG16+Redis7 服务容器、空库迁移重放、:3000 启动）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.8.0 状态：**镜像未落地**｜V0.8.0 复核（c2da219）：.github/workflows/ci.yml 自 77c7952 未改，无 e2e-skeleton job；由 TASK-085 回补或按卡执行（V0.7.0 判定：他线声称完成·证据不足）

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 收回 Hark：CI 真库骨架在关键路径上，是 35 张卡的上游

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.8.0：代码已叠加，剩回补与复核））
- 来源需求：REQ-NF-03 测试可复现 / 未完成事项 #36
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-005
- 来源方案：SOL-S0

## 目标
push/PR 时 e2e-skeleton job 在全新 PG16 上 `prisma migrate deploy` 重放 16 条迁移、seed、build、`next start -p 3000`、等待 /system/ready=200 后跑 smoke + walking-skeleton，全部通过

## 输入
- 文档：`.github/workflows/ci.yml（现状：e2e 不进 CI 注释）`；`docs/engineering/开发环境搭建.md`
- 契约：`SystemReadySchema`
- 前置任务：TASK-005, TASK-004, TASK-009
- 前置状态：TASK-005 已合并

## 输出
- 新增/修改的文件路径：
  - `.github/workflows/ci.yml（新增 job）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-006/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] services: postgres:16（POSTGRES_DB=aidean）、redis:7；env 注入 DATABASE_URL/REDIS_URL/JWT 相关与 AIDEAN_ENABLE_MOCK_UPSTREAM=1、AIDEAN_BYPASS_LOGIN_RATE_LIMIT=1（仅测试，constants.ts:141 双条件保护）
2. [ ] 步骤：pnpm install --frozen-lockfile → prisma migrate deploy → db:seed → seed-navigation-menu → seed-rbac → build → start -p 3000 & → 轮询 ready ≤60s → playwright --project=smoke,web（walking-skeleton）
3. [ ] 失败上传 playwright-report 为 artifact
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] GitHub Actions e2e-skeleton job 绿
- [ ] job 日志可见 `migrate deploy` 应用 16 条迁移
- [ ] 端口恒为 3000（与 playwright baseURL 一致）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
gh run list --workflow CI --limit 1 （或在 Actions 页面查看 e2e-skeleton job 结论）
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-006/`

## 允许修改
- `.github/workflows/ci.yml`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-006/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `e2e/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-005, TASK-004, TASK-009
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-010, TASK-019, TASK-024, TASK-030, TASK-035, TASK-037, TASK-039, TASK-042, TASK-065, TASK-075, TASK-079, TASK-084
- 阻塞条件：seed 依赖外网（上游采集）导致 CI 不稳定 → 停止，在证据中列出外网调用点

## 建议执行档位
opus　理由：真库 CI 是全部集成验收的上游，失败面大、不可逆度高

## 升级条件
连续 2 次 CI 红且非产品缺陷 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 8h　≥2h


---

#### TASK-011：ADR-P003 + 迁移 M-001：is_current 改为部分唯一索引（WHERE is_current）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**opus**

> V0.8.0 状态：**镜像已落地·真库未验**｜V0.8.0 复核（c2da219）：迁移 20261014000000_model_prices_partial_current_unique/migration.sql 在；schema.prisma 已去 @@unique([modelId,isCurrent])；PG16 重放 UNKNOWN（TASK-091）（V0.7.0 判定：他线声称完成·证据不足）；剩余工时 0（原 6h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性，已确认缺陷））
- 来源需求：REQ-F-14 / REQ-F-12
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-019
- 来源方案：ADR-P003

## 目标
迁移 20261014000000_model_prices_partial_current_unique 删除 model_prices_model_id_is_current_key，新建 UNIQUE INDEX ... WHERE is_current = true；空库重放与存量库升级均成功

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/decisions/ADR-P003-价格当前行部分唯一索引.md`；`docs/任务规划V0.5.0/database/001_init.sql（M-001 草案）`
- 契约：`数据模型基线 §5 M-001`
- 前置任务：TASK-010
- 前置状态：TASK-010 复现成立

## 输出
- 新增/修改的文件路径：
  - `apps/web/prisma/migrations/20261014000000_model_prices_partial_current_unique/migration.sql`
  - `apps/web/prisma/schema.prisma（移除 @@unique([modelId,isCurrent]) 并以注释指向迁移）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-011/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 迁移前置核验 SQL：is_current=true 重复组=0（写入迁移注释）
2. [ ] DROP INDEX + CREATE UNIQUE INDEX ... WHERE is_current
3. [ ] schema.prisma 移除 @@unique，保留 @@index([isCurrent])；注释说明部分索引由迁移维护
4. [ ] 空库：migrate deploy 17 条全成功；`prisma migrate diff --from-migrations --to-schema-datamodel --shadow-database-url` 记录差异仅为该部分索引（Prisma 无法表达，需在 ADR 中登记豁免）
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] CI e2e-skeleton job 空库重放 17 条迁移成功
- [ ] TASK-010 集成测试由红转绿（第二次同步不再 P2002）
- [ ] 并发两条 is_current=true 写入仍被唯一索引拒绝（集成测试断言）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec prisma migrate deploy && pnpm --filter web exec vitest run lib/sync/writers/__tests__/persist-prices.int.spec.ts
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-011/`

## 允许修改
- `apps/web/prisma/migrations/20261014000000_model_prices_partial_current_unique/**`
- `apps/web/prisma/schema.prisma`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-011/**`

## 禁止修改
- `apps/web/prisma/migrations/2026091*/**`
- `apps/web/prisma/migrations/2026092*/**`
- `apps/web/prisma/migrations/2026093*/**`
- `apps/web/prisma/migrations/0000_init/**`
- `apps/web/prisma/migrations/202610[01]*/**（既有迁移只读）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-010
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-012, TASK-027, TASK-028, TASK-058
- 阻塞条件：存量库存在 is_current=true 重复组 → 停止，先出清洗方案再迁移

## 建议执行档位
opus　理由：破坏性 DDL + Prisma 不原生支持部分索引，需 ADR 级决策

## 升级条件
需改既有迁移 → 升 fable；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 0h　<2h


---

#### TASK-014：功能开关契约落地（码枚举/公开 DTO/后台 DTO/受控面映射）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus**

> V0.8.0 状态：**镜像已落地·单测 PASS**｜V0.8.0 复核（c2da219）：packages/shared/src/schemas/feature-flags.schema.ts + feature-flags.spec.ts 通过（V0.7.0 判定：未开工）；剩余工时 0（原 3h，验收转 TASK-086/091/092）

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S2（功能开关运行时（需求 §3.9））
- 来源需求：REQ-F-09 功能开关（需求 §3.9）
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-041
- 来源方案：DESIGN-001

## 目标
packages/shared/src/schemas/feature-flags.schema.ts 导出 FEATURE_FLAG_CODES/FeatureFlagCodeSchema/PublicFeaturesSchema/AdminFeatureFlagSchema/AdminFeatureFlagPatchSchema/FEATURE_GATES，单测断言 7 码与 seed 一致

## 输入
- 文档：`contracts/01-api.contract.ts §S2`；`docs/任务规划V0.8.0/03_solution/design/DESIGN-001-功能开关运行时.md`
- 契约：`FEATURE_FLAG_CODES`；`FEATURE_GATES`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/feature-flags.schema.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/feature-flags.spec.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-014/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 原样落地冻结稿
2. [ ] 单测：码值集合 = seed.ts:240-248 flagCode 集合（读文件正则提取）
3. [ ] PATCH schema strict 拒未知键
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] shared tsc + test 全绿
- [ ] feature-flags.spec.ts ≥4 例
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-014/`

## 允许修改
- `packages/shared/src/schemas/feature-flags.schema.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/feature-flags.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-014/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-015, TASK-016
- 阻塞条件：U-7 裁决改变开关失败策略（fail-open/closed）→ 按裁决调整 DESIGN-001 后再落地

## 建议执行档位
opus　理由：定义开关受控面（哪些 API/页面受控），影响多模块

## 升级条件
需新增权限域 → 升 opus 复核 RBAC；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 0h　<2h


---

#### TASK-015：开关服务 + 公开端点 + API 受控面接入（网关/测评/天梯站榜）

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


---

#### TASK-026：限时优惠契约落地（PromotionPrice*/EffectivePrice）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-12 限时优惠（需求 §3.6）/ REQ-C-03 价格透明（§五.6）
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038
- 来源方案：DESIGN-002

## 目标
packages/shared/src/schemas/promotion.schema.ts 落地，单测覆盖 until<=from 拒绝、价格非负字符串、EffectivePrice 不含 markup/multiplier 键

## 输入
- 文档：`contracts/01-api.contract.ts §S4`；`docs/任务规划V0.8.0/03_solution/design/DESIGN-002-限时优惠计费.md`
- 契约：`PromotionPriceCreateSchema`；`PromotionPricePatchSchema`；`EffectivePriceSchema`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/promotion.schema.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/promotion.spec.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-026/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 原样落地
2. [ ] 单测含「EffectivePriceSchema.keyof() 不含 markupRate/tokenMultiplier」断言
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] shared tsc+test 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-026/`

## 允许修改
- `packages/shared/src/schemas/promotion.schema.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/promotion.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-026/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：TASK-014, TASK-021
- Blocks：TASK-027, TASK-028, TASK-047, TASK-055
- 阻塞条件：U-9 裁决优惠需叠加用户等级折扣 → 停止，修订 DESIGN-002

## 建议执行档位
opus　理由：计费口径契约，涉及价格透明与敏感字段一票否决

## 升级条件
需改既有价格契约 → 升 fable；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-027：生效价解析服务 + 网关计费/前台展示接入

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：REQ-F-063：生效价随上游价格采集同步展示价

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-12 / REQ-F-07 计费公式
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038、REQ-F-063
- 来源方案：DESIGN-002

## 目标
resolveEffectivePrice(modelId, at) 实现契约生效规则；网关 PLATFORM 计费基准价改用之（加价率/倍率仍在服务端内乘，不外泄）；/api/v1/models/[id] 与 pricing 读侧返回 EffectivePrice；单测覆盖窗口边界/免费/过期回落/无优惠

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-002-限时优惠计费.md`；`docs/architecture/网关计费时序契约.md`；`apps/web/lib/features/gateway/repository.ts:89,109（isCurrent 取价）`
- 契约：`EffectivePriceSchema`
- 前置任务：TASK-026, TASK-011
- 前置状态：TASK-026、TASK-011 已合并（部分唯一索引已上线，允许多条非 current 行）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/pricing/effective-price.ts（新建）`
  - `apps/web/lib/features/pricing/__tests__/effective-price.spec.ts`
  - `apps/web/lib/features/gateway/repository.ts`
  - `apps/web/app/api/v1/models/[id]/route.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-027/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 查询：PROMOTION 且 effectiveFrom<=at<effectiveUntil 取最新；否则 isCurrent
2. [ ] gateway repository 两处取价改调用（保持原 Decimal 精度）
3. [ ] 读侧 DTO 增 isPromotion/promotionEndsAt/base*
4. [ ] 回归：gateway 既有 9 个 __tests__ 全绿
5. [ ] 采集写入新价后，生效价解析结果随之更新（前台展示价与采集同步，REQ-F-063）
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] effective-price 单测 ≥8 例
- [ ] gateway __tests__ 全绿
- [ ] grep 断言 EffectivePrice 序列化不含 markup/multiplier（单测）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/pricing lib/features/gateway && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-027/`

## 允许修改
- `apps/web/lib/features/pricing/**`
- `apps/web/lib/features/gateway/repository.ts`
- `apps/web/app/api/v1/models/[id]/route.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-027/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/lib/features/billing/**（账务服务不动）`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-026, TASK-011
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-029, TASK-048
- 阻塞条件：发现计费精度需改 Decimal→BigInt 口径 → 停止，升 opus 出 ADR

## 建议执行档位
opus　理由：资金路径（统一计费网关扣费），高风险

## 升级条件
资金回归任一失败 → 立即回滚并重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 12h　≥2h


---

#### TASK-029：UI：后台优惠子表与创建对话框 + 前台优惠价徽标

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-12 / REQ-C-03
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038
- 来源方案：DESIGN-002

## 目标
/admin/prices 可增改删优惠；/pricing 与 /models/[slug] 显示「限时优惠/限时免费」徽标与原价划线；五态符合契约⑥

## 输入
- 文档：`contracts/06-ux-states.contract.ts 后台限时优惠/前台价格徽标`
- 契约：`EffectivePriceSchema`
- 前置任务：TASK-027, TASK-028, TASK-023
- 前置状态：TASK-027、TASK-028 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/admin/PromotionsPanel.tsx`
  - `apps/web/components/admin/PricesManager.tsx`
  - `apps/web/components/common/PriceTag.tsx`
  - `apps/web/app/(site)/pricing/page.tsx`
  - `apps/web/app/(site)/models/[slug]/page.tsx`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-029/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] Dialog + 日期时间输入（Asia/Shanghai 展示，提交 ISO UTC）
2. [ ] PriceTag 统一价格渲染
3. [ ] 无写权限只读
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] web tsc/lint 0 error
- [ ] TASK-030 通过（独立验证者判定）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-029/`

## 允许修改
- `apps/web/components/admin/PromotionsPanel.tsx`
- `apps/web/components/admin/PricesManager.tsx`
- `apps/web/components/common/PriceTag.tsx`
- `apps/web/app/(site)/pricing/**`
- `apps/web/app/(site)/models/[slug]/**`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-029/**`

## 禁止修改
- `apps/web/app/api/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-027, TASK-028, TASK-023
- 资源锁串行（同文件，须在其后执行）：TASK-078
- Blocks：TASK-030, TASK-053
- 阻塞条件：与 TASK-023 同改 models/[slug]/page.tsx → 必须在 TASK-023 合并后开始（已列依赖）

## 建议执行档位
opus　理由：UI 设计（价格透明呈现），主 Agent 亲自完成

## 升级条件
连续 2 次验收失败 → 重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 10h　≥2h


---

#### TASK-034：UI：顶栏搜索（桌面框 + 移动端展开 + 键盘导航）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus** ｜ **条件卡：待 U-5（顶栏搜索是否需要）裁决后下发**

> V0.8.0 状态：**条件·待裁决**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：条件·待裁决）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S5（顶栏全局搜索）
- 来源需求：REQ-F-15 / §五.2（搜索框仅在顶部导航栏）
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-002
- 来源方案：SOL-S5

## 目标
SiteHeader/MobileNav 内唯一搜索入口，防抖 250ms、AbortController、↑↓/Enter/Esc，五态符合契约⑥；其他页面不出现搜索框

## 输入
- 文档：`contracts/06-ux-states.contract.ts 顶栏全局搜索`
- 契约：`SearchResponseSchema`
- 前置任务：TASK-033, TASK-018
- 前置状态：TASK-033、TASK-018 已合并（SiteHeader 由 S2 先改）

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/site/GlobalSearch.tsx`
  - `apps/web/components/site/SiteHeader.tsx`
  - `apps/web/components/site/MobileNav.tsx`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-034/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 组件实现
2. [ ] 可访问性 role=combobox/listbox
3. [ ] 三主题对比度自查
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] web tsc/lint 0 error
- [ ] TASK-035 通过（独立验证者判定）
- [ ] `grep -rln "GlobalSearch" apps/web/app apps/web/components` 仅出现在 site/ 下
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-034/`

## 允许修改
- `apps/web/components/site/GlobalSearch.tsx`
- `apps/web/components/site/SiteHeader.tsx`
- `apps/web/components/site/MobileNav.tsx`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-034/**`

## 禁止修改
- `apps/web/app/api/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-033, TASK-018
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-035
- 阻塞条件：与 S2 TASK-018 同改 SiteHeader → 已串行

## 建议执行档位
opus　理由：全站头部交互设计，主 Agent 亲自完成

## 升级条件
连续 2 次验收失败 → 重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 8h　≥2h


---

#### TASK-040：需求文档 v1.15 对齐代码事实与用户裁决

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S7（文档治理收口 + 统一需求追溯矩阵）
- 来源需求：§3 需求基线复核 C-1..C-6
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-023、REQ-F-024、REQ-F-027、REQ-F-042、REQ-F-048
- 来源方案：ADR-P004

## 目标
需求文档 v1.15：§3.5 JWT 有效期、§3.9/§3.10 功能开关实装口径（后台域表中「功能开关 ✅GET/PATCH」改为实测）、§3.11 导航、§六 MVP（微信扫码/在线支付暂停）、§3.2 计价展示口径（¥/M 与汇率，按 U-15）与代码/裁决一致，并在文末链接统一追溯矩阵

## 输入
- 文档：`docs/任务规划V0.8.0/03_需求基线复核.md`；`docs/product/requirements/需求文档.md`
- 契约：`contracts/03-identity.contract.ts TOKEN_TTL`
- 前置任务：TASK-009
- 前置状态：U-1/U-2/U-11 已裁决

## 输出
- 新增/修改的文件路径：
  - `docs/product/requirements/需求文档.md`
  - `docs/文档索引.md`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-040/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 逐条按裁决改写
2. [ ] 保留上一版摘要行
3. [ ] 门禁
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] check-docs-rule exit 0（核心文档版本头）
- [ ] C-1..C-6 每条在文中有对应修订或「保持原文+裁决注记」
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-040/`

## 允许修改
- `docs/product/requirements/需求文档.md`
- `docs/文档索引.md`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-040/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.8.0/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-009
- 资源锁串行（同文件，须在其后执行）：TASK-020, TASK-025, TASK-031
- Blocks：TASK-041
- 阻塞条件：U-1/U-2/U-11 任一未裁决 → 只改无争议条目并标「待裁决」

## 建议执行档位
opus　理由：需求口径修订（需用户裁决 U-1/U-2/U-11），影响全局范围

## 升级条件
涉及范围增删 → 升 fable（需求终裁）；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h


---

#### TASK-043：生产部署实弹（条件方案 A：自有服务器 docker compose prod）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus** ｜ **条件卡：待 U-3（生产部署资源）裁决后下发**

> V0.8.0 状态：**条件·待裁决**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：条件·待裁决）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S8（生产部署实弹（含 RC-02 文档闭环））
- 来源需求：未完成事项 #2 生产部署实弹（P0）
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-003
- 来源方案：SOL-S8 方案A/B

## 目标
在用户提供的服务器上以 docker/docker-compose.prod.yml 起服，/api/v1/system/ready=200、e2e smoke 对生产域名通过、备份任务就绪

## 输入
- 文档：`docker/docker-compose.prod.yml`；`docs/engineering/部署运维文档.md`；`docs/archive/REL-ENG-02-发布收口与运行契约.md`
- 契约：`SystemReadySchema`
- 前置任务：TASK-042, TASK-007, TASK-003
- 前置状态：U-3 裁决（服务器/域名/密钥/registry）完成；TASK-042 演练通过

## 输出
- 新增/修改的文件路径：
  - `docker/.env（不入库）`
  - `deploy/**（按需）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-043/`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-043/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 方案A：服务器供给→env 五件套→compose up -d→migrate deploy→seed（生产口径）→ready 检查→smoke
2. [ ] 方案B（U-3=暂缓）：本卡冻结，仅保留 TASK-042
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `curl https://<域名>/api/v1/system/ready` 200
- [ ] smoke 7 例对生产 baseURL 通过
- [ ] 密钥扫描（TASK-007）对仓库 0 命中
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
E2E_BASE_URL=https://<域名> pnpm exec playwright test --config playwright.config.ts --project=smoke
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-043/`

## 允许修改
- `deploy/**`
- `docker/**`
- `Dockerfile`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-043/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-042, TASK-007, TASK-003
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-3 未裁决 → 不执行

## 建议执行档位
opus　理由：生产环境不可逆操作 + 密钥处理

## 升级条件
生产故障 → 立即回滚并上报用户；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 16h　≥2h


---

#### TASK-045：UI：介绍页截图画廊区块 + 后台 intro 编辑器截图条目

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus** ｜ **条件卡：待 U-4（截图素材）裁决后下发**

> V0.8.0 状态：**条件·待裁决**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：条件·待裁决）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-21 vitest include 仅 lib/**（vitest.config.ts:13），UI 验收以 e2e 为准

## 归属
- 所属切片：S9（子平台介绍页截图区块）
- 来源需求：#70 / R-84
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-016
- 来源方案：SOL-S9

## 目标
/products/[slug] 有截图时渲染画廊（懒加载、点击放大、SafeImage 兜底），无截图不渲染；后台 ProductsManager 可增删排序截图

## 输入
- 文档：`contracts/04-resources.contract.ts`；`docs/product/design/UI设计文档.md`
- 契约：`ProductIntroScreenshotSchema`；`ImageRefSchema`
- 前置任务：TASK-044
- 前置状态：TASK-044 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/(site)/products/[slug]/page.tsx`
  - `apps/web/components/site/ProductScreenshots.tsx`
  - `apps/web/components/admin/ProductsManager.tsx（或其 intro 子编辑器）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-045/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 画廊组件
2. [ ] 后台编辑条目
3. [ ] tsc/lint
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] web tsc/lint 0 error
- [ ] 人工：无截图产品页面与现状逐像素一致（截图对比证据）
- [ ] UI 行为以 e2e 用例断言（`pnpm test:e2e -g` 对应用例全绿），不得以组件单测替代——vitest 不收集 components/**
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-045/`

## 允许修改
- `apps/web/app/(site)/products/[slug]/**`
- `apps/web/components/site/ProductScreenshots.tsx`
- `apps/web/components/admin/ProductsManager.tsx`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-045/**`

## 禁止修改
- `apps/web/app/api/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-044
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-046
- 阻塞条件：U-4 未裁决 → 不执行

## 建议执行档位
opus　理由：展示页视觉设计，主 Agent 亲自完成

## 升级条件
连续 2 次验收失败 → 重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 8h　≥2h


---

#### TASK-047：计价口径归一契约：币种 CNY + 每百万 Token + 汇率配置键（EffectivePrice 扩展）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.8.0 状态：**条件·待裁决**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：条件·待裁决）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-20 与 055 调换：契约 registry 先

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b 价格统一 ¥/M Tokens 与 ¥5=$1 换算（需求文档 §3.2）/ REQ-C-03 价格透明
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：ADR-P005 / DESIGN-003

## 目标
packages/shared/src/schemas/promotion.schema.ts 的 EffectivePriceSchema 增加 currency='CNY'、unit='per_million_tokens'、sourceCurrency、sourceUnit、fxRate 字段，并导出 PRICE_NORMALIZATION 常量与 normalizeUnitPrice 纯函数；shared 单测覆盖 CNY/USD × per_1k/per_million 四象限

## 输入
- 文档：`contracts/01-api.contract.ts §S4 PRICE_NORMALIZATION`；`03_solution/decisions/ADR-P005-计价口径归一.md`
- 契约：`EffectivePriceSchema（v0.2 扩展）`；`PRICE_NORMALIZATION`；`normalizeUnitPrice`
- 前置任务：TASK-026
- 前置状态：TASK-026、TASK-055 已合并；U-15（汇率口径）已裁决

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/promotion.schema.ts`
  - `packages/shared/src/utils/price-normalization.ts（新建）`
  - `packages/shared/src/constants/admin-config.constants.ts（registry 增 pricing.fxUsdCny）`
  - `packages/shared/src/utils/pricing-config.ts（PRICING_CONFIG_KEYS 增 fxUsdCny）`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/price-normalization.spec.ts（新建）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-047/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 按冻结稿落地 PRICE_NORMALIZATION（目标币种 CNY、目标单位 per_million_tokens、配置键 pricing.fxUsdCny）
2. [ ] normalizeUnitPrice(value, currency, unit, fx)：per_1k×1000；USD×fx；未知币种抛错（调用方 fail-closed）
3. [ ] EffectivePriceSchema 扩展字段
4. [ ] ADMIN_CONFIG_REGISTRY 增 pricing.fxUsdCny（valueRule >0，defaultValue = TASK-055 种子值），使后台 PUT /api/v1/admin/configs 白名单可写
5. [ ] 单测四象限 + 未知币种 + fx<=0 拒绝
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter @aidean/shared test` 全绿且新增 ≥6 例
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit` 0
- [ ] price-normalization.ts 无硬编码汇率数值（汇率只来自参数）
- [ ] `pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-config-seed-parity.spec.ts` 通过（registry 与 seed 一致）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-047/`

## 允许修改
- `packages/shared/src/schemas/promotion.schema.ts`
- `packages/shared/src/utils/price-normalization.ts`
- `packages/shared/src/constants/admin-config.constants.ts`
- `packages/shared/src/utils/pricing-config.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/price-normalization.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-047/**`

## 禁止修改
- `apps/**`
- `packages/shared/src/utils/billing.ts（calcCharge 不动）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-026
- 资源锁串行（同文件，须在其后执行）：TASK-056, TASK-082
- Blocks：TASK-048, TASK-055
- 阻塞条件：U-15 未裁决 → 不执行（条件卡）；需要改 calcCharge 的签名或精度 → 停止，升 fable

## 建议执行档位
opus　理由：资金路径契约语义（币种/单位），不可逆度高

## 升级条件
与 provider-pricing.ts 既有展示口径冲突 → 升 opus 仲裁；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h


---

#### TASK-048：生效价解析器接入币种/单位归一（网关扣费与读侧同口径）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.8.0 状态：**条件·待裁决**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：条件·待裁决）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b / REQ-F-07 计费公式
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：ADR-P005 / DESIGN-003

## 目标
resolveEffectivePrice 返回的 priceInput/priceOutput 一律为 CNY/百万 Token（USD 行按 pricing.fxUsdCny 换算、per_1k 行 ×1000），网关 PLATFORM 预扣与结算、/api/v1/models/[id]、pricing 读侧全部消费归一后的价格；无法归一的价格行使该候选被跳过（降级链继续）

## 输入
- 文档：`03_solution/design/DESIGN-003-生效价解析器.md`；`docs/architecture/网关计费时序契约.md`
- 契约：`EffectivePriceSchema（v0.2）`；`PRICE_NORMALIZATION`
- 前置任务：TASK-047, TASK-027
- 前置状态：TASK-027、TASK-047 已合并；U-15 已裁决；TASK-049 盘点结果已入证据（存量 USD/per_1k 行数），且人工抽样确认 USD 行为美元原价（ADR-P005 反证排除）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/pricing/effective-price.ts`
  - `apps/web/lib/features/pricing/__tests__/effective-price-normalization.spec.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-048/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 解析器读取 billingCurrency/billingUnit 并调用 normalizeUnitPrice
2. [ ] 汇率读 SystemConfig pricing.fxUsdCny（经 shared PRICING_CONFIG_KEYS；缺失 → 视为不可归一，候选跳过并记 warn 日志）
3. [ ] 单测：USD per_million / CNY per_1k / 未知币种 / 汇率缺失 四路径 + 网关预扣金额断言
4. [ ] 回归 gateway 全部 __tests__
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 新增单测 ≥8 例全绿
- [ ] `pnpm --filter web exec vitest run lib/features/gateway lib/features/pricing` 全绿
- [ ] USD 1.00/M、fx=F 时扣费基准 = F 元/M（表驱动断言）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/pricing lib/features/gateway && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-048/`

## 允许修改
- `apps/web/lib/features/pricing/**`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-048/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/lib/features/billing/**`
- `apps/web/prisma/**`
- `apps/web/lib/features/gateway/service.ts`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-047, TASK-027
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-053, TASK-080
- 阻塞条件：U-15 未裁决 → 不执行（条件卡）；需改 gateway/service.ts → 停止回报

## 建议执行档位
opus　理由：资金路径：改变实际扣费金额

## 升级条件
资金回归任一失败 → 立即回滚并重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 8h　≥2h


---

#### TASK-051：统一需求追溯矩阵入库 + 台账内部状态矛盾消解（#17/#36）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 收回 Hark：RTM 入库是需求口径终裁

## 归属
- 所属切片：S7（文档治理收口 + 统一需求追溯矩阵）
- 来源需求：本次需求「建立统一规划体系」/ AGENTS 铁律1 单一事实来源
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-008、REQ-NF-005、REQ-L-007、REQ-L-009
- 来源方案：ADR-P004 / 本规划 03a

## 目标
docs/product/requirements/需求追溯矩阵.md 成为需求→状态→任务的唯一追溯表（内容取自本规划 03a，逐行带证据路径），需求文档/台账/待执行大纲改为链接它；台账 #17（L44 🟡 vs §7.12 R-83 ✅）与 #36（L113 🟡 vs L295 ✅）各保留一个现行状态

## 输入
- 文档：`docs/任务规划V0.8.0/03a_统一需求追溯矩阵.md`；`docs/plans/未完成事项目录.md L44/L113/L295`
- 契约：`无（文档）`
- 前置任务：TASK-041
- 前置状态：TASK-041 已合并（台账拆分后路径）；TASK-040 已合并

## 输出
- 新增/修改的文件路径：
  - `docs/product/requirements/需求追溯矩阵.md（新建）`
  - `docs/plans/**（链接与状态对账）`
  - `docs/文档索引.md`
  - `scripts/check-docs-facts.mjs（新增 RTM 行数断言）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-051/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 复制 RTM 表并把「本规划任务号」列改为相对链接
2. [ ] 台账 #17/#36 状态对账（以 §7.12 收口回执与代码为准）
3. [ ] check-docs-facts 增断言：RTM 中「未实现/部分」行均有任务号或「暂不执行」理由
4. [ ] 文档索引登记
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] check-docs-rule exit 0
- [ ] check-docs-facts 全 PASS（含新断言）
- [ ] `grep -c "^| REQ-" docs/product/requirements/需求追溯矩阵.md` = 本规划 RTM 行数
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-051/`

## 允许修改
- `docs/product/requirements/需求追溯矩阵.md`
- `docs/plans/**`
- `docs/文档索引.md`
- `scripts/check-docs-facts.mjs`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-051/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.8.0/**`
- `.example/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-041
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：RTM 与 TASK-040 后的需求文档条目数不一致 → 停止回报 Hark 对账

## 建议执行档位
opus　理由：需求追溯矩阵入库=需求口径裁决

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 3h　≥2h


---

#### TASK-053：UI：价格页/详情页统一 ¥/M 展示（附原币原价注记）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.8.0 状态：**条件·待裁决**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：条件·待裁决）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b / REQ-C-03 价格透明（展示价与官方一致：原币原价须可见）
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：DESIGN-003

## 目标
/pricing 网关单价表与 /models/[slug] 参数表的价格列统一显示「¥x.xx / M Tokens」，USD 官方价以次级文字「官方 $y / M」并列（不隐藏原价）；三套浅色主题对比度 ≥4.5:1

## 输入
- 文档：`contracts/06-ux-states.contract.ts PRICING_TABLE`；`docs/product/design/UI设计文档.md`
- 契约：`EffectivePriceSchema（v0.2）`；`UX_STATES.pricingTable`
- 前置任务：TASK-048, TASK-029
- 前置状态：TASK-048、TASK-029 已合并（同页资源锁）

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/(site)/pricing/page.tsx`
  - `apps/web/app/(site)/models/[slug]/page.tsx`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-053/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 价格单元格改读 EffectivePrice.priceInput/priceOutput（已归一）
2. [ ] sourceCurrency≠CNY 时追加原币注记
3. [ ] 空态/错误态沿用契约⑥
4. [ ] 三主题截图存证
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec tsc --noEmit` 0 且 `pnpm --filter web lint` 0 error
- [ ] 页面无 `$` 作为主价格符号（e2e/人工：主列均为 ¥）
- [ ] 原币注记对 USD 行可见（人工截图）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-053/`

## 允许修改
- `apps/web/app/(site)/pricing/**`
- `apps/web/app/(site)/models/[slug]/**`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-053/**`

## 禁止修改
- `apps/web/lib/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-048, TASK-029
- 资源锁串行（同文件，须在其后执行）：TASK-067, TASK-074
- Blocks：TASK-054
- 阻塞条件：U-15 未裁决 → 不执行（条件卡）

## 建议执行档位
opus　理由：全部 UI 设计实现由主 Agent 负责；展示口径直接面向用户

## 升级条件
设计与「展示价=官方价」约束冲突 → 升 opus 并回报用户；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h


---

#### TASK-056：监控契约落地：monitoring.schema.ts（源/快照/观测/变更事件/管理端 DTO）+ 2 个新错误码

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-001/002/003/004/012
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-001、REQ-M-012
- 来源方案：DESIGN-004 / ADR-P007

## 目标
packages/shared 导出 MonitoringSource*/CatalogSnapshot*/ProviderModelObservation*/CatalogChangeEvent*/AdminMonitoring* zod 与 MONITOR_SOURCE_NOT_FOUND=20004、MONITOR_SOURCE_CREDENTIAL_MISSING=50012；码值与既有 25 码无冲突（单测断言）

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/07-monitoring.contract.ts`；`contracts/02-errors.contract.ts`
- 契约：`MonitoringSourceSchema`；`SOURCE_TIERS`；`CatalogChangeEventSchema`；`MONITORING_ERROR_CODES`；`MONITORING_UX_STATES`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并（errors.ts 唯一源已存在）

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/monitoring.schema.ts（新建）`
  - `packages/shared/src/errors.ts（追加 2 码 + HTTP 映射 50012→503）`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/monitoring.spec.ts（新建）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-056/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 将 contracts/07-monitoring.contract.ts 中 zod 定义原样落入 monitoring.schema.ts（不得改字段名/枚举值）
2. [ ] errors.ts 追加 MONITOR_SOURCE_NOT_FOUND:20004、MONITOR_SOURCE_CREDENTIAL_MISSING:50012 与 DEFAULT_STATUS_BY_CODE[20004]=404、[50012]=503、ERROR_PRESENTATION 两条
3. [ ] index.ts 导出；monitoring.spec.ts 断言：SOURCE_TIERS=[S1,S2,A,B,C]、码值全局唯一、CatalogChangeEvent 判别联合 4 种 kind 可解析样例
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit` exit 0
- [ ] `pnpm --filter @aidean/shared test` 全绿（含 monitoring.spec.ts）
- [ ] `node -e` 读取 ERROR_CODES 值去重后数量 = 27
- [ ] contracts/selfcheck-monitoring.ts 输出 collisions=0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-056/`

## 允许修改
- `packages/shared/src/schemas/monitoring.schema.ts`
- `packages/shared/src/errors.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/monitoring.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-056/**`

## 禁止修改
- `apps/**`
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：TASK-014, TASK-021, TASK-026, TASK-082
- Blocks：TASK-057, TASK-058, TASK-060, TASK-066, TASK-072
- 阻塞条件：冻结稿字段与 Prisma 草案（05 §5.6）不一致 → 停止，回报规划者

## 建议执行档位
opus　理由：契约语义（源分级、证据口径、错误码）影响数据/API/UI 三端，不可逆度高

## 升级条件
需改既有码值 → 升 fable；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h


---

#### TASK-057：文档：模型源监控设计入库 + 需求文档新增 §3.4.2「模型源监控」+ 文档索引登记

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 收回 Hark：改需求文档 §3.4.2

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-001..016（需求登记）/ REQ-L 文档治理
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-012
- 来源方案：DESIGN-004 / ADR-P007

## 目标
docs/architecture/模型源监控设计.md 与需求文档 §3.4.2 成文（MUST/SHOULD/COULD/MUST NOT 与 REQ-M 编号一致），check-docs-rule/facts 通过

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/任务规划V0.4.0/03b_监控需求增量.md`；`docs/architecture/AI市场发现与智能引擎设计文档.md`
- 契约：`无（文档）`
- 前置任务：TASK-056
- 前置状态：APPROVE 已给出；U-M1..M6 裁决结果（若已有）写入

## 输出
- 新增/修改的文件路径：
  - `docs/architecture/模型源监控设计.md（新建，带版本头）`
  - `docs/product/requirements/需求文档.md（新增 §3.4.2）`
  - `docs/文档索引.md`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-057/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 以 DESIGN-004 为底稿成文（引用而非复制 .example/history）
2. [ ] 需求文档 §3.4.2 写入 REQ-M 表与 MUST NOT 清单，版本头递增
3. [ ] 文档索引登记；若 check-docs-facts 断言 schema 模型数，等 TASK-058 合并后再同步数字
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `node scripts/check-docs-rule.mjs` exit 0
- [ ] `node scripts/check-docs-facts.mjs` exit 0
- [ ] 需求文档 §3.4.2 含 REQ-M-001..016 全部编号（grep 计数=16）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs && grep -c 'REQ-M-0' docs/product/requirements/需求文档.md
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-057/`

## 允许修改
- `docs/architecture/模型源监控设计.md`
- `docs/product/requirements/需求文档.md`
- `docs/文档索引.md`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-057/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-056
- 资源锁串行（同文件，须在其后执行）：TASK-009, TASK-020, TASK-025, TASK-031, TASK-040, TASK-041, TASK-051, TASK-088, TASK-090
- Blocks：无
- 阻塞条件：无

## 建议执行档位
opus　理由：需求文档变更属需求口径

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h


---

#### TASK-058：迁移 M-002：monitoring_sources / catalog_snapshots / provider_model_observations / catalog_change_events + 种子注册公开源 + 后台导航节点

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-16 空库重放口径 18/18（既有 16 + M-001 + M-002）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-001/002/003/004/005
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-001、REQ-M-003、REQ-M-004
- 来源方案：DESIGN-004 / ADR-P007

## 目标
新增迁移 20261015000000_model_source_monitoring（仅 CREATE，不改既有表）在空库重放与存量升级均成功；seed 注册 5 个公开源（openrouter/aihubmix/quanzil/huggingface/llmtest）

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/任务规划V0.4.0/05_数据模型基线.md §5.6`；`docs/任务规划V0.5.0/database/002_monitoring.sql`
- 契约：`MonitoringSourceSchema`；`CatalogSnapshotSchema`；`ProviderModelObservationSchema`；`CatalogChangeEventSchema`
- 前置任务：TASK-011, TASK-056
- 前置状态：TASK-011（M-001）已合并；TASK-056 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/prisma/schema.prisma（追加 4 model + 2 enum）`
  - `apps/web/prisma/migrations/20261015000000_model_source_monitoring/migration.sql（新建）`
  - `apps/web/prisma/seed.ts（monitoringSourcesData 5 行，upsert by key）`
  - `apps/web/lib/admin-nav-default-tree.ts（新增「模型源监控」节点 /admin/monitoring）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-058/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 按 database/002_monitoring.sql 写 Prisma model（字段/索引/唯一键逐一对应），`prisma migrate dev --create-only` 生成并人工比对 SQL
2. [ ] seed：monitoringSourcesData（key, tier, kind, endpoint, authRequired, cadenceCron, tosStatus, enabled）5 行；tosStatus 初值取 U-M6 裁决（未裁决=pending，仅后台可见）；authRequired=true 的源默认 enabled=false
3. [ ] admin-nav-default-tree.ts 增节点（权限码复用 admin:sync:read，避免新增权限码）
4. [ ] PG16 空库：migrate deploy + db:seed 两次（幂等）
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `DATABASE_URL=... npx prisma validate` exit 0
- [ ] 空库 `prisma migrate deploy` 18/18 成功（证据含输出）
- [ ] seed 两次后 monitoring_sources 恰 5 行
- [ ] 既有 16 条迁移文件 `git diff --stat` 为空
- [ ] admin-navigation 相关单测全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
cd apps/web && DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy && DATABASE_URL=$TEST_DATABASE_URL npx prisma db seed && pnpm --filter web exec vitest run lib/admin-nav
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-058/`

## 允许修改
- `apps/web/prisma/schema.prisma`
- `apps/web/prisma/migrations/20261015000000_model_source_monitoring/`
- `apps/web/prisma/seed.ts`
- `apps/web/lib/admin-nav-default-tree.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-058/**`

## 禁止修改
- `apps/web/app/**`
- `packages/**`
- `apps/web/prisma/migrations/2026092*、20261008*、20261010*、20261012*（既有迁移只读）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-011, TASK-056
- 资源锁串行（同文件，须在其后执行）：TASK-017
- Blocks：TASK-059, TASK-063, TASK-073
- 阻塞条件：需要 ALTER 既有表 → 停止并提 ADR（本迁移只允许 CREATE）

## 建议执行档位
opus　理由：新增 4 表 + 索引 + 种子，迁移不可逆且需串行（持有 M-002）

## 升级条件
空库重放失败 2 次 → 升 opus 复审 SQL；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 8h　≥2h


---

#### TASK-060：目录采集器框架 + 3 个公开源（OpenRouter /api/v1/models、AIHubMix /api/v1/models、Quanzil /api/pricing）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-002/003/006/007
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-002、REQ-M-007
- 来源方案：DESIGN-004 / ADR-P007

## 目标
lib/monitoring/catalog/ 下 CatalogCollector 接口 + 3 实现，各自把源响应归一为 ProviderModelObservation[]（价格统一为 USD/1M tokens 原币字段 + 原始字段保留），fixture 单测通过；不依赖任何 API Key

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/任务规划V0.4.0/19_外部来源核验证据.md（实测字段）`；`apps/web/lib/sync/adapters/openrouter.ts`；`apps/web/lib/sync/adapters/quanzil.ts`
- 契约：`ProviderModelObservationSchema`；`MonitoringSourceSchema`
- 前置任务：TASK-056
- 前置状态：TASK-056 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/monitoring/catalog/types.ts`
  - `apps/web/lib/monitoring/catalog/openrouter.ts`
  - `apps/web/lib/monitoring/catalog/aihubmix.ts`
  - `apps/web/lib/monitoring/catalog/quanzil.ts`
  - `apps/web/lib/monitoring/catalog/registry.ts`
  - `apps/web/lib/monitoring/catalog/__tests__/*.spec.ts + fixtures/*.json（截取 ≤20 条真实响应）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-060/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 复用 lib/security/url-policy safeFetch/readCappedJson（响应上限按源配置，OpenRouter 实测 ~773KB、AIHubMix ~892KB，设 4MB 上限）
2. [ ] OpenRouter：pricing.prompt/completion 为 USD/token 字符串 → ×1e6；`?output_modalities=all` 拉全量（实测默认仅 text 462，all 667）
3. [ ] Quanzil：在 lib/monitoring/ 内参照 QuanzilAdapter 重新实现 ratio→价格换算纯函数（只读参考，不修改 lib/sync/adapters/**），vendors[] 查表
4. [ ] AIHubMix：字段 model_id/model_name/developer_id → 观测；价格字段按实测 fixture 映射，缺失置 null 不猜
5. [ ] registry.ts：key→collector，键集合须与 seed monitoringSourcesData 一致（单测断言）
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec vitest run lib/monitoring/catalog` 全绿
- [ ] 每个 collector 对 fixture 产出的每条观测均通过 ProviderModelObservationSchema.parse
- [ ] OpenRouter fixture 中 openai/gpt-4 价格 prompt=30、completion=60（USD/1M）断言
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/catalog && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-060/`

## 允许修改
- `apps/web/lib/monitoring/catalog/`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-060/**`

## 禁止修改
- `apps/web/lib/sync/adapters/**（本卡只读复用）`
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-056
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-061, TASK-070
- 阻塞条件：源响应形状与 fixture 不符且无法确定字段语义 → 该源置 kind=unsupported 并回报，不得猜测映射

## 建议执行档位
opus　理由：跨源归一（价格单位/模型 ID 规范化）是监控体系核心，高难度

## 升级条件
价格单位歧义 → 升 opus 与 ADR-P005 对齐；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 10h　≥2h


---

#### TASK-064：后台 UI：「模型源监控」页（源分级卡片 + 健康/最后运行 + 变更流 + 手动运行，五态齐全）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-21 vitest include 仅 lib/**（vitest.config.ts:13），UI 验收以 e2e 为准

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-009/011/013
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-009、REQ-M-011、REQ-M-013
- 来源方案：DESIGN-004 / ADR-P007

## 目标
/admin/monitoring 展示源表（tier 徽章 S1/S2/A/B/C、kind、authRequired、enabled 开关、lastRunAt/lastStatus/lastCount）与变更流（4 类事件筛选、分页、证据链接），空/加载/错误/无权限/成功五态按 MONITORING_UX_STATES testid 实现

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/06-ux-states.contract.ts`；`contracts/07-monitoring.contract.ts`；`docs/product/design/UI设计文档.md`
- 契约：`MONITORING_UX_STATES`；`AdminMonitoringSourceListResponse`；`AdminMonitoringChangeListResponse`
- 前置任务：TASK-063
- 前置状态：TASK-063 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/(admin)/admin/monitoring/page.tsx`
  - `apps/web/components/admin/monitoring/SourceTable.tsx`
  - `apps/web/components/admin/monitoring/ChangeFeed.tsx`
  - `apps/web/components/admin/monitoring/TierBadge.tsx`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-064/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 沿用后台既有表格/卡片组件与 Tailwind 4 token（不引新 UI 库）
2. [ ] 变更流事件卡：模型 ID、源、前后价格（USD/1M 原币，不做汇率换算，避免 U-15 依赖）、证据外链
3. [ ] 手动运行按钮：202 后轮询 lastRunAt（5s×12 上限）
4. [ ] 五态 testid：monitoring-empty/loading/error/forbidden/ready
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter web exec tsc --noEmit` exit 0
- [ ] `pnpm --filter web lint` 0 error
- [ ] `next build` 路由表含 /admin/monitoring
- [ ] 人工：1280/768 宽度截图存证，五态各一张（mock API）
- [ ] UI 行为以 e2e 用例断言（`pnpm test:e2e -g` 对应用例全绿），不得以组件单测替代——vitest 不收集 components/**
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && cd apps/web && npx next build
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-064/`

## 允许修改
- `apps/web/app/(admin)/admin/monitoring/`
- `apps/web/components/admin/monitoring/`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-064/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-063
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-065
- 阻塞条件：契约字段不足以渲染 → 停止回报（不得在前端猜字段）

## 建议执行档位
opus　理由：UI 设计与实现（用户指令：UI 由主 Agent 完成）；需新设计信息架构

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 10h　≥2h


---

#### TASK-066：扩展既有 GET /api/v1/models/[id]/stations：追加各监控源上架状态与原币价格（向后兼容，不新建 offerings 端点）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-02 已有 /api/v1/models/[id]/stations 与详情页「提供商与折扣价」区块 → 改为扩展既有接口（兼容旧字段），由 Hark 设计并实现，避免重复建设

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-006/007/014
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-006、REQ-M-014
- 来源方案：DESIGN-004 / ADR-P007

## 目标
按 AiModel.code ↔ observation.normalizedModelId 匹配，返回 {items:[{sourceKey,tier,isListed,priceInputUsdPer1M,priceOutputUsdPer1M,firstSeenAt,lastSeenAt,sourceUrl}]}；中转源（kind=relay）条目必须带 identityVerified=false 标志

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/07-monitoring.contract.ts`
- 契约：`ModelOfferingsResponse`
- 前置任务：TASK-059, TASK-056
- 前置状态：TASK-059 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/models/[id]/offerings/route.ts`
  - `apps/web/lib/monitoring/__tests__/offerings-route.spec.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-066/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 读取既有 route.ts:1-37 响应形状，新增字段只追加不改名
2. [ ] 数据来自 059 写入的 ProviderModelObservation 最新行
3. [ ] 单测覆盖：旧字段不变 / 新字段存在 / 无观测时为空数组
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 路由单测全绿（含 20001、relay 标志用例）
- [ ] 响应 parse 通过
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/__tests__/offerings-route.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-066/`

## 允许修改
- `apps/web/app/api/v1/models/[id]/stations/`
- `apps/web/lib/monitoring/__tests__/offerings-route.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-066/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-059, TASK-056
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-067
- 阻塞条件：无

## 建议执行档位
opus　理由：既有公开接口的兼容扩展（不得破坏旧字段），属契约兼容决策

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h


---

#### TASK-067：前台 UI：模型详情页「在哪里可调用」区块（多源上架/价格对比/中转风险提示/来源署名）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-02 改造既有「提供商与折扣价」区块（page.tsx:246-290），不另起区块

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-006/007/014/015
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-006、REQ-M-014、REQ-M-015
- 来源方案：DESIGN-004 / ADR-P007

## 目标
/models/[slug] 新增区块：表格列 源（tier 徽章）/上架状态/输入·输出原币价/最后采集时间/来源链接；relay 源显示「身份未验证」提示；五态齐全；数据来自 TASK-066

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/06-ux-states.contract.ts`；`docs/product/design/UI设计文档.md`
- 契约：`ModelOfferingsResponse`；`MONITORING_UX_STATES`
- 前置任务：TASK-066
- 前置状态：TASK-066 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/models/ModelOfferings.tsx（新建）`
  - `apps/web/app/(site)/models/[slug]/page.tsx（挂载区块）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-067/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 在 page.tsx:246-290 既有区块内扩展多源列，不新增并列区块
2. [ ] 价格以原币 USD/1M 显示并标注来源，不做汇率换算（U-15 未决前不得出现 ¥ 换算值）
3. [ ] 若数据含 Artificial Analysis 来源，区块底部显示署名链接（ADR-P007）
4. [ ] testid：offerings-empty/loading/error/ready
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] tsc exit 0；lint 0 error
- [ ] next build 通过
- [ ] 人工：桌面/移动截图存证；relay 提示可见
- [ ] UI 行为以 e2e 用例断言（`pnpm test:e2e -g` 对应用例全绿），不得以组件单测替代——vitest 不收集 components/**
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && cd apps/web && npx next build
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-067/`

## 允许修改
- `apps/web/components/models/ModelOfferings.tsx`
- `apps/web/app/(site)/models/[slug]/page.tsx`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-067/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-066
- 资源锁串行（同文件，须在其后执行）：TASK-023, TASK-029
- Blocks：TASK-074
- 阻塞条件：无

## 建议执行档位
opus　理由：用户可见 UI 设计与实现（用户指令：UI 由主 Agent 完成）

## 升级条件
设计与天梯模块口径冲突 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 8h　≥2h


---

#### TASK-068：上架同步：观测 → ProviderModelOffering（源↔平台实体映射，listedAt=firstSeenAt，isActive=isListed）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**opus** ｜ **条件卡：待 U-M5（provider 映射到 ModelProvider 还是 APIStation）裁决后下发**

> V0.8.0 状态：**条件·待裁决**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：条件·待裁决）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-005/006
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-006
- 来源方案：DESIGN-004 / ADR-P007

## 目标
按 U-M5 裁决：方案A 映射到 ModelProvider.code、方案B 映射到 APIStation；只更新 sync 所有字段（listedAt/isActive/价格原币），不覆盖人工字段（defaultMultiplier/discount*），每次写入留 EvidenceChain

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/product/design/功能设计文档.md 五、字段所有权矩阵`
- 契约：`ProviderModelObservationSchema`
- 前置任务：TASK-059
- 前置状态：U-M5 已裁决；TASK-059 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/writers/offering-sync.ts（新建）`
  - `apps/web/lib/sync/writers/offering-sync.spec.ts（新建）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-068/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 映射表：monitoring_sources.mappedEntityType/mappedEntityId（M-002 已含字段）
2. [ ] 模型对齐：仅 normalizedModelId 精确命中 AiModel.code 才写；未命中进入 DiscoveryCandidate(candidateType='model') 待人工
3. [ ] 单测：人工字段不被覆盖、未命中不写 offering
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿（≥5 用例）
- [ ] tsc exit 0
- [ ] 人工字段保持断言通过
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/sync/writers/offering-sync.spec.ts && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-068/`

## 允许修改
- `apps/web/lib/sync/writers/offering-sync.ts`
- `apps/web/lib/sync/writers/offering-sync.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-068/**`

## 禁止修改
- `apps/web/prisma/migrations/2026092*、20261008*、20261010*、20261012*（既有迁移只读）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-059
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-M5 未裁决 → 不执行（条件卡）

## 建议执行档位
opus　理由：实体映射（ModelProvider vs APIStation）与模型身份对齐，错误会污染人工数据

## 升级条件
映射歧义 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 8h　≥2h


---

#### TASK-071：可用性与中转真实性探针：最小请求探测 → ReliabilityObservation + 身份信号（含 Claude thinking signature 检查）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus** ｜ **条件卡：待 U-M3（中转探针真实调用预算）裁决后下发**

> V0.8.0 状态：**条件·待裁决**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：条件·待裁决）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S12（密钥源 + 中转真实性 + AA 数据（条件刀））
- 来源需求：REQ-M-008/015/016
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-008、REQ-M-016
- 来源方案：DESIGN-004 / ADR-P007

## 目标
lib/monitoring/probe/ 对 enabled 中转源按预算执行最小请求（max_tokens≤16）记录延迟/成功率写 ReliabilityObservation；对声称 Claude 的模型做 thinking signature 存在性检查，结果仅作「身份信号」，不得据此自动下架或 promote

## 输入
- 文档：`docs/任务规划V0.8.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/任务规划V0.4.0/19_外部来源核验证据.md（Veridrop 方法与 AGPL 许可）`
- 契约：`AvailabilityProbeResultSchema`
- 前置任务：TASK-070
- 前置状态：U-M3 已裁决（预算/是否允许真实调用）；TASK-070 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/monitoring/probe/`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-071/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 每源每日预算上限（env MONITOR_PROBE_DAILY_BUDGET_USD），超限即停
2. [ ] 不引入 Veridrop 代码（AGPL-3.0），仅参考公开方法自研
3. [ ] 结果写 ReliabilityObservation(entityType='station')
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿（mock fetch）
- [ ] 预算超限用例断言不再发请求
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/monitoring/probe && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-071/`

## 允许修改
- `apps/web/lib/monitoring/probe/`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-071/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-070
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-M3 未裁决 → 不执行（条件卡）

## 建议执行档位
opus　理由：涉及真实付费调用、反伪造判定逻辑与误报风险，高难度

## 升级条件
误报争议 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 10h　≥2h


---

#### TASK-074：UI：模型详情页基准测试弹窗 + 历史测评示例（多模型回答并排）替换「即将上线」占位

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-01）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-F-010 / REQ-F-059 / REQ-L-013
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-010、REQ-F-059、REQ-L-013
- 来源方案：需求文档 §3.2；台账 #67

## 目标
详情页基准以弹窗呈现（点击基准名打开，含来源与核验状态），历史测评区块展示多模型回答并排示例，page.tsx:374 占位文案消失

## 输入
- 文档：`docs/product/requirements/需求文档.md:44-46,180`；`docs/product/design/界面交互文档.md`；`apps/web/app/(site)/models/[slug]/page.tsx:342-374`
- 契约：`既有 GET /api/v1/models/[id]、/api/v1/evaluations（只读，不改契约）`
- 前置任务：TASK-067
- 前置状态：TASK-067 已合并（同文件串行）

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/models/BenchmarkDialog.tsx（新建）`
  - `apps/web/components/models/EvaluationExamples.tsx（新建）`
  - `apps/web/app/(site)/models/[slug]/page.tsx`
  - `e2e/model-detail-benchmark.spec.ts 由 TASK-075 编写`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-074/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 设计：弹窗结构（基准名/分数/来源/核验徽标/演示数据标识）与四态（加载/空/错误/成功）
2. [ ] 实现 BenchmarkDialog，复用 @aidean/ui Dialog
3. [ ] EvaluationExamples 读取已公开的历史测评，空数据时显示空态而非「即将上线」
4. [ ] 移除 page.tsx:374 占位
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `grep -n '即将上线' 'apps/web/app/(site)/models/[slug]/page.tsx'` exit=1
- [ ] `pnpm --filter web exec tsc --noEmit` exit 0
- [ ] `pnpm --filter web lint` exit 0
- [ ] TASK-075 的 e2e 全绿（弹窗可开关、示例区块四态）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && ! grep -n '即将上线' 'apps/web/app/(site)/models/[slug]/page.tsx'
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-074/`

## 允许修改
- `apps/web/components/models/BenchmarkDialog.tsx`
- `apps/web/components/models/EvaluationExamples.tsx`
- `apps/web/app/(site)/models/[slug]/page.tsx`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-074/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/app/api/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-067
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-075
- 阻塞条件：需新增 API 字段 → 停止，提契约变更

## 建议执行档位
opus　理由：核心前台 UI 设计与实现（详情页是天梯主路径的落点）

## 升级条件
交互口径不明 → 升 fable 裁决；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 10h　≥2h


---

#### TASK-080：缓存命中 token 计价（priceCache / discountCache）接入网关扣费

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.8.0 状态：**条件·待裁决**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：条件·待裁决）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-09）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-060
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-060
- 来源方案：ADR-P005 计价口径归一；功能设计文档 D.4

## 目标
cachedTokens 按缓存价计费（无缓存价时按输入价），单测覆盖三种组合

## 输入
- 文档：`docs/product/design/功能设计文档.md:322-324`；`apps/web/lib/features/gateway/service.ts:681-704,712-860`
- 契约：`EffectivePrice（026）`
- 前置任务：TASK-048
- 前置状态：TASK-048 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/gateway/service.ts`
  - `apps/web/lib/features/gateway/__tests__/cache-billing.spec.ts（新建）`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-080/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 预估与结算两处均纳入 cachedTokens
2. [ ] 缓存价缺失回退输入价并记录
3. [ ] 单测：有缓存价/无缓存价/cachedTokens=0
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] vitest 全绿
- [ ] 既有网关用例数不减
- [ ] tsc exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/gateway && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-080/`

## 允许修改
- `apps/web/lib/features/gateway/service.ts`
- `apps/web/lib/features/gateway/__tests__/cache-billing.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-080/**`

## 禁止修改
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-048
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-15 未裁决

## 建议执行档位
opus　理由：资金路径

## 升级条件
需新增价格字段 → 升 fable；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h


---

#### TASK-082：契约：PriceBatchUpsertSchema（rows≤500 + requestId）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工**｜V0.8.0 复核（c2da219）：未见实现，卡面前提不变（V0.7.0 判定：未开工）；启动前置仍为 TASK-085——B-0' 未裁决前，镜像与 huaweicloud 同时开发同一卡会在下次叠加时互相覆盖

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-10）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-061
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-061
- 来源方案：ADR-P001 契约唯一源

## 目标
packages/shared 导出 PriceBatchUpsertSchema 与响应 DTO

## 输入
- 文档：`docs/product/design/功能设计文档.md:209-211`
- 契约：`PriceSchema（既有）`
- 前置任务：TASK-001
- 前置状态：TASK-001 已合并

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/price-batch.schema.ts（新建）`
  - `packages/shared/src/index.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-082/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 复用 PriceSchema 行定义
2. [ ] requestId=uuid
3. [ ] 导出
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit` exit 0
- [ ] `pnpm --filter @aidean/shared test` 全绿
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-082/`

## 允许修改
- `packages/shared/src/schemas/price-batch.schema.ts`
- `packages/shared/src/index.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-082/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-001
- 资源锁串行（同文件，须在其后执行）：TASK-014, TASK-021, TASK-026
- Blocks：TASK-081
- 阻塞条件：无

## 建议执行档位
opus　理由：契约唯一源

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h


---

#### TASK-089：修复集成测试门控：persist-prices.int.spec.ts 改为显式开关 RUN_DB_TESTS=1，避免 CI 占位 DATABASE_URL 误触发

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**sonnect**

> V0.8.0 状态：**未开工（Hark 核心）**｜V0.8.0 新增：规划期以带 DATABASE_URL（localhost:5432）的环境复现连接失败（EVD-BASELINE-V8/web-vitest.txt:241-252）；独立审查确认 CI 作业级占位 DATABASE_URL 对「Unit tests (web)」生效且 vitest.config 无覆盖

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S1（价格历史唯一约束修复（数据完整性，已确认缺陷））
- 来源需求：REQ-NF-（CI 门禁可信）/ §9.4 相关单测为硬门禁
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-019、REQ-NF-005
- 来源方案：V0.8.0 02_事实基线 D8-01

## 目标
默认 `pnpm --filter web test`（含 CI 作业级占位 DATABASE_URL）下该集成套件 skip；`RUN_DB_TESTS=1 DATABASE_URL=<pg16>` 下执行

## 输入
- 文档：`docs/任务规划V0.8.0/02_事实基线.md §D8-01`；`.github/workflows/ci.yml:23-25`
- 契约：`无`
- 前置任务：TASK-085
- 前置状态：无

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/writers/__tests__/persist-prices.int.spec.ts`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-089/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 把 `const DB_ENABLED = !!process.env.DATABASE_URL` 改为 `process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL`
2. [ ] 同步更新文件头注释中的运行命令
3. [ ] 以 CI 同款占位串运行 web 单测确认 0 失败
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `DATABASE_URL=postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder pnpm --filter web exec vitest run` exit 0
- [ ] 该文件在上述命令中计为 skipped
- [ ] diff 仅触及本文件
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public' pnpm --filter web exec vitest run; echo exit=$?
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-089/`

## 允许修改
- `apps/web/lib/sync/writers/__tests__/persist-prices.int.spec.ts`
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-089/**`

## 禁止修改
- `apps/web/lib/sync/writers/index.ts`
- `.github/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-085
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-086, TASK-091
- 阻塞条件：他线（B' 下）已在 huaweicloud 以其他方式修复 → 关闭本卡，以下次叠加为准

## 建议执行档位
sonnect　理由：单文件门控修改，规则明确

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 1h　<2h


---

#### TASK-086：他线 S0–S3 落地独立复核：30 张卡逐卡跑验证命令并裁决 PASS/FAIL/UNKNOWN（单测已由规划期先行实测）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.8.0 状态：**待 089、091**｜V0.8.0：代码已在镜像，复核范围扩为 S0–S3 30 卡；经 089（← 085）、091 启动；规划期已完成单测/类型/lint/构建先行实测（EVD-BASELINE-V8）

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.8.0：代码已叠加，剩回补与复核））
- 来源需求：REQ-L-015 / §9.3 防自证
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-041、REQ-F-052、REQ-NF-002、REQ-L-015
- 来源方案：ADR-P008

## 目标
对 TASK-001…025、050、076–079 在镜像 main 上逐卡执行卡内「验证命令」，输出 PASS/FAIL/UNKNOWN 表；规划期已得单测 PASS 的卡，本卡补 e2e/真库/运行态三类证据

## 输入
- 文档：`docs/任务规划V0.8.0/05_execution/task-index.md`；`docs/任务规划V0.5.0/06_validation/evidence/（他线证据，仅作对照）`
- 契约：`无（只读对照 docs/任务规划V0.5.0/contracts）`
- 前置任务：TASK-089, TASK-091
- 前置状态：TASK-089 已合并（否则 web 单测在带 DATABASE_URL 的环境中必有 1 文件失败）；TASK-091 已产出 PG16 证据

## 输出
- 新增/修改的文件路径：
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-086/verdicts.md`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-086/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] `pnpm install --frozen-lockfile`；记录 node/pnpm 版本
2. [ ] docker 起 postgres:16 + redis:7，`prisma migrate deploy` 空库重放
3. [ ] `pnpm --filter web build && PORT=3000 pnpm --filter web start` 后跑 `pnpm test:e2e -g 'walking-skeleton|feature-flags|favorites|ladder-filter-all'`
4. [ ] 逐卡只记 PASS/FAIL/UNKNOWN + 退出码 + 证据文件名
5. [ ] 回写 task-index 状态列（交 TASK-088）
6. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] verdicts.md 恰 30 行且每行含退出码与证据文件
- [ ] 无 PASS 行缺证据文件
- [ ] FAIL 卡已转回「未开工/返工」
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
test $(grep -cE '^\| TASK-(0[0-2][0-9]|050|07[6-9]) ' docs/任务规划V0.8.0/06_validation/evidence/EVD-086/verdicts.md) -eq 30; echo rows_ok=$?
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-086/`

## 允许修改
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-086/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `scripts/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-089, TASK-091
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-088, TASK-092
- 阻塞条件：089、091 未完成 → 不开工（089 依赖 085，故 086 实际随 085 → 089 链启动）；执行环境缺 PG16/Docker/浏览器 → 对应卡记 UNKNOWN，不得写 PASS

## 建议执行档位
opus　理由：独立验证者角色（防自证循环：执行者为他线 Agent，判定者须不同）

## 升级条件
≥3 张 FAIL → 升 fable 重估 S0/S1 范围；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h


---

#### TASK-092：UI 运行态验收：S2 功能开关页/入口隐藏/403 态 + S3 收藏按钮/控制台 Tab/筛选全选/价格档位（截图 + 五态核对）

> 版本: v0.8 | 更新: 2026-10-19 | 变更: 任务规划V0.8.0（基线 nevermeetagain/Aidean main@c2da219：镜像已叠加他线 S0–S3 源码；逐卡独立复核 + 新增 089–092；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.8.0 状态：**未开工（Hark 核心）**｜V0.8.0 新增：UI 卡此前只有代码证据

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-058 / REQ-F-026 / §4 UX States
- RTM 追溯（V0.8.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-026、REQ-F-041、REQ-F-042、REQ-F-052、REQ-F-058
- 来源方案：V0.5.0 contracts UX States

## 目标
018/023/078 三张 UI 卡的五态（空/加载/错误/无权限/成功）在 :3000 运行态逐一截图核对，输出 PASS/FAIL/UNKNOWN

## 输入
- 文档：`docs/任务规划V0.5.0/contracts/（UX States）`
- 契约：`UX States：FeatureFlags、Favorites、LadderFilter`
- 前置任务：TASK-086, TASK-023, TASK-078, TASK-018
- 前置状态：TASK-086 已跑通 :3000 运行态

## 输出
- 新增/修改的文件路径：
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-092/`
  - `docs/任务规划V0.8.0/06_validation/evidence/EVD-092/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 按 UX States 契约列出 3 页 × 5 态检查表
2. [ ] 逐态截图（桌面 1440 + 移动 390）
3. [ ] 不符项写缺陷单并回指原卡
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 检查表 15 格全部有截图或明确 N/A 理由
- [ ] 每个 FAIL 有对应缺陷单
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
test $(ls docs/任务规划V0.8.0/06_validation/evidence/EVD-092/*.png | wc -l) -ge 15; echo shots_ok=$?
```

## 证据路径
`docs/任务规划V0.8.0/06_validation/evidence/EVD-092/`

## 允许修改
- `docs/任务规划V0.8.0/06_validation/evidence/EVD-092/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-086, TASK-023, TASK-078, TASK-018
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：运行态起不来 → UNKNOWN

## 建议执行档位
opus　理由：UI 质量判断属核心验收，且为执行方以外的独立判定者

## 升级条件
≥3 格 FAIL → 回到原 UI 卡返工；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h


---

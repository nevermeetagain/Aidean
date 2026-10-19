# Hark（主 Agent）自执行计划——核心/高难度/全部 UI

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 本书自包含：19 张卡（其中条件卡 9 张），合计 141h。按「序」执行（全局拓扑序）。

## 范围
所有执行者为 Hark(主Agent) 的卡：契约语义、迁移、资金路径、真库 CI、需求口径、全部前台/后台 UI。

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
| 1 | TASK-006 | S0 | CI 新增 e2e-skeleton job（PG16+Redis7 服务容器、空库迁移重放、: | opus | 8h | ★009(P2) | — |
| 2 | TASK-034 | S5 | UI：顶栏搜索（桌面框 + 移动端展开 + 键盘导航） | opus | 8h | ★033(P1) | U-5 |
| 3 | TASK-040 | S7 | 需求文档 v1.15 对齐代码事实与用户裁决 | opus | 4h | ★009(P2) | — |
| 4 | TASK-045 | S9 | UI：介绍页截图画廊区块 + 后台 intro 编辑器截图条目 | opus | 8h | ★044(P1) | U-4 |
| 5 | TASK-047 | S4 | 计价口径归一契约：币种 CNY + 每百万 Token + 汇率配置键（EffectivePri | opus | 4h | — | U-15 |
| 6 | TASK-048 | S4 | 生效价解析器接入币种/单位归一（网关扣费与读侧同口径） | opus | 8h | 047 | U-15 |
| 7 | TASK-051 | S7 | 统一需求追溯矩阵入库 + 台账内部状态矛盾消解（#17/#36） | opus | 3h | ★041(P2) | — |
| 8 | TASK-064 | S10 | 后台 UI：「模型源监控」页（源分级卡片 + 健康/最后运行 + 变更流 + 手动运行，五态齐全 | opus | 10h | ★063(P1) | — |
| 9 | TASK-066 | S11 | 扩展既有 GET /api/v1/models/[id]/stations：追加各监控源上架状态 | opus | 4h | ★059(P2) | — |
| 10 | TASK-067 | S11 | 前台 UI：模型详情页「在哪里可调用」区块（多源上架/价格对比/中转风险提示/来源署名） | opus | 8h | 066 | — |
| 11 | TASK-068 | S11 | 上架同步：观测 → ProviderModelOffering（源↔平台实体映射，listedA | opus | 8h | ★059(P2) | U-M5 |
| 12 | TASK-071 | S12 | 可用性与中转真实性探针：最小请求探测 → ReliabilityObservation + 身份 | opus | 10h | ★070(P1) | U-M3 |
| 13 | TASK-074 | S11 | UI：模型详情页基准测试弹窗 + 历史测评示例（多模型回答并排）替换「即将上线」占位 | opus | 10h | 067 | — |
| 14 | TASK-080 | S4 | 缓存命中 token 计价（priceCache / discountCache）接入网关扣费 | opus | 6h | 048 | U-15 |
| 15 | TASK-043 | S8 | 生产部署实弹（条件方案 A：自有服务器 docker compose prod） | opus | 16h | ★042(P3)、★007(P3) | U-3 |
| 16 | TASK-086 | S0 | 他线 S0–S3 落地独立复核：30 张卡逐卡跑验证命令并裁决 PASS/FAIL/UNKNOW | opus | 6h | ★091(P3) | — |
| 17 | TASK-092 | S3 | UI 运行态验收：S2 功能开关页/入口隐藏/403 态 + S3 收藏按钮/控制台 Tab/筛 | opus | 4h | 086 | — |
| 18 | TASK-029 | S4 | UI：后台优惠子表与创建对话框 + 前台优惠价徽标 | opus | 10h | ★028(P1)、★093(P1) | — |
| 19 | TASK-053 | S4 | UI：价格页/详情页统一 ¥/M 展示（附原币原价注记） | opus | 6h | 048、029 | U-15 |

## 2. 跨线等待
- 你要等待的他人卡：TASK-007(P3)、TASK-009(P2)、TASK-028(P1)、TASK-033(P1)、TASK-041(P2)、TASK-042(P3)、TASK-044(P1)、TASK-059(P2)、TASK-063(P1)、TASK-070(P1)、TASK-091(P3)、TASK-093(P1)
- 等你完成才能开工的他人卡：TASK-030(P3)、TASK-035(P3)、TASK-037(P3)、TASK-039(P3)、TASK-041(P2)、TASK-042(P3)、TASK-046(P2)、TASK-054(P2)、TASK-055(P2)、TASK-065(P3)、TASK-075(P3)、TASK-084(P3)、TASK-088(P2)、TASK-094(P2)

## 3. 任务卡全文（与 05_execution/tasks/ 一致，以该目录为准）

#### TASK-006：CI 新增 e2e-skeleton job（PG16+Redis7 服务容器、空库迁移重放、:3000 启动）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工（Hark 核心）**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-005、TASK-004 移出卡集

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 收回 Hark：CI 真库骨架在关键路径上，是 35 张卡的上游

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.9.0：剩工件回补、CI 门禁与独立复核））
- 来源需求：REQ-NF-03 测试可复现 / 未完成事项 #36
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-005
- 来源方案：SOL-S0

## 目标
push/PR 时 e2e-skeleton job 在全新 PG16 上 `prisma migrate deploy` 重放 16 条迁移、seed、build、`next start -p 3000`、等待 /system/ready=200 后跑 smoke + walking-skeleton，全部通过

## 输入
- 文档：`.github/workflows/ci.yml（现状：e2e 不进 CI 注释）`；`docs/engineering/开发环境搭建.md`
- 契约：`SystemReadySchema`
- 前置任务：TASK-009
- 前置状态：TASK-005 已合并

## 输出
- 新增/修改的文件路径：
  - `.github/workflows/ci.yml（新增 job）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-006/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-006/`

## 允许修改
- `.github/workflows/ci.yml`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-006/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `e2e/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-009
- 资源锁串行（同文件，须在其后执行）：TASK-085
- Blocks：TASK-030, TASK-035, TASK-037, TASK-039, TASK-042, TASK-065, TASK-075, TASK-084
- 阻塞条件：seed 依赖外网（上游采集）导致 CI 不稳定 → 停止，在证据中列出外网调用点

## 建议执行档位
opus　理由：真库 CI 是全部集成验收的上游，失败面大、不可逆度高

## 升级条件
连续 2 次 CI 红且非产品缺陷 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 8h　≥2h


---

#### TASK-034：UI：顶栏搜索（桌面框 + 移动端展开 + 键盘导航）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus** ｜ **条件卡：待 U-5（顶栏搜索是否需要）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-018 移出卡集；条件卡，待 U-5 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S5（顶栏全局搜索）
- 来源需求：REQ-F-15 / §五.2（搜索框仅在顶部导航栏）
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-002
- 来源方案：SOL-S5

## 目标
SiteHeader/MobileNav 内唯一搜索入口，防抖 250ms、AbortController、↑↓/Enter/Esc，五态符合契约⑥；其他页面不出现搜索框

## 输入
- 文档：`contracts/06-ux-states.contract.ts 顶栏全局搜索`
- 契约：`SearchResponseSchema`
- 前置任务：TASK-033
- 前置状态：TASK-033、TASK-018 已合并（SiteHeader 由 S2 先改）

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/site/GlobalSearch.tsx`
  - `apps/web/components/site/SiteHeader.tsx`
  - `apps/web/components/site/MobileNav.tsx`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-034/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-034/`

## 允许修改
- `apps/web/components/site/GlobalSearch.tsx`
- `apps/web/components/site/SiteHeader.tsx`
- `apps/web/components/site/MobileNav.tsx`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-034/**`

## 禁止修改
- `apps/web/app/api/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-033
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工（Hark 核心）**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；V0.9.0：057 已把需求文档升至 v1.15（§3.4.2），本卡对齐后版本号顺延为 v1.16

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S7（文档治理收口 + 统一需求追溯矩阵）
- 来源需求：§3 需求基线复核 C-1..C-6
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-023、REQ-F-024、REQ-F-027、REQ-F-042、REQ-F-048
- 来源方案：ADR-P004

## 目标
需求文档 v1.15：§3.5 JWT 有效期、§3.9/§3.10 功能开关实装口径（后台域表中「功能开关 ✅GET/PATCH」改为实测）、§3.11 导航、§六 MVP（微信扫码/在线支付暂停）、§3.2 计价展示口径（¥/M 与汇率，按 U-15）与代码/裁决一致，并在文末链接统一追溯矩阵

## 输入
- 文档：`docs/任务规划V0.9.0/03_需求基线复核.md`；`docs/product/requirements/需求文档.md`
- 契约：`contracts/03-identity.contract.ts TOKEN_TTL`
- 前置任务：TASK-009
- 前置状态：U-1/U-2/U-11 已裁决

## 输出
- 新增/修改的文件路径：
  - `docs/product/requirements/需求文档.md`
  - `docs/文档索引.md`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-040/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-040/`

## 允许修改
- `docs/product/requirements/需求文档.md`
- `docs/文档索引.md`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-040/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.9.0/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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

#### TASK-045：UI：介绍页截图画廊区块 + 后台 intro 编辑器截图条目

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus** ｜ **条件卡：待 U-4（截图素材）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；条件卡，待 U-4 裁决

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-21 vitest include 仅 lib/**（vitest.config.ts:13），UI 验收以 e2e 为准

## 归属
- 所属切片：S9（子平台介绍页截图区块）
- 来源需求：#70 / R-84
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-016
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
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-045/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-045/`

## 允许修改
- `apps/web/app/(site)/products/[slug]/**`
- `apps/web/components/site/ProductScreenshots.tsx`
- `apps/web/components/admin/ProductsManager.tsx`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-045/**`

## 禁止修改
- `apps/web/app/api/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Contract** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-026 移出卡集；条件卡，待 U-15 裁决；V0.9.0：026 只落 EffectivePrice v0.1（E9-02）；本卡追加 v0.2 必填字段时须与 048 同批合入，否则 027 解析器产出的 DTO 不再通过契约（破坏性联动）

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-20 与 055 调换：契约 registry 先

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b 价格统一 ¥/M Tokens 与 ¥5=$1 换算（需求文档 §3.2）/ REQ-C-03 价格透明
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：ADR-P005 / DESIGN-003

## 目标
packages/shared/src/schemas/promotion.schema.ts 的 EffectivePriceSchema 增加 currency='CNY'、unit='per_million_tokens'、sourceCurrency、sourceUnit、fxRate 字段，并导出 PRICE_NORMALIZATION 常量与 normalizeUnitPrice 纯函数；shared 单测覆盖 CNY/USD × per_1k/per_million 四象限

## 输入
- 文档：`contracts/01-api.contract.ts §S4 PRICE_NORMALIZATION`；`03_solution/decisions/ADR-P005-计价口径归一.md`
- 契约：`EffectivePriceSchema（v0.2 扩展）`；`PRICE_NORMALIZATION`；`normalizeUnitPrice`
- 前置任务：无
- 前置状态：TASK-026、TASK-055 已合并；U-15（汇率口径）已裁决

## 输出
- 新增/修改的文件路径：
  - `packages/shared/src/schemas/promotion.schema.ts`
  - `packages/shared/src/utils/price-normalization.ts（新建）`
  - `packages/shared/src/constants/admin-config.constants.ts（registry 增 pricing.fxUsdCny）`
  - `packages/shared/src/utils/pricing-config.ts（PRICING_CONFIG_KEYS 增 fxUsdCny）`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/__tests__/price-normalization.spec.ts（新建）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-047/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-047/`

## 允许修改
- `packages/shared/src/schemas/promotion.schema.ts`
- `packages/shared/src/utils/price-normalization.ts`
- `packages/shared/src/constants/admin-config.constants.ts`
- `packages/shared/src/utils/pricing-config.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/__tests__/price-normalization.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-047/**`

## 禁止修改
- `apps/**`
- `packages/shared/src/utils/billing.ts（calcCharge 不动）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-027 移出卡集；条件卡，待 U-15 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b / REQ-F-07 计费公式
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：ADR-P005 / DESIGN-003

## 目标
resolveEffectivePrice 返回的 priceInput/priceOutput 一律为 CNY/百万 Token（USD 行按 pricing.fxUsdCny 换算、per_1k 行 ×1000），网关 PLATFORM 预扣与结算、/api/v1/models/[id]、pricing 读侧全部消费归一后的价格；无法归一的价格行使该候选被跳过（降级链继续）

## 输入
- 文档：`03_solution/design/DESIGN-003-生效价解析器.md`；`docs/architecture/网关计费时序契约.md`
- 契约：`EffectivePriceSchema（v0.2）`；`PRICE_NORMALIZATION`
- 前置任务：TASK-047
- 前置状态：TASK-027、TASK-047 已合并；U-15 已裁决；TASK-049 盘点结果已入证据（存量 USD/per_1k 行数），且人工抽样确认 USD 行为美元原价（ADR-P005 反证排除）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/features/pricing/effective-price.ts`
  - `apps/web/lib/features/pricing/__tests__/effective-price-normalization.spec.ts`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-048/`（取证：命令输出/截图/日志）

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
- [ ] R9-01：无价模型在 PLATFORM 路径不得按 0 放行（不可归一/无价 = skip-candidate，降级链耗尽 → 30002）
- [ ] R9-03：service 的请求时刻 now 传入 repository（findModelByCode/findModelsByIds 的 at 参数），预扣与结算同一生效价
- [ ] R9-04：优惠行与当前价的币种/单位一律经归一后计费（不再按 ¥/M 原样相乘）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm --filter web exec vitest run lib/features/pricing lib/features/gateway && pnpm --filter web exec tsc --noEmit
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-048/`

## 允许修改
- `apps/web/lib/features/pricing/**`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-048/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/lib/features/billing/**`
- `apps/web/prisma/**`
- `apps/web/lib/features/gateway/service.ts`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-047
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工（Hark 核心）**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-22 收回 Hark：RTM 入库是需求口径终裁

## 归属
- 所属切片：S7（文档治理收口 + 统一需求追溯矩阵）
- 来源需求：本次需求「建立统一规划体系」/ AGENTS 铁律1 单一事实来源
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-008、REQ-NF-005、REQ-L-007、REQ-L-009
- 来源方案：ADR-P004 / 本规划 03a

## 目标
docs/product/requirements/需求追溯矩阵.md 成为需求→状态→任务的唯一追溯表（内容取自本规划 03a，逐行带证据路径），需求文档/台账/待执行大纲改为链接它；台账 #17（L44 🟡 vs §7.12 R-83 ✅）与 #36（L113 🟡 vs L295 ✅）各保留一个现行状态

## 输入
- 文档：`docs/任务规划V0.9.0/03a_统一需求追溯矩阵.md`；`docs/plans/未完成事项目录.md L44/L113/L295`
- 契约：`无（文档）`
- 前置任务：TASK-041
- 前置状态：TASK-041 已合并（台账拆分后路径）；TASK-040 已合并

## 输出
- 新增/修改的文件路径：
  - `docs/product/requirements/需求追溯矩阵.md（新建）`
  - `docs/plans/**（链接与状态对账）`
  - `docs/文档索引.md`
  - `scripts/check-docs-facts.mjs（新增 RTM 行数断言）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-051/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-051/`

## 允许修改
- `docs/product/requirements/需求追溯矩阵.md`
- `docs/plans/**`
- `docs/文档索引.md`
- `scripts/check-docs-facts.mjs`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-051/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docs/任务规划V0.9.0/**`
- `.example/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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

#### TASK-064：后台 UI：「模型源监控」页（源分级卡片 + 健康/最后运行 + 变更流 + 手动运行，五态齐全）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工（Hark 核心）**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；V0.9.0：058 的 nav 节点顺延（E9-10），因 admin-nav-default-tree.ts 属 Agent-Data，拆为 TASK-094 紧随本卡合入

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-21 vitest include 仅 lib/**（vitest.config.ts:13），UI 验收以 e2e 为准

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-009/011/013
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-009、REQ-M-011、REQ-M-013
- 来源方案：DESIGN-004 / ADR-P007

## 目标
/admin/monitoring 展示源表（tier 徽章 S1/S2/A/B/C、kind、authRequired、enabled 开关、lastRunAt/lastStatus/lastCount）与变更流（4 类事件筛选、分页、证据链接），空/加载/错误/无权限/成功五态按 MONITORING_UX_STATES testid 实现

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/06-ux-states.contract.ts`；`contracts/07-monitoring.contract.ts`；`docs/product/design/UI设计文档.md`
- 契约：`MONITORING_UX_STATES`；`AdminMonitoringSourceListResponse`；`AdminMonitoringChangeListResponse`
- 前置任务：TASK-063
- 前置状态：TASK-063 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/(admin)/admin/monitoring/page.tsx`
  - `apps/web/components/admin/monitoring/SourceTable.tsx`
  - `apps/web/components/admin/monitoring/ChangeFeed.tsx`
  - `apps/web/components/admin/monitoring/TierBadge.tsx`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-064/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-064/`

## 允许修改
- `apps/web/app/(admin)/admin/monitoring/`
- `apps/web/components/admin/monitoring/`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-064/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-063
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-065, TASK-094
- 阻塞条件：契约字段不足以渲染 → 停止回报（不得在前端猜字段）

## 建议执行档位
opus　理由：UI 设计与实现（用户指令：UI 由主 Agent 完成）；需新设计信息架构

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 10h　≥2h


---

#### TASK-066：扩展既有 GET /api/v1/models/[id]/stations：追加各监控源上架状态与原币价格（向后兼容，不新建 offerings 端点）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工（Hark 核心）**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-056 移出卡集

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-02 已有 /api/v1/models/[id]/stations 与详情页「提供商与折扣价」区块 → 改为扩展既有接口（兼容旧字段），由 Hark 设计并实现，避免重复建设

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-006/007/014
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-006、REQ-M-014
- 来源方案：DESIGN-004 / ADR-P007

## 目标
按 AiModel.code ↔ observation.normalizedModelId 匹配，返回 {items:[{sourceKey,tier,isListed,priceInputUsdPer1M,priceOutputUsdPer1M,firstSeenAt,lastSeenAt,sourceUrl}]}；中转源（kind=relay）条目必须带 identityVerified=false 标志

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/07-monitoring.contract.ts`
- 契约：`ModelOfferingsResponse`
- 前置任务：TASK-059
- 前置状态：TASK-059 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/app/api/v1/models/[id]/offerings/route.ts`
  - `apps/web/lib/monitoring/__tests__/offerings-route.spec.ts`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-066/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-066/`

## 允许修改
- `apps/web/app/api/v1/models/[id]/stations/`
- `apps/web/lib/monitoring/__tests__/offerings-route.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-066/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-059
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工（Hark 核心）**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-02 改造既有「提供商与折扣价」区块（page.tsx:246-290），不另起区块

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-006/007/014/015
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-006、REQ-M-014、REQ-M-015
- 来源方案：DESIGN-004 / ADR-P007

## 目标
/models/[slug] 新增区块：表格列 源（tier 徽章）/上架状态/输入·输出原币价/最后采集时间/来源链接；relay 源显示「身份未验证」提示；五态齐全；数据来自 TASK-066

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`contracts/06-ux-states.contract.ts`；`docs/product/design/UI设计文档.md`
- 契约：`ModelOfferingsResponse`；`MONITORING_UX_STATES`
- 前置任务：TASK-066
- 前置状态：TASK-066 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/models/ModelOfferings.tsx（新建）`
  - `apps/web/app/(site)/models/[slug]/page.tsx（挂载区块）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-067/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-067/`

## 允许修改
- `apps/web/components/models/ModelOfferings.tsx`
- `apps/web/app/(site)/models/[slug]/page.tsx`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-067/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-066
- 资源锁串行（同文件，须在其后执行）：TASK-029
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Data** ｜ 建议档位：**opus** ｜ **条件卡：待 U-M5（provider 映射到 ModelProvider 还是 APIStation）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；条件卡，待 U-M5 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-M-005/006
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-006
- 来源方案：DESIGN-004 / ADR-P007

## 目标
按 U-M5 裁决：方案A 映射到 ModelProvider.code、方案B 映射到 APIStation；只更新 sync 所有字段（listedAt/isActive/价格原币），不覆盖人工字段（defaultMultiplier/discount*），每次写入留 EvidenceChain

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/product/design/功能设计文档.md 五、字段所有权矩阵`
- 契约：`ProviderModelObservationSchema`
- 前置任务：TASK-059
- 前置状态：U-M5 已裁决；TASK-059 已合并；U-24 已裁决（monitoring_sources.mapped_entity_id 为 uuid 而 model_providers.id / api_stations.id 为 text：推荐 A＝只存实体 id、联表 ::text、非 uuid 拒绝单测；B＝ADR 改列为 text）

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/sync/writers/offering-sync.ts（新建）`
  - `apps/web/lib/sync/writers/offering-sync.spec.ts（新建）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-068/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-068/`

## 允许修改
- `apps/web/lib/sync/writers/offering-sync.ts`
- `apps/web/lib/sync/writers/offering-sync.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-068/**`

## 禁止修改
- `apps/web/prisma/migrations/2026092*、20261008*、20261010*、20261012*（既有迁移只读）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus** ｜ **条件卡：待 U-M3（中转探针真实调用预算）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；条件卡，待 U-M3 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S12（密钥源 + 中转真实性 + AA 数据（条件刀））
- 来源需求：REQ-M-008/015/016
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-008、REQ-M-016
- 来源方案：DESIGN-004 / ADR-P007

## 目标
lib/monitoring/probe/ 对 enabled 中转源按预算执行最小请求（max_tokens≤16）记录延迟/成功率写 ReliabilityObservation；对声称 Claude 的模型做 thinking signature 存在性检查，结果仅作「身份信号」，不得据此自动下架或 promote

## 输入
- 文档：`docs/任务规划V0.9.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/任务规划V0.4.0/19_外部来源核验证据.md（Veridrop 方法与 AGPL 许可）`
- 契约：`AvailabilityProbeResultSchema`
- 前置任务：TASK-070
- 前置状态：U-M3 已裁决（预算/是否允许真实调用）；TASK-070 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/lib/monitoring/probe/`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-071/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-071/`

## 允许修改
- `apps/web/lib/monitoring/probe/`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-071/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工（Hark 核心）**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-01）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-F-010 / REQ-F-059 / REQ-L-013
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-010、REQ-F-059、REQ-L-013
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
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-074/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-074/`

## 允许修改
- `apps/web/components/models/BenchmarkDialog.tsx`
- `apps/web/components/models/EvaluationExamples.tsx`
- `apps/web/app/(site)/models/[slug]/page.tsx`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-074/**`

## 禁止修改
- `packages/shared/**`
- `apps/web/app/api/**`
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-API** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；条件卡，待 U-15 裁决

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-09）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-060
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-060
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
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-080/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-080/`

## 允许修改
- `apps/web/lib/features/gateway/service.ts`
- `apps/web/lib/features/gateway/__tests__/cache-billing.spec.ts`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-080/**`

## 禁止修改
- `apps/web/prisma/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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

#### TASK-043：生产部署实弹（条件方案 A：自有服务器 docker compose prod）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus** ｜ **条件卡：待 U-3（生产部署资源）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-003 移出卡集；条件卡，待 U-3 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S8（生产部署实弹（含 RC-02 文档闭环））
- 来源需求：未完成事项 #2 生产部署实弹（P0）
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-003
- 来源方案：SOL-S8 方案A/B

## 目标
在用户提供的服务器上以 docker/docker-compose.prod.yml 起服，/api/v1/system/ready=200、e2e smoke 对生产域名通过、备份任务就绪

## 输入
- 文档：`docker/docker-compose.prod.yml`；`docs/engineering/部署运维文档.md`；`docs/archive/REL-ENG-02-发布收口与运行契约.md`
- 契约：`SystemReadySchema`
- 前置任务：TASK-042, TASK-007
- 前置状态：U-3 裁决（服务器/域名/密钥/registry）完成；TASK-042 演练通过

## 输出
- 新增/修改的文件路径：
  - `docker/.env（不入库）`
  - `deploy/**（按需）`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-043/`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-043/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-043/`

## 允许修改
- `deploy/**`
- `docker/**`
- `Dockerfile`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-043/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-042, TASK-007
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

#### TASK-086：他线 S0–S3 落地独立复核：30 张卡逐卡跑验证命令并裁决 PASS/FAIL/UNKNOWN（单测已由规划期先行实测）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工（Hark 核心）**｜V0.9.0：复核范围仍为 S0–S3 30 卡（已移出卡集的 0h 卡以本卡 verdicts 收口）；089 已完成

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.9.0：剩工件回补、CI 门禁与独立复核））
- 来源需求：REQ-L-015 / §9.3 防自证
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-015、REQ-F-021、REQ-F-041、REQ-F-052、REQ-NF-002、REQ-NF-010、REQ-NF-011、REQ-L-001、REQ-L-002、REQ-L-003、REQ-L-004、REQ-L-012、REQ-F-054、REQ-F-055、REQ-L-015
- 来源方案：ADR-P008

## 目标
对 TASK-001…025、050、076–079 在镜像 main 上逐卡执行卡内「验证命令」，输出 PASS/FAIL/UNKNOWN 表；规划期已得单测 PASS 的卡，本卡补 e2e/真库/运行态三类证据

## 输入
- 文档：`docs/任务规划V0.9.0/05_execution/task-index.md`；`docs/任务规划V0.5.0/06_validation/evidence/（他线证据，仅作对照）`
- 契约：`无（只读对照 docs/任务规划V0.5.0/contracts）`
- 前置任务：TASK-091
- 前置状态：TASK-089 已完成（V0.9.0）；TASK-091 已产出 PG16 证据（Hark 已在 PG16.14 实测 18 条迁移重放与 int spec，见 EVD-058/EVD-089，可复用）

## 输出
- 新增/修改的文件路径：
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-086/verdicts.md`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-086/`（取证：命令输出/截图/日志）

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
test $(grep -cE '^\| TASK-(0[0-2][0-9]|050|07[6-9]) ' docs/任务规划V0.9.0/06_validation/evidence/EVD-086/verdicts.md) -eq 30; echo rows_ok=$?
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-086/`

## 允许修改
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-086/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `scripts/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-091
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

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工（Hark 核心）**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-023、TASK-078、TASK-018 移出卡集

> 历史（V0.4.0→V0.5.0）：V0.7.0 新增

## 归属
- 所属切片：S3（收藏）
- 来源需求：REQ-F-058 / REQ-F-026 / §4 UX States
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-026、REQ-F-041、REQ-F-042、REQ-F-052、REQ-F-058
- 来源方案：V0.5.0 contracts UX States

## 目标
018/023/078 三张 UI 卡的五态（空/加载/错误/无权限/成功）在 :3000 运行态逐一截图核对，输出 PASS/FAIL/UNKNOWN

## 输入
- 文档：`docs/任务规划V0.5.0/contracts/（UX States）`
- 契约：`UX States：FeatureFlags、Favorites、LadderFilter`
- 前置任务：TASK-086
- 前置状态：TASK-086 已跑通 :3000 运行态

## 输出
- 新增/修改的文件路径：
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-092/`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-092/`（取证：命令输出/截图/日志）

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
test $(ls docs/任务规划V0.9.0/06_validation/evidence/EVD-092/*.png | wc -l) -ge 15; echo shots_ok=$?
```

## 证据路径
`docs/任务规划V0.9.0/06_validation/evidence/EVD-092/`

## 允许修改
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-092/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-086
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

#### TASK-029：UI：后台优惠子表与创建对话框 + 前台优惠价徽标

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus**

> V0.9.0 状态：**未开工（Hark 核心）**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；已完成依赖 TASK-027、TASK-023 移出卡集；V0.9.0：027 已交付 resolveEffectivePrice 与 effectivePrice 字段（E9-06）；天梯读侧（ladder/repository 属 Agent-API）拆为 TASK-093 先行，本卡只消费

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-12 / REQ-C-03
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038、REQ-F-063
- 来源方案：DESIGN-002

## 目标
/admin/prices 可增改删优惠；/pricing 与 /models/[slug] 显示「限时优惠/限时免费」徽标与原价划线；五态符合契约⑥；/pricing、/models/[slug]、天梯矩阵与详情（ladder/repository 读 isCurrent 价）统一改读生效价（resolveEffectivePrice / /api/v1/models/[id].effectivePrice），优惠中展示划线原价与截止时间

## 输入
- 文档：`contracts/06-ux-states.contract.ts 后台限时优惠/前台价格徽标`
- 契约：`EffectivePriceSchema`
- 前置任务：TASK-028, TASK-093
- 前置状态：TASK-027、TASK-028 已合并

## 输出
- 新增/修改的文件路径：
  - `apps/web/components/admin/PromotionsPanel.tsx`
  - `apps/web/components/admin/PricesManager.tsx`
  - `apps/web/components/common/PriceTag.tsx`
  - `apps/web/app/(site)/pricing/page.tsx`
  - `apps/web/app/(site)/models/[slug]/page.tsx`
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-029/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-029/`

## 允许修改
- `apps/web/components/admin/PromotionsPanel.tsx`
- `apps/web/components/admin/PricesManager.tsx`
- `apps/web/components/common/PriceTag.tsx`
- `apps/web/app/(site)/pricing/**`
- `apps/web/app/(site)/models/[slug]/**`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-029/**`

## 禁止修改
- `apps/web/app/api/**`
- `packages/shared/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-028, TASK-093
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-030, TASK-053
- 阻塞条件：与 TASK-023 同改 models/[slug]/page.tsx → 必须在 TASK-023 合并后开始（已列依赖）

## 建议执行档位
opus　理由：UI 设计（价格透明呈现），主 Agent 亲自完成

## 升级条件
连续 2 次验收失败 → 重写任务书；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
大　约 10h　≥2h


---

#### TASK-053：UI：价格页/详情页统一 ¥/M 展示（附原币原价注记）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

> 执行者：**Hark(主Agent)** ｜ 所有权 Agent：**Agent-App** ｜ 建议档位：**opus** ｜ **条件卡：待 U-15（汇率口径）裁决后下发**

> V0.9.0 状态：**条件·待裁决**｜V0.9.0：B-0' 已裁决 A'（镜像 main 为开发线），无需再等 TASK-085 才开工；条件卡，待 U-15 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b / REQ-C-03 价格透明（展示价与官方一致：原币原价须可见）
- RTM 追溯（V0.9.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
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
  - `docs/任务规划V0.9.0/06_validation/evidence/EVD-053/`（取证：命令输出/截图/日志）

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
`docs/任务规划V0.9.0/06_validation/evidence/EVD-053/`

## 允许修改
- `apps/web/app/(site)/pricing/**`
- `apps/web/app/(site)/models/[slug]/**`
- `docs/任务规划V0.9.0/06_validation/evidence/EVD-053/**`

## 禁止修改
- `apps/web/lib/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** · docs/任务规划V0.7.0/** · docs/任务规划V0.8.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
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

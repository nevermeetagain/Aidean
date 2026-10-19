# P3 完整任务书——守卫/测试/CI 线（Agent-Guard 的外部卡）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 本书自包含：12 张卡（其中条件卡 3 张），合计 44h。按「序」执行（全局拓扑序）。

## 范围
你只做本书列出的卡。写入范围：.github/、scripts/（不含 check-docs-*）、apps/web/scripts/、e2e/、playwright.config.ts、vitest.config.ts、package.json/lock、docker/、deploy/、packages/shared/src/__tests__/contract/。

## 0. 开工前必读（不可跳过）
1. 仓库：`https://github.com/nevermeetagain/Aidean`，分支 `main`（B-0' 已裁决 A'：镜像 main 为唯一开发线，2026-10-19）。开工前 `git fetch && git status`，与 origin/main 一致后再动；V0.10.0 基线见 `25_执行记录.md` 末尾的推送 sha；若 HEAD 已前进，先对照本卡「验证命令」重测，不得按本书的旧结论跳过任务。已完成卡（089/026/082/027/056/058/060/057 及 V0.8.0 判镜像落地的 0 工时卡）不在本书，依赖它们的卡可直接开工。
2. 读根目录 `AGENTS.md`：文档治理六条铁律（单一事实来源、双向链接、版本头 `> 版本: vX.Y | 更新: YYYY-MM-DD | 变更: …`、历史只读、技术栈锁定 Next.js 15 + PG16 + Redis + Prisma + Tailwind 4、文档即结构）与六步开发循环 PLAN→SPEC→**APPROVE**→IMPLEMENT→VERIFY→…。**APPROVE 已由用户给出（2026-10-19，Hark 核心卡）；外部卡仍按各卡条件执行**（见 12_风险与待裁决.md「APPROVE」）。
3. 端口：Aidean 只用 3000–3100（默认 3000）；BotHot 回调保留 3200 段；AideanBot 3333 待 P-2 裁决。
4. 契约唯一源：`packages/shared/src/`（zod）。你不得修改契约，除非本卡就是契约卡。
5. 所有权：只改本卡「允许修改」的路径；越出 = blocked，写 ADR 草稿交 Hark，不得「先写了再说」。
6. 条件卡（标 ⛔/条件 U-*、P-*）在对应裁决给出前**不执行**。
7. 完成定义（DoD）：所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 验证命令可复现 ∧ 证据写入 `docs/任务规划V0.10.0/06_validation/evidence/EVD-<任务号>/` ∧ 不修改冻结契约。
8. 熔断：同一卡连续 2 次验收失败 → 停止改代码，写明失败原因与已尝试方案，交 Hark 重写任务书或升档；禁止第 3 次硬撞。
9. 防自证：你只负责执行与提交证据；PASS/FAIL 由独立验证者只看 diff + 运行结果判定。
10. 等待规则：卡的「Depends on」里有不属于你的卡时，必须等该卡在 main 上合并（以 `git log --grep TASK-xxx` 或其证据目录存在为准）再开工；期间先做本书中已满足依赖的后续卡。
11. 提交信息：`feat(TASK-xxx): <名称>` / `test(TASK-xxx)` / `docs(TASK-xxx)`，一卡一个或数个提交；不得夹带其他卡的改动。

## 1. 执行顺序

| 序 | 任务 | 切片 | 名称 | 档位 | 工时 | 依赖（★=他人卡，须等待） | 条件 |
|---|---|---|---|---|---|---|---|
| 1 | TASK-035 | S5 | e2e：搜索（命中/无结果/键盘跳转/移动端） | sonnect | 3h | ★034(Hark)、★006(Hark) | U-5 |
| 2 | TASK-037 | S6 | e2e 配置口径收敛：根 playwright.config.ts 唯一（138+64 例并表） | sonnect | 5h | ★006(Hark) | — |
| 3 | TASK-039 | S6 | 千级模型天梯量级基线（只测量，不优化） | sonnect | 6h | ★006(Hark) | — |
| 4 | TASK-042 | S8 | 备份/恢复演练脚本（pg_dump→restore→逐表行数比对） | sonnect | 5h | ★006(Hark) | U-3 |
| 5 | TASK-049 | S4 | 存量价格行口径盘点脚本（只读：币种×计价单位×来源） | sonnect | 3h | — | — |
| 6 | TASK-050 | S0 | CI verify 收尾：本地按 ci.yml 顺序复现 verify job 全部步骤 + c | sonnect | 1h | — | — |
| 7 | TASK-062 | S10 | 调度脚本 monitor_catalogs.ts（按源 cron 运行 collector→wr | sonnect | 3h | ★061(P1) | — |
| 8 | TASK-065 | S10 | E2E：后台监控页五态 + 手动运行后变更流出现新事件（fixture 源） | sonnect | 4h | 062、★064(Hark)、037、★006(Hark) | — |
| 9 | TASK-075 | S11 | e2e：模型详情页基准弹窗与测评示例 | sonnect | 3h | ★074(Hark)、★006(Hark) | — |
| 10 | TASK-083 | S8 | 上线前 seed 演示数据人工审核门禁（清单生成 + 审核记录校验） | sonnect | 3h | 042 | U-3 |
| 11 | TASK-084 | S6 | 核验：天梯页无页脚 + 台账 #19 admin 配置治理收口状态 | haiku | 2h | ★006(Hark) | — |
| 12 | TASK-030 | S4 | 计费集成 e2e：优惠窗口内按优惠价扣费、窗外按原价 | sonnect | 6h | ★029(Hark)、★006(Hark) | — |

## 2. 跨线等待
- 你要等待的他人卡：TASK-006(Hark)、TASK-029(Hark)、TASK-034(Hark)、TASK-061(P1)、TASK-064(Hark)、TASK-074(Hark)
- 等你完成才能开工的他人卡：TASK-031(P2)、TASK-036(P2)、TASK-043(Hark)、TASK-052(P2)

## 3. 任务卡全文（与 05_execution/tasks/ 一致，以该目录为准）

#### TASK-035：e2e：搜索（命中/无结果/键盘跳转/移动端）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-5（顶栏搜索是否需要）裁决后下发**

> V0.10.0 状态：**条件·待裁决**｜V0.10.0：条件卡，待 U-5 裁决

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S5（顶栏全局搜索）
- 来源需求：REQ-F-15
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-002
- 来源方案：SOL-S5

## 目标
e2e/web/search.spec.ts 通过（含 mobile project）

## 输入
- 文档：`contracts/06-ux-states.contract.ts`
- 契约：`SearchResponseSchema`
- 前置任务：TASK-034, TASK-006
- 前置状态：TASK-034 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/web/search.spec.ts`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-035/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 种子模型名作为查询词
2. [ ] Esc 关闭
3. [ ] mobile 视口
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test e2e/web/search.spec.ts --config playwright.config.ts --project=web --workers=1` 通过
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test e2e/web/search.spec.ts --config playwright.config.ts --project=web --workers=1
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-035/`

## 允许修改
- `e2e/web/search.spec.ts`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-035/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-034, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-036
- 阻塞条件：testid 不符 → FAIL 回 TASK-034

## 建议执行档位
sonnect　理由：E2E 脚本

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-037：e2e 配置口径收敛：根 playwright.config.ts 唯一（138+64 例并表）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S6（测试资产与量级基线）
- 来源需求：REQ-NF-03 / 未完成事项 #36
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-C-006、REQ-NF-005
- 来源方案：SOL-S6

## 目标
root config 新增 project `flows`（testDir e2e/tests，排除 smoke 重复），package.json test:e2e 指向根配置；`--list` 总数 = 收敛前两配置去重并集，并产出唯一基线表

## 输入
- 文档：`playwright.config.ts`；`e2e/playwright.config.ts`；`package.json:16`
- 契约：`无`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `playwright.config.ts`
  - `e2e/playwright.config.ts（删除或改为 re-export）`
  - `package.json`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-037/e2e-baseline.md`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-037/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 收敛前 `--list` 两配置各记录
2. [ ] 合并 projects
3. [ ] 收敛后 `--list` 对账
4. [ ] CI e2e job 改用根配置
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test --list --config playwright.config.ts` 总数 = 收敛前去重并集（证据表逐文件对账）
- [ ] `pnpm test:e2e` 使用根配置
- [ ] `node scripts/check-docs-facts.mjs` exit 0（R10-01：本卡新增 route/page/spec 时同步期望值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test --list --config playwright.config.ts
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-037/`

## 允许修改
- `playwright.config.ts`
- `e2e/playwright.config.ts`
- `package.json`
- `.github/workflows/ci.yml`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-037/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `e2e/**/*.spec.ts`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：TASK-050
- Blocks：TASK-065
- 阻塞条件：合并后 smoke 重复执行导致登录限流 → 保留 workers=1 并登记

## 建议执行档位
sonnect　理由：测试配置整理

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h


---

#### TASK-039：千级模型天梯量级基线（只测量，不优化）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S6（测试资产与量级基线）
- 来源需求：未完成事项 #17 / R-83（千级）/ §9.1
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-007
- 来源方案：SOL-S6

## 目标
在 CI 临时库生成 1000 模型（脚本，不进 seed）后测 GET /api/v1/ladder?type=models p50/p95（20 次）与 /models 首屏 HTML 字节数，写入基线证据

## 输入
- 文档：`scripts/test/benchmark/`；`e2e/perf/`
- 契约：`无`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `scripts/test/benchmark/ladder-1k.mjs`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-039/ladder-1k-baseline.md`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-039/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 批量插入 1000 AiModel+benchmark（仅临时库，结束 TRUNCATE 回滚）
2. [ ] autocannon 不可用则用 node fetch 循环计时
3. [ ] 记录 p50/p95/HTML 字节
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 证据含命令、原始样本与 p50/p95
- [ ] 脚本对非临时库（DATABASE_URL 不含 ci/test 标识）拒绝运行
- [ ] `node scripts/check-docs-facts.mjs` exit 0（R10-01：本卡新增 route/page/spec 时同步期望值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/test/benchmark/ladder-1k.mjs --dry-run
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-039/`

## 允许修改
- `scripts/test/benchmark/**`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-039/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `apps/web/prisma/seed*.ts`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：需改业务代码才能测 → 停止

## 建议执行档位
sonnect　理由：测量脚本

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h


---

#### TASK-042：备份/恢复演练脚本（pg_dump→restore→逐表行数比对）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-3（生产部署资源）裁决后下发**

> V0.10.0 状态：**条件·待裁决**｜V0.10.0：条件卡，待 U-3 裁决

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-14 scripts/db/backup.sh、restore.sh 已存在，改为在既有脚本上扩展逐表行数比对与演练记录

## 归属
- 所属切片：S8（生产部署实弹（含 RC-02 文档闭环））
- 来源需求：未完成事项 #3 生产级数据策略
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-004
- 来源方案：SOL-S8

## 目标
scripts/ops/pg-drill.mjs 在 CI PG 上完成 dump→新库 restore→68 模型对应表行数逐表一致，输出耗时与备份体积

## 输入
- 文档：`docs/engineering/部署运维文档.md`
- 契约：`无`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `scripts/ops/pg-drill.mjs`
  - `.github/workflows/ci.yml（可选 workflow_dispatch 步骤）`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-042/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 在 scripts/db/backup.sh、restore.sh 既有实现上扩展（restore.sh:56-59），不另写一套
2. [ ] pg_dump -Fc
3. [ ] createdb + pg_restore
4. [ ] information_schema 行数比对
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 演练输出 diff=0
- [ ] 证据含耗时/体积
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/ops/pg-drill.mjs --source $DATABASE_URL
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-042/`

## 允许修改
- `.github/workflows/ci.yml`
- `scripts/db/**`
- `scripts/ops/**`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-042/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `docker/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：TASK-037, TASK-050
- Blocks：TASK-043, TASK-052, TASK-083
- 阻塞条件：CI 镜像无 pg_dump 客户端 → 使用 postgres:16 容器内执行

## 建议执行档位
sonnect　理由：运维脚本

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 5h　≥2h


---

#### TASK-049：存量价格行口径盘点脚本（只读：币种×计价单位×来源）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖；已完成依赖 TASK-085 移出卡集

> 历史（V0.4.0→V0.5.0）：V0.5.0 修正：FIX-19 去掉对 006 的依赖（只需 DATABASE_URL）；grep 验收改为「文件存在 ∧ grep exit=1」

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-02b（为 U-15 裁决提供数据）
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-011
- 来源方案：ADR-P005

## 目标
`node scripts/audit/price-normalization-audit.mjs` 对任意库输出 model_prices 中 is_current=true 行按 billing_currency × billing_unit × source_type 的计数表与 5 条样例，退出码恒 0

## 输入
- 文档：`03_solution/decisions/ADR-P005-计价口径归一.md`
- 契约：`无（只读盘点）`
- 前置任务：无
- 前置状态：TASK-006 已合并（CI 有 seed 后的 PG16）

## 输出
- 新增/修改的文件路径：
  - `scripts/audit/price-normalization-audit.mjs（新建）`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-049/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 用 @prisma/client 只读查询（无写语句；脚本内 grep 自检无 create/update/delete）
2. [ ] 输出 markdown 表到 stdout
3. [ ] 在 CI seed 后库运行一次并存证
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] seed 后库输出含 USD 与 CNY 两行，合计 = is_current 行总数
- [ ] `test -f scripts/audit/price-unit-census.mjs` exit 0 且对其 grep 违规模式 exit=1（exit=2 视为失败）
- [ ] 输出按 (priceCurrency, billingUnit, source) 三维分组计数
- [ ] `node scripts/check-docs-facts.mjs` exit 0（R10-01：本卡新增 route/page/spec 时同步期望值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/audit/price-normalization-audit.mjs
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-049/`

## 允许修改
- `scripts/audit/**`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-049/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无 DATABASE_URL → 打印用法后 exit 0 并在证据注明

## 建议执行档位
sonnect　理由：只读统计脚本

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-050：CI verify 收尾：本地按 ci.yml 顺序复现 verify job 全部步骤 + coverage 目录入 .gitignore

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S0（步行骨架与契约守卫（V0.9.0：剩工件回补、CI 门禁与独立复核））
- 来源需求：REQ-NF-03 测试可复现 / §9.4 守卫（ci.yml 现无 lint 与 packages/ui 测试步骤）
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-NF-006
- 来源方案：SOL-S0

## 目标
085 已把 lint 与 @aidean/ui 单测接入 ci.yml（:67-76）；本卡在本地按 ci.yml verify job 顺序逐步执行（含 build）并留存输出，确认全部 exit 0；apps/web/coverage/ 加入 .gitignore

## 输入
- 文档：`.github/workflows/ci.yml:47-69`；`11_基线指标.md §11.2（lint 0 error/1 warning、ui 4 例）`
- 契约：`无（CI 配置）`
- 前置任务：无
- 前置状态：TASK-006/007 已合并（同文件资源锁）

## 输出
- 新增/修改的文件路径：
  - `.github/workflows/ci.yml`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-050/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 按 ci.yml verify job 的 run 行逐条执行，输出存 EVD-050/verify-job.txt
2. [ ] `.gitignore` 增 apps/web/coverage/
3. [ ] 失败步骤 → 记 FAIL 与归属卡，不在本卡修业务代码
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] EVD-050/verify-job.txt 含每步 exit 码且全部为 0（或 FAIL 已登记归属卡）
- [ ] `git status` 在跑完 coverage 后不出现 apps/web/coverage
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
grep -q 'apps/web/coverage' .gitignore && ! grep -E 'exit=[1-9]' docs/任务规划V0.10.0/06_validation/evidence/EVD-050/verify-job.txt; echo exit=$?
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-050/`

## 允许修改
- `.github/workflows/ci.yml`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-050/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：无
- 资源锁串行（同文件，须在其后执行）：TASK-006
- Blocks：无
- 阻塞条件：lint 在 CI Node 20 下出现本地无的 error → 不改业务代码，登记并上报

## 建议执行档位
sonnect　理由：CI 配置追加两个既有命令，确定性

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 1h　<2h


---

#### TASK-062：调度脚本 monitor_catalogs.ts（按源 cron 运行 collector→writer→diff，单源失败不影响他源）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-009/010
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-002、REQ-M-009、REQ-M-010
- 来源方案：DESIGN-004 / ADR-P007

## 目标
`npx tsx scripts/crawl/monitor_catalogs.ts --source openrouter --dry-run` 输出观测数；非 dry-run 写库；任一源异常记 monitoring_sources.lastError 且退出码仍为 0（部分成功）、全部失败退出码 1

## 输入
- 文档：`docs/任务规划V0.10.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`scripts/crawl/crawl_llmtest.ts（范式）`；`apps/web/lib/features/admin/script-executor.ts（调度执行器）`
- 契约：`MonitoringSourceSchema`
- 前置任务：TASK-061
- 前置状态：TASK-061 已合并

## 输出
- 新增/修改的文件路径：
  - `scripts/crawl/monitor_catalogs.ts（新建）`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-062/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 参数：--source <key|all> --dry-run --limit N
2. [ ] 按 enabled 且 authRequired=false（或凭证已配置）的源顺序执行；每源 try/catch
3. [ ] 更新 monitoring_sources.lastRunAt/lastStatus/lastError/lastCount
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `npx tsx scripts/crawl/monitor_catalogs.ts --help` exit 0
- [ ] --dry-run 在无 DB 环境下对 fixture 模式（MONITOR_FIXTURE_DIR）输出 3 源计数
- [ ] 人工断网时退出码 1 且 stderr 含每源错误
- [ ] `node scripts/check-docs-facts.mjs` exit 0（R10-01：本卡新增 route/page/spec 时同步期望值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
npx tsx scripts/crawl/monitor_catalogs.ts --help && MONITOR_FIXTURE_DIR=apps/web/lib/monitoring/catalog/__tests__/fixtures npx tsx scripts/crawl/monitor_catalogs.ts --source all --dry-run
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-062/`

## 允许修改
- `scripts/crawl/monitor_catalogs.ts`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-062/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-061
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-065
- 阻塞条件：无

## 建议执行档位
sonnect　理由：薄封装脚本，沿用 crawl_llmtest.ts 范式

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-065：E2E：后台监控页五态 + 手动运行后变更流出现新事件（fixture 源）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-009/013
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-009、REQ-M-013
- 来源方案：DESIGN-004 / ADR-P007

## 目标
e2e/admin/monitoring.spec.ts 在测试库 + MONITOR_FIXTURE_DIR 下跑通：登录管理员→进入 /admin/monitoring→运行 openrouter→变更流出现 ≥1 条 listed 事件；未授权用户见 forbidden 态

## 输入
- 文档：`docs/任务规划V0.10.0/03_solution/design/DESIGN-004-模型源监控体系.md`
- 契约：`MONITORING_UX_STATES`
- 前置任务：TASK-062, TASK-064, TASK-037, TASK-006
- 前置状态：TASK-062、TASK-064 已合并；e2e 唯一配置（TASK-037）与 CI e2e job（TASK-006）已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/admin/monitoring.spec.ts（新建）`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-065/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 复用 e2e/fixtures.ts 登录助手
2. [ ] fixture 模式运行脚本而非外网
3. [ ] 断言五态 testid 至少 ready/forbidden/empty 三态
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `npx playwright test e2e/admin/monitoring.spec.ts` 通过（CI e2e job）
- [ ] --list 计数 +≥3
- [ ] `node scripts/check-docs-facts.mjs` exit 0（R10-01：本卡新增 route/page/spec 时同步期望值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
npx playwright test e2e/admin/monitoring.spec.ts --config playwright.config.ts
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-065/`

## 允许修改
- `e2e/admin/monitoring.spec.ts`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-065/**`

## 禁止修改
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-062, TASK-064, TASK-037, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：CI 无 PG 服务 → 标记 待其他员工完成（依赖 TASK-006）

## 建议执行档位
sonnect　理由：E2E 脚本

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h


---

#### TASK-075：e2e：模型详情页基准弹窗与测评示例

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-01）

## 归属
- 所属切片：S11（模型多源上架与价格对比（前台可见））
- 来源需求：REQ-F-059
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-010、REQ-F-059
- 来源方案：同 074

## 目标
e2e 覆盖：打开/关闭基准弹窗、演示数据标识、测评示例空态与有数据态

## 输入
- 文档：`docs/任务规划V0.10.0/05_execution/tasks/TASK-074.md`
- 契约：`无`
- 前置任务：TASK-074, TASK-006
- 前置状态：TASK-074、TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/model-detail-benchmark.spec.ts（新建）`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-075/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 基于既有 e2e 登录/种子工具编写 4 个用例
2. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm test:e2e -g model-detail-benchmark` 全绿
- [ ] 用例数 ≥4
- [ ] `node scripts/check-docs-facts.mjs` exit 0（R10-01：本卡新增 route/page/spec 时同步期望值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm test:e2e -g model-detail-benchmark
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-075/`

## 允许修改
- `e2e/model-detail-benchmark.spec.ts`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-075/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-074, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：074 未合并

## 建议执行档位
sonnect　理由：按 074 验收写 e2e，模式既有

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-083：上线前 seed 演示数据人工审核门禁（清单生成 + 审核记录校验）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect** ｜ **条件卡：待 U-3（生产部署资源）裁决后下发**

> V0.10.0 状态：**条件·待裁决**｜V0.10.0：条件卡，待 U-3 裁决

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-03）

## 归属
- 所属切片：S8（生产部署实弹（含 RC-02 文档闭环））
- 来源需求：REQ-F-053
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-053
- 来源方案：需求文档:69

## 目标
脚本列出 seed 中全部 verifiedStatus=1 行并要求 docs 审核记录逐条覆盖，缺一即 exit 1

## 输入
- 文档：`docs/product/requirements/需求文档.md:69`；`apps/web/prisma/seed.ts:531`
- 契约：`无`
- 前置任务：TASK-042
- 前置状态：U-3 已裁决（进入上线准备）

## 输出
- 新增/修改的文件路径：
  - `scripts/release/check-seed-review.mjs（新建）`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-083/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 解析 seed.ts 收集行键
2. [ ] 比对审核记录文件（路径由 U-3 裁决时确定，默认 docs/plans/上线前seed审核.md）
3. [ ] CI 中仅在 release 分支启用
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] 审核记录缺失时 `node scripts/release/check-seed-review.mjs` exit 1
- [ ] 全覆盖时 exit 0
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/release/check-seed-review.mjs; echo exit=$?
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-083/`

## 允许修改
- `scripts/release/check-seed-review.mjs`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-083/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-042
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：U-3 未裁决

## 建议执行档位
sonnect　理由：脚本 + 清单，无业务决策

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 3h　≥2h


---

#### TASK-084：核验：天梯页无页脚 + 台账 #19 admin 配置治理收口状态

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**haiku**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖

> 历史（V0.4.0→V0.5.0）：V0.5.0 新增（FIX-12）

## 归属
- 所属切片：S6（测试资产与量级基线）
- 来源需求：REQ-NF-012 / REQ-L-014
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-L-014、REQ-NF-012
- 来源方案：需求文档:41；未完成事项目录.md:46

## 目标
e2e 断言 /models 与 /providers 无 footer；输出 #19 收口证据或缺口清单

## 输入
- 文档：`docs/product/requirements/需求文档.md:41`；`docs/plans/未完成事项目录.md:46`
- 契约：`无`
- 前置任务：TASK-006
- 前置状态：TASK-006 已合并

## 输出
- 新增/修改的文件路径：
  - `e2e/ladder-no-footer.spec.ts（新建）`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-084/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 两页各断言 footer 不存在
2. [ ] #19 逐项对照代码，结果写证据
3. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm test:e2e -g ladder-no-footer` 全绿或失败已登记
- [ ] 证据含 #19 逐项结论
- [ ] `node scripts/check-docs-facts.mjs` exit 0（R10-01：本卡新增 route/page/spec 时同步期望值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm test:e2e -g ladder-no-footer
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-084/`

## 允许修改
- `e2e/ladder-no-footer.spec.ts`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-084/**`

## 禁止修改
- `apps/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：无
- 阻塞条件：无

## 建议执行档位
haiku　理由：取证型 e2e 断言 + 台账核对

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
小　约 2h　≥2h


---

#### TASK-030：计费集成 e2e：优惠窗口内按优惠价扣费、窗外按原价

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Guard** ｜ 建议档位：**sonnect**

> V0.10.0 状态：**未开工**｜V0.10.0：可开工条件见依赖

> 历史（V0.4.0→V0.5.0）：沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）

## 归属
- 所属切片：S4（生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2））
- 来源需求：REQ-F-12 / REQ-F-07
- RTM 追溯（V0.10.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-F-038
- 来源方案：DESIGN-002

## 目标
e2e/tests/promotion-billing.spec.ts：建优惠（priceInput=0）→ 网关调用 → 用户余额不变且 usage_log quotaMinor=0 → 删除优惠 → 再调用 → 按原价扣费（逐分断言）

## 输入
- 文档：`e2e/tests/gateway-flow.spec.ts（参照）`
- 契约：`EffectivePriceSchema`；`PromotionPriceCreateSchema`
- 前置任务：TASK-029, TASK-006
- 前置状态：TASK-029 已合并；CI 注入 AIDEAN_ENABLE_MOCK_UPSTREAM=1

## 输出
- 新增/修改的文件路径：
  - `e2e/tests/promotion-billing.spec.ts`
  - `docs/任务规划V0.10.0/06_validation/evidence/EVD-030/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] admin 建优惠
2. [ ] 用户调网关
3. [ ] 查余额/流水
4. [ ] 清理
5. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `pnpm exec playwright test e2e/tests/promotion-billing.spec.ts --config e2e/playwright.config.ts --workers=1` 通过（TASK-037 收敛后改为根配置）
- [ ] `node scripts/check-docs-facts.mjs` exit 0（R10-01：本卡新增 route/page/spec 时同步期望值）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
pnpm exec playwright test e2e/tests/promotion-billing.spec.ts --config e2e/playwright.config.ts --workers=1
```

## 证据路径
`docs/任务规划V0.10.0/06_validation/evidence/EVD-030/`

## 允许修改
- `e2e/tests/promotion-billing.spec.ts`
- `docs/任务规划V0.10.0/06_validation/evidence/EVD-030/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.5.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/** … docs/任务规划V0.9.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-029, TASK-006
- 资源锁串行（同文件，须在其后执行）：无
- Blocks：TASK-031
- 阻塞条件：mock-upstream 未在 CI 启用 → 停止交 TASK-006 补 env

## 建议执行档位
sonnect　理由：E2E 脚本（mock-upstream 已有）

## 升级条件
2 次失败 → 升 opus；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 6h　≥2h


---

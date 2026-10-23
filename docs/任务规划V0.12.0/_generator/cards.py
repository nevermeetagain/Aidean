# V0.12.0 原子任务卡数据（唯一数据源；生成 tasks/、task-index、DAG、所有权、预算）
W = "apps/web"
DENY_COMMON = ["packages/shared/src/errors.ts（除 T120-20）", "packages/shared/src/schemas/**（除 T120-20）",
               f"{W}/prisma/migrations/**（除本卡显式列出的迁移目录）", "docs/任务规划V0.*/（历史版本只读，T120-08 除外）", ".example/**"]

C = []
def card(**k): C.append(k)

# ── S12-0 步行骨架：HEAD 全门禁真绿 ──
card(id="T120-01", name="DB 集成测试复绿并接入门禁（effective-price.int.spec 过期断言）", slice="S12-0", owner="外部助手A", tier="sonnect",
 reqs="REQ-NF-005 / REQ-L-009", src="10_/§9.2 完成定义（门禁口径）",
 goal="`RUN_DB_TESTS=1` 下 5 个 DB 集成用例全部通过，并提供一条可复跑的 `pnpm test:int` 入口。",
 inputs=["baseline.md §门禁：`effective-price.int.spec.ts:76` 期望 3 字段，实返 +isFree/+priceCache（自 491481c 起过期）", "前置：无"],
 outputs=[f"{W}/lib/features/pricing/__tests__/effective-price.int.spec.ts", f"{W}/package.json（仅新增 scripts.test:int）"],
 steps=["起本地 PG16（端口 3000-3100 外的 55432 仅限测试库），`prisma migrate deploy` 到空库", "先跑 `RUN_DB_TESTS=1 pnpm -C apps/web exec vitest run --dir lib -t int` 复现 1 failed", "把断言改为对返回对象做 `toMatchObject` 3 字段 + 显式断言 isFree 布尔、priceCache 结构（不放宽语义）", "新增 `test:int` 脚本（设置 RUN_DB_TESTS=1 并只匹配 *.int.spec.ts）", "复跑两次均 0 failed，记录用时"],
 acc=["`pnpm -C apps/web test:int` exit=0，5/5 passed", "未改任何非测试源码（git diff --stat 仅 2 文件）", "断言未删除原 3 字段校验"],
 cmd="RUN_DB_TESTS=1 DATABASE_URL=postgresql://postgres@127.0.0.1:55432/aidean_int pnpm -C apps/web test:int",
 allow=[f"{W}/lib/features/pricing/__tests__/effective-price.int.spec.ts", f"{W}/package.json"], deny=DENY_COMMON,
 dep=[], blocks=["T120-03", "T120-36"], stop="若失败原因不是断言过期而是计价逻辑回归 → 停，报 Hark", size="小（≈1.5h，与 T120-03 同批下发）")

card(id="T120-02", name="中间件去 Prisma 依赖（Edge 运行时警告根除）", slice="S12-0", owner="外部助手B", tier="sonnect",
 reqs="REQ-NF-011 / REQ-C-001", src="ADR-0012",
 goal="`middleware.ts` 的依赖闭包不再含 `@prisma/client`，`next build` 无 Edge `setImmediate` 警告，middleware 体积从 163 kB 下降。",
 inputs=["baseline.md：middleware 163 kB；链路 auth/constants.ts → lib/db/prisma.ts", "契约：Identity（会话 Cookie 名、JWT claims）不变"],
 outputs=[f"{W}/lib/features/auth/constants.ts", f"{W}/lib/features/auth/edge-constants.ts（新）", f"{W}/middleware.ts"],
 steps=["用 `next build` 输出与 esbuild metafile 定位 middleware 闭包中所有 node-only 模块（已知入口：`constants.ts:59` 起从 DB 读 `security.accessTokenTtlMinutes` 的函数）", "把 Edge 需要的常量与纯函数拆到 `edge-constants.ts`（零 node 依赖）；读 DB 配置的 TTL 函数留在 node 侧，只由 route handler 调用", "`constants.ts` 改为从 edge-constants 重导出，保持既有导入点不变", "新增守卫用例：解析 middleware 导入图，出现 prisma/ioredis 即失败", "build 前后对比 middleware 体积与警告行"],
 acc=["`next build` 输出无 `setImmediate`/Edge 不兼容警告", "middleware First Load < 163 kB（记录新值）", "守卫用例在故意引入 prisma 时 FAIL（变异检验落证据）", "tsc/lint/vitest 全 0"],
 cmd="pnpm -C apps/web build 2>&1 | tee /tmp/b.log; ! grep -n 'setImmediate' /tmp/b.log",
 allow=[f"{W}/middleware.ts", f"{W}/lib/features/auth/constants.ts", f"{W}/lib/features/auth/edge-constants.ts", "scripts/guard/edge-imports.mjs", "docs/ADR/ADR-0012-*.md"], deny=DENY_COMMON,
 dep=[], blocks=["T120-21"], stop="若需改 Cookie 名或 JWT claim 形状 → 停（属契约变更）", size="中（≈3h）")

card(id="T120-03", name="全量 e2e 在 Next 15.5.28 上跑通 + 3333 端口用例清理", slice="S12-0", owner="外部助手A", tier="sonnect",
 reqs="REQ-NF-005 / REQ-C-006", src="P-1/P-2=A（3333 不保留，子平台 3200）",
 goal="根 `playwright.config.ts` 全量 e2e 在 HEAD 上 0 failed；仓内不再有以 3333 为前提的断言。",
 inputs=["v011_status：Next 升级后无全量 e2e 读数", "rtm：`e2e/web/sso-3333.spec.ts`、`lib/features/auth/__tests__/oauth-redirect-origin.spec.ts:45-65` 仍假设 3333", "前置：T120-01"],
 outputs=["e2e/web/sso-3333.spec.ts（改名为 sso-subplatform.spec.ts）", f"{W}/lib/features/auth/__tests__/oauth-redirect-origin.spec.ts", "docs/任务规划V0.12.0/06_validation/evidence/EVD-T120-03/"],
 steps=["按 e2e/global-setup.ts 起库与 dev（端口 3000）", "全量执行一次，按失败分类：环境 / 用例过期 / 真缺陷", "用例过期：改断言；真缺陷：只登记不修，转 Hark", "3333 → 读 seed 中子平台回调（3200）或改为环境变量门控", "第二次全量执行 0 failed，截取汇总"],
 acc=["全量 e2e 0 failed（skip 数与原因逐条列出）", "`grep -rn 3333 e2e apps/web/lib --include=*.ts` = 0", "真缺陷清单（若有）已写入 EVD 并抄送 Hark"],
 cmd="pnpm exec playwright test -c playwright.config.ts --reporter=line",
 allow=["e2e/**", f"{W}/lib/features/auth/__tests__/oauth-redirect-origin.spec.ts"], deny=DENY_COMMON + [f"{W}/app/**", f"{W}/components/**", "e2e/admin/monitoring.spec.ts", "e2e/web/password.spec.ts", "e2e/web/dock.spec.ts"],
 dep=["T120-01"], blocks=["T120-35", "T120-36"], stop="同一用例两次修改仍失败 → 停，标 blocked", size="中（≈4h）")

card(id="T120-04", name="Docker 镜像真构建 + 容器内 run-due 调度验证（RK-11-07）", slice="S12-0", owner="外部助手A", tier="sonnect",
 reqs="REQ-N-022", src="U-3 局部解冻（仅 RK-11-07）",
 goal="在有 Docker 的 Windows/Linux 机上 `docker build` 成功，容器内以 nextjs 用户执行 run-due 产生 1 条 ScriptExecution。",
 inputs=["EVD-RK-11-07/（沙箱无 docker，3 项待确认）", "deploy/web/Dockerfile、scripts/build/bundle-scripts.mjs"],
 outputs=["docs/任务规划V0.12.0/06_validation/evidence/EVD-T120-04/"],
 steps=["`docker build -f deploy/web/Dockerfile .`，记录镜像体积", "容器内确认 scripts-dist 存在、alpine/musl 下 tsx/node 可执行", "以 nextjs 用户调用 run-due（或直接执行 fx_daily），检查 DB 新增执行记录", "失败只登记，不改 Dockerfile（属 U-3 范围外）"],
 acc=["docker build exit=0", "容器内 1 条 ScriptExecution status=成功", "证据含镜像 digest 与执行日志 ≤40 行"],
 cmd="docker build -f deploy/web/Dockerfile -t aidean:v120 . && docker run --rm --env-file .env.docker aidean:v120 node scripts-dist/run-due.js",
 allow=["docs/任务规划V0.12.0/06_validation/evidence/EVD-T120-04/**"], deny=DENY_COMMON + ["deploy/**", f"{W}/**"],
 dep=[], blocks=["T120-36"], stop="无 Docker 环境 → 标 blocked:no-docker，不得以沙箱结果代替", size="小（≈2h）")

card(id="T120-05", name="环境变量清单归一（.env.example ↔ process.env）+ 启动期 zod 校验", slice="S12-0", owner="外部助手A", tier="sonnect",
 reqs="REQ-NF-003 / REQ-C-001", src="baseline.md §env：引用 34 / 示例 41 / 缺 20 / 冗余 27",
 goal="所有被代码读取的变量都出现在 `apps/web/.env.example` 且带注释；缺必需变量时服务启动即报出变量名。",
 inputs=["/workspace 基线 env-referenced.txt / env-example.txt（随 EVD 附）", "必需变量：JWT_PRIVATE_KEY、BILLING_NOTIFY_SECRET、DATABASE_URL 等（以代码读取为准）"],
 outputs=[f"{W}/.env.example", f"{W}/lib/config/env.ts（新）", f"{W}/lib/config/__tests__/env.spec.ts（新）"],
 steps=["脚本列出 `process.env.X` 全集与三份 example 差集", "补齐缺失 20 项（含用途/示例值/是否必需）；冗余 27 项中 docker compose 使用的保留并标注", "新增 env.ts：zod 分必需/可选，导出 `getEnv()`；只在 instrumentation 启动时调用一次", "单测：缺必需变量时报错信息含变量名"],
 acc=["差集脚本输出 referenced−example = ∅", "env.spec 3 例通过", "不改任何既有读取点的默认值语义"],
 cmd="node scripts/guard/env-diff.mjs && pnpm -C apps/web exec vitest run lib/config",
 allow=[f"{W}/.env.example", f"{W}/lib/config/**", f"{W}/instrumentation.ts", "scripts/guard/env-diff.mjs"], deny=DENY_COMMON,
 dep=[], blocks=["T120-36"], stop="若某变量用途无法从代码判断 → 在 example 中标 `# TODO(用途待确认)` 并报 Hark，不猜默认值", size="小（≈2h）")

# ── S12-1 真相归一（文档/追溯） ──
card(id="T120-06", name="需求追溯矩阵 V0.12 再生成（150 行）+ facts 断言改为动态读取", slice="S12-1", owner="外部助手A", tier="sonnect",
 reqs="REQ-L-009 / REQ-N-030", src="ADR-0011 §3",
 goal="`docs/product/requirements/需求追溯矩阵.md` 升 v2.0，行集与 `03a_统一需求追溯矩阵.md` 一致；`check-docs-facts` 的行数断言改读矩阵本身而非写死 158。",
 inputs=["docs/任务规划V0.12.0/03a_统一需求追溯矩阵.md（本规划产物，150 行）", "scripts/check-docs-facts.mjs rtm-row-count"],
 outputs=["docs/product/requirements/需求追溯矩阵.md", "scripts/check-docs-facts.mjs"],
 steps=["以 03a 为唯一输入生成矩阵正文（保留 v1.0 的列定义，新增「V0.12 卡」列）", "facts：rtm 行数 = 矩阵表格行数，且每个 REQ-id 唯一", "需求文档.md 对矩阵的链接改指 v2.0 锚点"],
 acc=["check-docs-facts 全通过且新断言在删一行时 FAIL（变异检验）", "矩阵 150 行、REQ-id 无重复", "版本头 v2.0"],
 cmd="node scripts/check-docs-facts.mjs && node scripts/check-docs-rule.mjs",
 allow=["docs/product/requirements/**", "scripts/check-docs-facts.mjs"], deny=DENY_COMMON + [f"{W}/**"],
 dep=[], blocks=["T120-36"], stop="03a 与代码现状出现新不一致 → 只登记到 EVD，不改 03a", size="中（≈3h）")

card(id="T120-07", name="V0.11.0 文档收口（README 重写、卡状态回写、裁决同步、CHANGELOG）", slice="S12-1", owner="外部助手A", tier="haiku",
 reqs="REQ-C-008 / REQ-L-008", src="v011_status §3",
 goal="V0.11.0 README ≤150 行且无单行 >400 字符；07_/12_ 中已合并卡与已裁决项状态与 git 一致；CHANGELOG 增 V0.11.0 段。",
 inputs=["v011_status.md（卡→提交号映射；Q-11-01…05、U-24 已裁决；B11-09/10/11 已合并）"],
 outputs=["docs/任务规划V0.11.0/README.md", "docs/任务规划V0.11.0/07_原子任务卡全集.md", "docs/任务规划V0.11.0/12_风险与待裁决.md", "CHANGELOG.md"],
 steps=["README：保留一句话结论、卡状态表（含提交号）、待裁决剩余项；历史版本头折叠为 1 行指针到 25_", "07_/12_：只改状态列与裁决结论，不改卡面内容", "CHANGELOG：按卡列 V0.11.0 变更"],
 acc=["README 行数 ≤150、最长行 ≤400 字符（node 探针输出）", "07_ 中 B11-09/10/11 状态=已合并且附提交号", "check-docs-rule 通过"],
 cmd="node -e \"const t=require('fs').readFileSync('docs/任务规划V0.11.0/README.md','utf8').split('\\n');console.log(t.length,Math.max(...t.map(l=>l.length)))\" && node scripts/check-docs-rule.mjs",
 allow=["docs/任务规划V0.11.0/README.md", "docs/任务规划V0.11.0/07_原子任务卡全集.md", "docs/任务规划V0.11.0/12_风险与待裁决.md", "CHANGELOG.md"], deny=DENY_COMMON[:4],
 dep=[], blocks=["T120-36"], stop="无", size="小（≈1.5h，与 T120-09 同批）")

card(id="T120-08", name="文档索引 / 目录结构文档 数字与版本校正 + 超 3000 字文档拆分", slice="S12-1", owner="外部助手A", tier="sonnect",
 reqs="REQ-C-008（铁律 6）", src="v011_status §3：文档索引 9/30 版本号错、数字过期",
 goal="《文档索引》《目录结构文档》中的计数与版本与 `check-docs-rule` 真源一致；`docs/plans/未完成事项目录.md` 等超限文档按模块拆分。",
 inputs=["baseline.md（58 页 / 166 route / 73 model / 210 spec 文件口径）", "铁律 6"],
 outputs=["docs/文档索引.md", "docs/governance/目录结构文档.md", "docs/plans/**（拆分产物）"],
 steps=["写一次性探针列出全部 docs/*.md 的版本头与字数，生成对照表", "校正索引中的版本与数字；目录结构文档补 Combobox/MatrixPanel/scripts/guard/新迁移", "拆分超 3000 字的非历史文档（任务规划V0.* 历史目录除外），原位留跳转"],
 acc=["索引中每条版本号 = 文件版本头（探针 0 差异）", "目录结构文档覆盖 `git ls-files` 一级/二级目录 100%", "check-docs-rule 通过"],
 cmd="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
 allow=["docs/文档索引.md", "docs/governance/目录结构文档.md", "docs/plans/**"], deny=DENY_COMMON,
 dep=[], blocks=["T120-36"], stop="无", size="中（≈3h）")

card(id="T120-09", name="产品文档与代码不一致修订（02_ §四 中归属本卡的 6 条）", slice="S12-1", owner="外部助手A", tier="haiku",
 reqs="REQ-C-008", src="03_需求基线复核 §3.3 冲突清单 + 02_ §四 不一致清单",
 goal="02_事实基线 §四 中标注「T120-09」的 6 条『文档≠代码』逐条以代码为真改文档；属于待裁决的只加标注（不改代码）。",
 inputs=["02_事实基线.md §四（逐条带代码锚点）", "12_风险与待裁决.md（需裁决的条目不得自行改）"],
 outputs=["docs/product/design/功能设计文档.md", "docs/product/design/界面交互文档.md", "docs/product/requirements/需求文档.md"],
 steps=["逐条核对代码锚点仍成立", "非裁决类直接改文档并升版本头", "裁决类（Q-12-02/04/05/06）只加『待裁决』标注"],
 acc=["§四 标注 T120-09 的 6 条每条有处置结果（改 / 待裁决标注）", "check-docs-rule 通过"],
 cmd="node scripts/check-docs-rule.mjs",
 allow=["docs/product/**"], deny=DENY_COMMON + [f"{W}/**", "docs/product/design/UI设计文档.md", "docs/product/requirements/需求追溯矩阵.md"],
 dep=["T120-06"], blocks=["T120-36"], stop="代码锚点已变 → 只记录不改", size="小（≈1.5h）")

# ── S12-2 监控调度闭环（Hark 核心） ──
card(id="T120-10", name="ADR-0011 监控执行模型 + V0.12 契约落地到 @aidean/shared", slice="S12-2", owner="Hark", tier="opus",
 reqs="REQ-M-002 / REQ-M-009 / REQ-M-011 / REQ-N-012 / REQ-N-010", src="04_契约冻结包.md",
 goal="把本规划 `contracts/` 中的 V0.12 增量（监控运行、改密/找回、渠道探测、可靠性读取、新增错误码 1 个）落地到 `packages/shared`，并生成契约测试。",
 inputs=["docs/任务规划V0.12.0/contracts/*.contract.ts", "packages/shared/src/errors.ts（唯一错误码源）"],
 outputs=["packages/shared/src/errors.ts", "packages/shared/src/schemas/{auth,monitoring,user}.schema.ts", "packages/shared/src/__tests__/contract/v120.contract.spec.ts（新）", "docs/ADR/ADR-0011-监控执行模型与调度统一.md"],
 steps=["ADR-0011：run-now = 写 `monitor_run_requests` 意图行 + sidecar 消费；cadenceCron 由 run-due 统一判定", "按 contracts 原样落地 zod schema 与错误码 30005", "生成契约测试：每个 schema 正/反例各 ≥1；错误码表与 DEFAULT_STATUS_BY_CODE 一致", "API 接口文档.md 登记新端点与错误码（铁律 2 锚点互引）"],
 acc=["shared vitest 全通过，新增契约测试 ≥10 例", "ERROR_CODES 新增恰 1 个（30005），无既有码值变动（diff 断言）", "ADR-0011 状态=已接受"],
 cmd="pnpm -C packages/shared exec vitest run && node scripts/check-docs-rule.mjs",
 allow=["packages/shared/src/**", "docs/ADR/ADR-0011-*.md", "docs/specs/API接口文档.md", "docs/architecture/API架构设计方案.md"], deny=[".example/**", f"{W}/**"],
 dep=[], blocks=["T120-11", "T120-12", "T120-15", "T120-19", "T120-20", "T120-21", "T120-25"], stop="若需改动既有码值或既有 schema 字段 → 升 fable 裁决", size="中（≈4h）")

card(id="T120-11", name="monitor_catalogs 纳入 ScheduledScript + 按源 cadenceCron 判定 due", slice="S12-2", owner="外部助手B", tier="sonnect",
 reqs="REQ-M-002 / REQ-M-009", src="ADR-0011",
 goal="空库 migrate+seed 后，run-due 在源 cron 到期时自动执行 monitor_catalogs，各源 lastRunAt/lastStatus 被更新。",
 inputs=["seed.ts:307-324（未登记 monitor_catalogs）", "scripts/crawl/monitor_catalogs.ts", f"{W}/lib/features/admin/script-executor.ts", "前置：T120-10"],
 outputs=[f"{W}/prisma/migrations/20261024000000_monitor_catalogs_script/", f"{W}/prisma/seed.ts", "scripts/crawl/monitor_catalogs.ts", f"{W}/lib/monitoring/schedule.ts（新）"],
 steps=["数据迁移：幂等插入 ScheduledScript(monitor_catalogs, cron='*/15 * * * *' 作为扫描节拍)", "schedule.ts：纯函数 `dueSources(sources, now)` 用 cadenceCron 判定，单测覆盖 DST 无关的上海时区边界", "monitor_catalogs 只采集 due 的源；单源异常不影响其他源", "集成测：注入时钟 → 仅 due 源被调用"],
 acc=["`dueSources` 单测 ≥8 例（含非法 cron → 跳过并记 lastError）", "DB 集成：run-due 一次后 due 源 lastRunAt 更新、非 due 源不变", "迁移在空库与已有库均幂等（跑两次无报错）"],
 cmd="pnpm -C apps/web exec vitest run lib/monitoring && RUN_DB_TESTS=1 pnpm -C apps/web test:int",
 allow=[f"{W}/prisma/migrations/20261024000000_monitor_catalogs_script/**", f"{W}/prisma/seed.ts", "scripts/crawl/monitor_catalogs.ts", f"{W}/lib/monitoring/**"], deny=DENY_COMMON[:2] + [".example/**"],
 dep=["T120-10", "T120-01"], blocks=["T120-12", "T120-15"], stop="cron 解析库需新增依赖 → 先评估体积，>30 kB 停下改用最小解析器", size="中（≈5h）")

card(id="T120-12", name="后台『立即运行』真执行（意图表 + sidecar 消费 + 防重入 + 审计）", slice="S12-2", owner="Hark", tier="opus",
 reqs="REQ-M-011", src="ADR-0011",
 goal="POST /admin/monitoring/sources/{key}/run 返回 202 后 ≤1 个调度节拍内真实采集一次；并发重复请求只执行一次。",
 inputs=["run/route.ts（现只占 Redis 锁，无消费者）", "contracts/07b-monitoring-run.contract.ts", "前置：T120-11"],
 outputs=[f"{W}/prisma/migrations/20261024010000_monitor_run_requests/", f"{W}/app/api/v1/admin/monitoring/sources/[key]/run/route.ts", f"{W}/lib/monitoring/run-requests.ts（新）", "scripts/crawl/monitor_catalogs.ts"],
 steps=["新表 monitor_run_requests(id, source_key, requested_by, status pending|running|done|failed, result_count, error, created_at, started_at, finished_at；字段与索引以 05_ §2.1 为准) + 部分唯一索引 (source_key) WHERE status IN ('pending','running')", "route：插入意图行（唯一冲突 → 10006 429），写审计", "monitor_catalogs：先领取 pending（UPDATE…RETURNING 原子领取），执行后回写", "GET /runs 端点：分页返回运行历史（默认 pageSize=10，上限 50，契约 07b）", "Redis 锁保留为可失降级，不再是唯一防线"],
 acc=["并发 10 次 POST 只产生 1 行 pending（集成测）", "领取→执行→done 全链路集成测通过", "失败路径写 error 且源 lastStatus=failed", "非管理员 403（契约测）"],
 cmd="RUN_DB_TESTS=1 pnpm -C apps/web test:int && pnpm -C apps/web exec vitest run app/api/v1/admin/monitoring",
 allow=[f"{W}/prisma/migrations/20261024010000_monitor_run_requests/**", f"{W}/prisma/schema.prisma", f"{W}/app/api/v1/admin/monitoring/**", f"{W}/lib/monitoring/**", "scripts/crawl/monitor_catalogs.ts"], deny=DENY_COMMON[:2] + [".example/**"],
 dep=["T120-11"], blocks=["T120-15"], stop="无", size="中（≈5h）")

card(id="T120-13", name="可靠性观测落库（幂等唯一键迁移 + llmtest 写入）", slice="S12-3", owner="Hark", tier="opus",
 reqs="REQ-M-008", src="TASK-073/099 遗留：幂等键缺唯一索引",
 goal="crawl_llmtest 每次运行把 composite 观测 upsert 进 reliability_observations；同一站点同一上海日重复运行不产生重复行。",
 inputs=[f"{W}/lib/discovery/llmtest-observations.ts（纯映射已就绪）", "schema.prisma:2126 ReliabilityObservation（无唯一键）"],
 outputs=[f"{W}/prisma/migrations/20261024020000_reliability_obs_unique/", f"{W}/prisma/schema.prisma", "scripts/crawl/crawl_llmtest.ts", f"{W}/lib/discovery/llmtest-persist.ts（新）"],
 steps=["迁移：先按 (entity_type, entity_id, window_start) 去重保留最新，再建唯一索引", "persist：`createMany` 改为逐键 upsert（批 100），返回 written/skipped", "crawl_llmtest 调用 persist；skipped 计入执行日志", "集成测：同批跑两次行数不变"],
 acc=["迁移在含重复数据的库上成功（集成测造数）", "重复运行行数不变", "skipped 原因可在 ScriptExecution 日志中看到"],
 cmd="RUN_DB_TESTS=1 pnpm -C apps/web test:int",
 allow=[f"{W}/prisma/migrations/20261024020000_reliability_obs_unique/**", f"{W}/prisma/schema.prisma", "scripts/crawl/crawl_llmtest.ts", f"{W}/lib/discovery/**"], deny=DENY_COMMON[:2] + [".example/**"],
 dep=["T120-01", "T120-12"], blocks=["T120-14"], stop="去重需删除 >1000 行 → 停，先报用户（破坏性）", size="中（≈4h）")

card(id="T120-14", name="可靠性读侧 API + 服务平台/模型详情可靠性展示", slice="S12-3", owner="外部助手B", tier="sonnect",
 reqs="REQ-M-008 / REQ-M-006", src="contracts/07c-reliability.contract.ts",
 goal="服务平台详情与模型详情的『在哪调用』区块显示近 7 日可用率迷你图与最后存活时间；无数据显示空态而非 0%。",
 inputs=["T120-13 产出的观测数据", "components/models/*offerings*（现有区块）"],
 outputs=[f"{W}/app/api/v1/stations/[id]/reliability/route.ts（新）", f"{W}/lib/monitoring/reliability-read.ts（新）", f"{W}/components/models/ReliabilitySpark.tsx（新）"],
 steps=["读侧：按 entity 取近 7 个上海日，缺日留空不插值", "UI：Spark + 文本替代（a11y），五态齐全", "缓存：Redis 10 分钟，失效于 persist 写入后"],
 acc=["API 契约测（含 404、空数组）", "无观测数据时 UI 显示『暂无观测』而非 0%（组件测）", "axe serious/critical=0"],
 cmd="pnpm -C apps/web exec vitest run lib/monitoring components/models",
 allow=[f"{W}/app/api/v1/stations/**", f"{W}/lib/monitoring/**", f"{W}/components/models/**"], deny=DENY_COMMON,
 dep=["T120-13", "T120-10", "T120-26", "T120-16"], blocks=["T120-36"], stop="无", size="中（≈4h）")

card(id="T120-15", name="后台监控页运营化（运行队列、历史、立即运行反馈、频率生效提示）", slice="S12-2", owner="外部助手B", tier="sonnect",
 reqs="REQ-M-011 / REQ-M-013", src="UI设计文档 §五态 + 界面交互文档 管理台",
 goal="管理员在 /admin/monitoring 点『立即运行』后可看到 pending→running→done 状态变化与结果条数，改频率后显示下一次运行时间。",
 inputs=["components/admin/monitoring/{MonitoringPanel,SourceTable}.tsx", "T120-12 状态端点"],
 outputs=[f"{W}/components/admin/monitoring/**"],
 steps=["SourceTable 增『下次运行』列（由 cadenceCron 计算）", "立即运行：乐观 pending + 轮询 5s（最多 2 分钟）+ 失败 toast", "运行历史抽屉：最近 10 条", "testid 与五态外壳"],
 acc=["e2e：点击运行 → 状态变为 done（mock 调度）", "五态截图 5 张", "axe 0 serious"],
 cmd="pnpm -C apps/web exec vitest run components/admin/monitoring && pnpm exec playwright test e2e/admin/monitoring.spec.ts",
 allow=[f"{W}/components/admin/monitoring/**", "e2e/admin/monitoring.spec.ts"], deny=DENY_COMMON,
 dep=["T120-12", "T120-26"], blocks=["T120-36"], stop="无", size="中（≈4h）")

# ── S12-4 合规展示 ──
card(id="T120-16", name="Artificial Analysis 署名展示（M-015 MUST）", slice="S12-4", owner="外部助手A", tier="sonnect",
 reqs="REQ-M-015", src="U-M2",
 goal="凡展示 AA 指数的位置（天梯、模型详情、对比）均出现『数据来源：Artificial Analysis』并链接其官网。",
 inputs=["lib/sync/adapters/artificial-analysis.ts（sourceName='artificial-analysis'）", "grep 'Artificial Analysis' components/app = 0"],
 outputs=[f"{W}/components/site/SourceAttribution.tsx（新）", f"{W}/components/ladder/**（仅插入署名）", f"{W}/components/models/**（仅插入署名）"],
 steps=["列出所有渲染 AA 指标的组件", "新组件 SourceAttribution(source) 统一文案与链接（rel=noopener）", "逐处插入；无 AA 数据时不渲染"],
 acc=["e2e/组件测：含 AA 数据的页面可见署名文本", "无 AA 数据页面不出现署名", "对比度达标"],
 cmd="pnpm -C apps/web exec vitest run components/site && grep -rn 'SourceAttribution' apps/web/components | wc -l",
 allow=[f"{W}/components/site/SourceAttribution.tsx", f"{W}/components/ladder/**", f"{W}/components/models/**"], deny=DENY_COMMON + [f"{W}/components/models/ReliabilitySpark.tsx"],
 dep=[], blocks=["T120-36"], stop="署名文案需要法务确认 → 用 U-M2 原文，不自拟", size="小（≈2h）")

card(id="T120-17", name="〔条件卡·Q-12-01〕多源可调用对外放行", slice="S12-4", owner="外部助手A", tier="sonnect",
 reqs="REQ-M-006 / REQ-N-032", src="Q-12-01（BLOCKING）",
 goal="按 Q-12-01 裁决结果，公开 offerings 在默认部署下不再恒为空（A/C）或显式显示『条款核验中』（B）。",
 inputs=["lib/monitoring/offerings.ts:25（放行口径）", "seed.ts:1237（tosStatus='pending'）"],
 outputs=[f"{W}/prisma/seed.ts（仅 tosStatus 值）", f"{W}/components/models/**（B 方案空态文案）"],
 steps=["A：按用户给出的逐源核验结论改 seed tosStatus", "B：前台空态改为『条款核验中』并附说明", "C：后台源表增『对外放行』开关（需 Hark 先补契约，转 Hark）"],
 acc=["A/C：默认 seed 下 /api/v1/models/{id}/offerings 至少返回 1 源", "B：前台空态文案可见", "公开 API 仍不泄露 forbidden 源"],
 cmd="pnpm -C apps/web exec vitest run lib/monitoring",
 allow=[f"{W}/prisma/seed.ts", f"{W}/components/models/**"], deny=DENY_COMMON + [f"{W}/lib/monitoring/offerings.ts", f"{W}/components/**/__tests__/**"],
 dep=["T120-10", "T120-11", "T120-14", "T120-29"], blocks=[], stop="未裁决不得开工", size="小（≈1–2h）", cond="Q-12-01")

# ── S12-5 账户安全（Hark 核心） ──
card(id="T120-18", name="会话校验比对 tokenVersion（改密/封禁全端即时失效）", slice="S12-5", owner="Hark", tier="opus",
 reqs="REQ-NF-011", src="ADR-0012",
 goal="tokenVersion 自增后，旧 access token 在下一次请求即被拒（401），不再依赖 15 分钟自然过期。",
 inputs=[f"{W}/lib/features/auth/session.ts:53-66（requireUserApi 回库但不比 ver）", "Identity 契约：claims.ver"],
 outputs=[f"{W}/lib/features/auth/session.ts", f"{W}/lib/features/auth/__tests__/session-ver.spec.ts（新）"],
 steps=["requireUserApi/requireAdminApi：回库投影加 tokenVersion，与 claims.ver 不等 → UNAUTHENTICATED", "在既有回库查询（status/deletedAt）中追加 tokenVersion 投影——不新增往返；仅当该查询被测为热点时才启用 Redis user:ver:{id}（60s，自增处同步 DEL）", "单测：ver 相等 / 不等 / 用户已删除 / admin 路径四类"],
 acc=["单测 ≥6 例", "封禁用户后旧 token 下一请求 401（集成测）", "无新增 DB 往返（对 prisma 调用次数断言）"],
 cmd="pnpm -C apps/web exec vitest run lib/features/auth",
 allow=[f"{W}/lib/features/auth/session.ts", f"{W}/lib/features/auth/session-store.ts", f"{W}/lib/features/auth/__tests__/session-ver.spec.ts", f"{W}/app/api/v1/admin/users/**"], deny=DENY_COMMON,
 dep=["T120-02"], blocks=["T120-19", "T120-20"], stop="无", size="中（≈3h）")

card(id="T120-19", name="已登录改密 API（旧密校验 + tokenVersion++ + 刷新令牌吊销）", slice="S12-5", owner="外部助手B", tier="sonnect",
 reqs="REQ-N-012", src="contracts/03b-identity-password.contract.ts",
 goal="POST /api/v1/auth/password 成功后：其他设备全部登出，本设备获得新令牌对。",
 inputs=["lib/features/auth/password.ts（哈希）", "contracts/03b", "前置：T120-10、T120-18"],
 outputs=[f"{W}/app/api/v1/auth/password/route.ts（新）", f"{W}/lib/features/auth/service.ts"],
 steps=["校验旧密（失败 INVALID_CREDENTIALS，计入登录限流桶）", "事务：更新哈希 + tokenVersion++ + 吊销该用户全部 refresh", "签发新令牌对写 Cookie", "审计：password.change"],
 acc=["契约测：成功 / 旧密错 / 新密弱 / 未登录 4 路径", "改密后另一会话下一请求 401（集成测）", "限流命中 429"],
 cmd="pnpm -C apps/web exec vitest run app/api/v1/auth lib/features/auth",
 allow=[f"{W}/app/api/v1/auth/password/**", f"{W}/lib/features/auth/**"], deny=DENY_COMMON + [f"{W}/lib/features/auth/__tests__/oauth-redirect-origin.spec.ts", f"{W}/lib/features/auth/constants.ts", f"{W}/lib/features/auth/edge-constants.ts"],
 dep=["T120-10", "T120-18"], blocks=["T120-21"], stop="无", size="中（≈3h）")

card(id="T120-20", name="找回密码（邮件验证码 purpose=reset，防枚举，限流）", slice="S12-5", owner="Hark", tier="opus",
 reqs="REQ-N-012", src="contracts/03b；登录方案实施手册 E-S2（既有邮箱验证码服务）",
 goal="未登录用户凭邮箱验证码重置密码；对不存在邮箱的请求表现与存在时一致；重置后全端失效。",
 inputs=[f"{W}/lib/features/auth/email-code.ts（既有：60s/每日 10 封，Redis 固定窗口）", "mailer.ts sendCodeMail"],
 outputs=[f"{W}/app/api/v1/auth/password/reset/route.ts（新）", f"{W}/lib/features/auth/email-code.ts"],
 steps=["email-code 增 purpose 维度（login|reset），键空间隔离", "reset/code：恒返回 {sent:true}", "reset：校验码（5 次错误即作废）→ 改哈希 → tokenVersion++ → 吊销 refresh", "审计：password.reset"],
 acc=["不存在邮箱与存在邮箱响应体与状态码一致（契约测）", "验证码复用/过期/错 5 次三路径", "登录码不能用于重置（purpose 隔离测）"],
 cmd="pnpm -C apps/web exec vitest run app/api/v1/auth lib/features/auth",
 allow=[f"{W}/app/api/v1/auth/password/**", f"{W}/lib/features/auth/**"], deny=DENY_COMMON + [f"{W}/lib/features/auth/__tests__/oauth-redirect-origin.spec.ts", f"{W}/lib/features/auth/constants.ts", f"{W}/lib/features/auth/edge-constants.ts"],
 dep=["T120-10", "T120-18", "T120-19"], blocks=["T120-21"], stop="若生产无 SMTP 配置 → 功能按开关 auth.password_reset 默认关，不阻塞合并", size="中（≈4h）")

card(id="T120-21", name="改密 / 找回密码页面（用户端）", slice="S12-5", owner="外部助手B", tier="sonnect",
 reqs="REQ-N-012", src="UI设计文档 §表单；界面交互文档 登录",
 goal="/user/console 安全分区可改密；/login 有『忘记密码』入口进入两步重置流程；全程键盘可完成。",
 inputs=["T120-19、T120-20 API", "@aidean/ui Input/Button/Label"],
 outputs=[f"{W}/app/(site)/forgot-password/page.tsx（新）", f"{W}/components/user/PasswordForm.tsx（新）", f"{W}/app/(site)/login/page.tsx（仅加入口链接）"],
 steps=["表单：行内校验（失焦）+ 提交 loading + 错误映射 ERROR_CODES", "重置两步：发码（60s 倒计时）→ 输码+新密", "成功后跳转登录并 toast"],
 acc=["e2e：重置全流程（mailer mock）", "axe 0 serious/critical；390 视口无溢出", "所有错误码有对应中文提示"],
 cmd="pnpm exec playwright test e2e/web/password.spec.ts",
 allow=[f"{W}/app/(site)/forgot-password/**", f"{W}/components/user/PasswordForm.tsx", f"{W}/app/(site)/login/page.tsx", f"{W}/app/(site)/user/console/**", "e2e/web/password.spec.ts"], deny=DENY_COMMON,
 dep=["T120-19", "T120-20", "T120-02"], blocks=["T120-36"], stop="无", size="中（≈4h）")

# ── S12-6 用户端体验 ──
card(id="T120-22", name="Dock 常驻折叠：收藏 / 对比 两 Tab（客服 Tab 依 Q-12-03）", slice="S12-6", owner="外部助手B", tier="sonnect",
 reqs="REQ-N-009 / REQ-F-043", src="界面交互文档 Dock；Q-12-03",
 goal="右下角 Dock 在桌面与移动端均常驻（可折叠不可关闭），收藏 Tab 读写 /api/v1/user/favorites，受功能开关控制。",
 inputs=[f"{W}/components/site/CompareDock.tsx（items=0 不渲染、sm 以下隐藏）", "/api/v1/user/favorites（既有）"],
 outputs=[f"{W}/components/site/Dock/**（新）", f"{W}/components/site/CompareDock.tsx（改为 Dock 子面板）", f"{W}/app/(site)/layout.tsx（挂载点）"],
 steps=["Dock 外壳：折叠态 48px 圆角胶囊，展开 360px 面板；焦点陷阱与 Esc 折叠", "收藏 Tab：未登录引导登录；列表虚拟化 >50 条", "对比 Tab 复用现有对比篮逻辑", "移动端底部抽屉形态", "开关：ui.dock（缺省开）"],
 acc=["e2e：收藏增删在 Dock 即时反映", "移动 390 无遮挡主按钮（截图）", "axe 0 serious；键盘可完成全部操作"],
 cmd="pnpm -C apps/web exec vitest run components/site && pnpm exec playwright test e2e/web/dock.spec.ts",
 allow=[f"{W}/components/site/Dock/**", f"{W}/components/site/CompareDock.tsx", f"{W}/app/(site)/layout.tsx", "e2e/web/dock.spec.ts"], deny=DENY_COMMON + [f"{W}/components/site/SourceAttribution.tsx"],
 dep=["T120-26"], blocks=["T120-36"], stop="客服内容未裁决 → 不渲染客服 Tab", size="大（≈6h，<2 天）")

card(id="T120-23", name="自定义渠道保存时连通性探测（SSRF 防护）", slice="S12-6", owner="Hark", tier="opus",
 reqs="REQ-N-010", src="contracts/01b-channel-probe.contract.ts",
 goal="用户保存自定义渠道后返回探测结果（可达/鉴权失败/超时/目标被拒），内网与非 https 目标一律拒绝。",
 inputs=[f"{W}/app/api/v1/user/custom-channels/route.ts（仅持久化）", "components/user/ApiChannelsPanel.tsx"],
 outputs=[f"{W}/lib/features/gateway/probe.ts（新）", f"{W}/app/api/v1/user/custom-channels/[id]/probe/route.ts（新）", f"{W}/components/user/ApiChannelsPanel.tsx"],
 steps=["probe：仅 https；DNS 解析后拒绝私网/回环/链路本地/元数据地址（IPv4+IPv6）；禁止重定向；3s 超时；只发 GET /models", "端点限流：每用户 10/分钟", "结果写渠道 lastProbe*（复用现有列，若无则只返回不落库）", "UI 保存后行内显示结果徽标"],
 acc=["SSRF 单测 ≥12 例（10.x、127.x、169.254.169.254、::1、fc00::、DNS 重绑定）", "错误码 30005 契约测", "UI 四种结果可见"],
 cmd="pnpm -C apps/web exec vitest run lib/features/gateway app/api/v1/user",
 allow=[f"{W}/lib/features/gateway/probe.ts", f"{W}/lib/features/gateway/__tests__/**", f"{W}/app/api/v1/user/custom-channels/**", f"{W}/components/user/ApiChannelsPanel.tsx"], deny=DENY_COMMON,
 dep=["T120-10"], blocks=["T120-36"], stop="需要新增 DB 列 → 停，另开迁移卡", size="中（≈4h）")

card(id="T120-24", name="余额不足切换免费额度的响应内轻提示", slice="S12-6", owner="外部助手A", tier="sonnect",
 reqs="REQ-N-011", src="service.ts:1000 x-aidean-billing-path",
 goal="控制台调用记录与用量页对 billing-path=FREE_QUOTA 的请求显示『已使用免费额度』徽标与一次性提示条。",
 inputs=["x-aidean-billing-path 响应头（既有）", "/user/console 用量组件"],
 outputs=[f"{W}/components/user/**（用量相关）"],
 steps=["定位用量列表数据源是否已带 billingPath；无则只在前端读响应头的调试页显示（登记偏差）", "徽标 + 可关闭提示条（localStorage 记已读）"],
 acc=["组件测：FREE_QUOTA 行显示徽标", "提示条关闭后刷新不再出现"],
 cmd="pnpm -C apps/web exec vitest run components/user",
 allow=[f"{W}/components/user/**"], deny=DENY_COMMON + [f"{W}/components/user/PasswordForm.tsx", f"{W}/components/user/ApiChannelsPanel.tsx"],
 dep=["T120-26"], blocks=["T120-36"], stop="数据源不带 billingPath 且需改 API → 停，转 Hark", size="小（≈2h）")

# ── S12-7 设计系统收敛（Hark 设计 + 外部批量） ──
card(id="T120-25", name="语义色令牌体系 + Tailwind 4 @theme 映射 + 包版本对齐", slice="S12-7", owner="Hark", tier="opus",
 reqs="REQ-N-005 / REQ-L-012 / UI设计文档 §2", src="ADR-0013",
 goal="globals.css 只保留一套令牌命名（--color-*），提供 surface/fg/muted/line/accent/status 六族语义类；三主题切换时状态色与主色均跟随；packages/ui 的 tailwind/vitest 与 apps/web 同版本。",
 inputs=["globals.css（新旧命名并存；slate-400/500 被重定义）", "baseline：packages/ui tailwind ^3.4.10 / vitest ^3.2.4 vs apps/web 4.0.0 / 2.1.9"],
 outputs=[f"{W}/app/globals.css", "packages/ui/package.json", "packages/shared/package.json", "packages/ui/src/tokens.ts（新）", "docs/ADR/ADR-0013-语义色令牌与主题.md", "docs/product/design/UI设计文档.md（§2 令牌表）"],
 steps=["盘点现有变量→映射表（旧名保留为别名一个版本）", "@theme 输出语义类；去掉对 slate-* 的重定义改为语义类", "三主题 × 六族对比度表（AA）写入 ADR", "版本对齐：ui/shared 改用 workspace 同版本 tailwind 4 与 vitest 2.1.9（或统一升 3，取 ADR 结论）"],
 acc=["对比度表 18 组均 ≥4.5（正文）/≥3（大字/图形）", "三包 vitest、web build 全过", "旧别名有弃用注释且计数入 facts"],
 cmd="pnpm -r exec vitest run && pnpm -C apps/web build",
 allow=[f"{W}/app/globals.css", "packages/ui/**", "packages/shared/package.json", "pnpm-lock.yaml", "docs/ADR/ADR-0013-*.md", "docs/product/design/UI设计文档.md"], deny=[".example/**", f"{W}/components/**"],
 dep=[], blocks=["T120-26", "T120-27", "T120-28", "T120-29"], stop="版本对齐导致 >20 个测试失败 → 停，ADR 改为保留差异并记录理由", size="大（≈6h）")

card(id="T120-26", name="五态外壳上移 @aidean/ui（PanelState 通用化，用户端可用）", slice="S12-7", owner="Hark", tier="opus",
 reqs="术语表 五态 / REQ-N-005", src="contracts/06b-ux-states.contract.ts",
 goal="`@aidean/ui` 导出 `PanelState`（loading/empty/error/forbidden/ready + retry），admin 现有 20 处改为从包导入且行为不变。",
 inputs=[f"{W}/components/admin/PanelState.tsx", "T120-25 令牌"],
 outputs=["packages/ui/src/components/PanelState.tsx（新）", f"{W}/components/admin/PanelState.tsx（改为重导出）", "packages/ui/src/__tests__/panel-state.spec.tsx（新）"],
 steps=["抽取：去掉 admin 专属文案，文案经 props 注入并给中文默认", "admin 原文件改为 re-export，保证 0 调用点改动", "组件测：五态各 1 例 + retry 回调"],
 acc=["ui 包组件测 ≥6 例", "admin-ui-audit 五态计数不降", "web build 通过"],
 cmd="pnpm -C packages/ui exec vitest run && node scripts/audit/admin-ui-audit.mjs",
 allow=["packages/ui/src/**", f"{W}/components/admin/PanelState.tsx"], deny=[".example/**"],
 dep=["T120-25", "T120-30"], blocks=["T120-14", "T120-15", "T120-22", "T120-24", "T120-27", "T120-31"], stop="无", size="中（≈3h）")

card(id="T120-27", name="色值/字号 codemod 工具 + 用户端（site/home/ladder/models）批次迁移", slice="S12-7", owner="外部助手B", tier="sonnect",
 reqs="UI设计文档 §2.1/§2.3 / REQ-N-005", src="ADR-0013",
 goal="提供可复跑 codemod（映射表驱动），并完成用户端组件迁移：用户端硬编码色板类 → 语义类，text-[9|10|11px] → 刻度 13 起（表格密集区允许 12 并登记）。",
 inputs=["v011_status：硬编码色 2011 处/160 文件（admin 1114）；text-[9-11px] 73", "T120-25 映射表"],
 outputs=["scripts/codemod/tokens.mjs（新）", f"{W}/components/{{site,home,ladder,models,news,user}}/**", f"{W}/app/(site)/**"],
 steps=["codemod：AST 级替换 className 字面量与 cn() 参数，跳过动态拼接并输出清单", "跑用户端目录 → 人工过 diff → 前后截图对比（1440/768/390 × 8 代表页）", "守卫：scripts/guard/raw-palette.mjs 统计并设上限（用户端=0，admin=现值待 T120-28 归零）"],
 acc=["用户端 raw palette = 0（守卫读数）", "8 页 × 3 视口截图像素差异仅限预期（评审记录）", "axe 0 serious/critical"],
 cmd="node scripts/guard/raw-palette.mjs --scope site && pnpm -C apps/web build",
 allow=["scripts/codemod/**", "scripts/guard/raw-palette.mjs", f"{W}/components/site/**", f"{W}/components/home/**", f"{W}/components/ladder/**", f"{W}/components/models/**", f"{W}/components/news/**", f"{W}/components/user/**", f"{W}/app/(site)/**"],
 deny=DENY_COMMON + [f"{W}/components/admin/**"],
 dep=["T120-25", "T120-26", "T120-14", "T120-16", "T120-21", "T120-22", "T120-23", "T120-24"], blocks=["T120-29", "T120-36"], stop="动态拼接类 >50 处 → 停，补 codemod 规则", size="大（≈7h）")

card(id="T120-28", name="管理端批次迁移：语义色 + 原生标签归零（RK-11-10 余量）", slice="S12-7", owner="外部助手B", tier="sonnect",
 reqs="REQ-N-015", src="ADR-0013；admin-ui-audit",
 goal="components/admin/** 硬编码色板=0；rawButton 29/rawSelect 18/rawTextarea 8/rawLabel 61/rawTable 1 → 0（monitoring 目录除外，由 T120-15 负责）。",
 inputs=["scripts/codemod/tokens.mjs（T120-27 产出；若未到，先做原生标签部分）", "admin-ui-audit SUMMARY"],
 outputs=[f"{W}/components/admin/**（除 monitoring/、PanelState.tsx）"],
 steps=["先跑 codemod（色） → 再跑既有 04b codemod（标签）", "人工过 diff；34 页截图对比", "admin-ui-audit 读数归零"],
 acc=["admin-ui-audit raw* 全 0", "raw-palette --scope admin = 0", "34 页截图评审通过、e2e/admin 全过"],
 cmd="node scripts/audit/admin-ui-audit.mjs && node scripts/guard/raw-palette.mjs --scope admin",
 allow=[f"{W}/components/admin/**"], deny=DENY_COMMON + [f"{W}/components/admin/monitoring/**", f"{W}/components/admin/PanelState.tsx"],
 dep=["T120-25", "T120-27", "T120-15"], blocks=["T120-36"], stop="某组件迁移改变交互语义 → 跳过并登记", size="大（≈6h）")

card(id="T120-29", name="非 admin 组件接入 @aidean/ui（38 个余量）", slice="S12-7", owner="外部助手B", tier="sonnect",
 reqs="REQ-L-012 / REQ-N-005", src="rtm：非 admin 22/60 引用 @aidean/ui",
 goal="用户端原生 button/table/select（43/6/6）替换为 @aidean/ui 原语，引用率 ≥55/60。",
 inputs=["T120-27 完成后的用户端目录"],
 outputs=[f"{W}/components/{{site,home,ladder,models,news,user}}/**"],
 steps=["列清单 → 机械替换 → 截图对比", "无对应原语的（如图表）登记豁免"],
 acc=["引用率 ≥55/60（探针）", "用户端 raw button/table/select = 0 或在豁免表", "e2e/web 全过"],
 cmd="node scripts/audit/site-ui-audit.mjs",
 allow=[f"{W}/components/site/**", f"{W}/components/home/**", f"{W}/components/ladder/**", f"{W}/components/models/**", f"{W}/components/news/**", f"{W}/components/user/**", "scripts/audit/site-ui-audit.mjs"], deny=DENY_COMMON + [f"{W}/components/admin/**"],
 dep=["T120-27"], blocks=["T120-36"], stop="无", size="中（≈4h）")

card(id="T120-30", name="组件测试基建（jsdom + Testing Library）+ 样例", slice="S12-7", owner="外部助手A", tier="sonnect",
 reqs="REQ-NF-005", src="v011_status：组件测试为 0",
 goal="apps/web 与 packages/ui 可写 `*.spec.tsx` 组件测（jsdom 环境按文件启用），附 3 个样例与写法约定。",
 inputs=["vitest 2.1.9 配置"],
 outputs=[f"{W}/vitest.config.ts", "packages/ui/vitest.config.ts", f"{W}/test/setup-dom.ts（新）", "docs/engineering/组件测试约定.md（新）"],
 steps=["environmentMatchGlobs：*.spec.tsx → jsdom", "引入 @testing-library/react、user-event、jest-dom（devDeps）", "样例：Button、PanelState、Combobox 键盘交互"],
 acc=["样例 3 文件通过", "全量 vitest 用时增幅 ≤15%（记录前后）", "约定文档含 testid / a11y 查询优先级"],
 cmd="pnpm -C apps/web exec vitest run --reporter=dot",
 allow=[f"{W}/vitest.config.ts", "packages/ui/vitest.config.ts", f"{W}/test/**", f"{W}/package.json", "packages/ui/package.json", "pnpm-lock.yaml", "docs/engineering/组件测试约定.md"], deny=[".example/**"],
 dep=["T120-25", "T120-01"], blocks=["T120-26", "T120-34"], stop="jsdom 与 Next 运行时冲突无法隔离 → 改 happy-dom 并在 ADR-0013 附注", size="中（≈3h）")

card(id="T120-31", name="性能基线复测（15.5.28）+ CLS/TBT 定向治理", slice="S12-7", owner="外部助手A", tier="sonnect",
 reqs="REQ-NF-002", src="11_基线指标.md",
 goal="先在 15.5.28 上复测 6 页基线；对 /pricing、/news 的 CLS 与 /、/models 移动端 TBT 做定向治理，达到 11_ 中目标值。",
 inputs=["EVD-UX-01/perf.txt（15.0.0 时测得：/pricing CLS 0.346、/news 移动 CLS 0.414、/ 移动 TBT 1248ms、/models 移动 TBT 1145ms）"],
 outputs=["scripts/perf/measure.mjs（新）", f"{W}/app/(site)/{{pricing,news,models}}/**", f"{W}/components/home/**"],
 steps=["measure.mjs：Playwright+CDP，生产 build，节流 4x CPU/Fast 3G，各页 5 次取中位", "CLS：为异步区块预留尺寸、字体 display=swap 对齐 fallback 度量", "TBT：首页与 /models 拆分客户端组件、延迟非首屏 hydration", "复测并写对照表"],
 acc=["基线表含 15.5.28 首测值", "/pricing、/news CLS ≤0.1；/、/models 移动 TBT 降 ≥40%（相对 15.5.28 首测值）", "无功能回归（e2e/web 全过）"],
 cmd="pnpm -C apps/web build && node scripts/perf/measure.mjs --pages /,/models,/pricing,/news,/ladder,/user/console",
 allow=["scripts/perf/**", f"{W}/app/(site)/pricing/**", f"{W}/app/(site)/news/**", f"{W}/app/(site)/models/**", f"{W}/app/(site)/page.tsx", f"{W}/components/home/**"], deny=DENY_COMMON,
 dep=["T120-27", "T120-29"], blocks=["T120-36"], stop="15.5.28 首测值已达标的页 → 不做治理，只记录", size="大（≈6h）")

# ── S12-8 测试补齐与收口 ──
card(id="T120-32", name="wallet / oauth 模块单测补齐", slice="S12-8", owner="外部助手A", tier="sonnect",
 reqs="REQ-NF-005", src="v011_status：wallet、oauth 无单测",
 goal="lib/features/wallet 与 lib/features/oauth 的公开函数分支覆盖率 ≥80%。",
 inputs=["vitest --coverage 现读数"],
 outputs=[f"{W}/lib/features/wallet/__tests__/**", f"{W}/lib/features/oauth/__tests__/**"],
 steps=["coverage 列出未覆盖分支", "按分支补测（金额以分为单位、并发扣款、回调签名）", "不改源码；发现缺陷登记转 Hark"],
 acc=["两模块分支覆盖 ≥80%（coverage 报告）", "新增用例全过"],
 cmd="pnpm -C apps/web exec vitest run lib/features/wallet lib/features/oauth --coverage",
 allow=[f"{W}/lib/features/wallet/__tests__/**", f"{W}/lib/features/oauth/__tests__/**"], deny=DENY_COMMON + [f"{W}/lib/features/wallet/*.ts", f"{W}/lib/features/oauth/*.ts"],
 dep=[], blocks=["T120-36"], stop="发现金额计算缺陷 → 立即停并报 Hark", size="中（≈4h）")

card(id="T120-33", name="V0.11 功能 e2e 补测（矩阵 CRUD、五态、分页 400、非管理员 403）", slice="S12-8", owner="外部助手A", tier="sonnect",
 reqs="REQ-NF-005 / REQ-N-*", src="v011_status：无 e2e 覆盖 V0.11 功能",
 goal="新增 e2e 覆盖兼容矩阵增删改、后台五态 500 注入、分页非法参数 400、普通用户访问 admin 矩阵端点 403。",
 inputs=["T120-03 全绿基线", "EVD-B11-03b/05/11"],
 outputs=["e2e/admin/matrix.spec.ts", "e2e/admin/five-state.spec.ts", "e2e/api/pagination.spec.ts", "e2e/api/admin-forbidden.spec.ts"],
 steps=["复用 fixtures 登录态", "500 注入用 route.fulfill", "403 用普通用户会话"],
 acc=["4 个 spec 全过且在故意改坏时 FAIL（各 1 次变异）", "全量 e2e 仍 0 failed"],
 cmd="pnpm exec playwright test e2e/admin/matrix.spec.ts e2e/admin/five-state.spec.ts e2e/api",
 allow=["e2e/**"], deny=DENY_COMMON + [f"{W}/**", "e2e/admin/monitoring.spec.ts", "e2e/web/password.spec.ts", "e2e/web/dock.spec.ts"],
 dep=["T120-03"], blocks=["T120-36"], stop="发现真缺陷 → 登记转 Hark，不改源码", size="中（≈4h）")

card(id="T120-34", name="关键交互组件测（Combobox、Dock、PasswordForm、ApiChannelsPanel）", slice="S12-8", owner="外部助手A", tier="sonnect",
 reqs="REQ-NF-005", src="docs/engineering/组件测试约定.md",
 goal="4 个组件各 ≥4 例组件测（键盘、错误、空态、提交）。",
 inputs=["T120-30 基建", "T120-21/22/23 产物"],
 outputs=[f"{W}/components/**/__tests__/*.spec.tsx"],
 steps=["按约定以角色/标签查询", "每组件含 1 例键盘全流程"],
 acc=["≥16 例全过", "无 testid 以外的脆弱选择器（评审）"],
 cmd="pnpm -C apps/web exec vitest run components",
 allow=[f"{W}/components/**/__tests__/**"], deny=DENY_COMMON + [f"{W}/components/**/*.tsx（非测试）"],
 dep=["T120-30", "T120-21", "T120-22", "T120-23", "T120-14", "T120-15", "T120-16", "T120-24", "T120-27", "T120-28", "T120-29", "T120-31"], blocks=["T120-36"], stop="无", size="中（≈3h）")

card(id="T120-35", name="〔条件卡·Q-12-02〕语言切换：撤除未用 lang 状态或启动 i18n", slice="S12-6", owner="外部助手A", tier="haiku",
 reqs="REQ-N-008", src="ADR-0006（i18n 收敛为默认中文）vs 界面交互文档『中/英切换』",
 goal="A（建议）：删除 uiStore 中未被使用的 lang/setLang 并把界面交互文档改为『默认中文，不提供切换』；B：另立 i18n 版本，不在本版本实施。",
 inputs=[f"{W}/stores/uiStore.ts:4-46", "ADR-0006"],
 outputs=[f"{W}/stores/uiStore.ts", "docs/product/design/界面交互文档.md"],
 steps=["A：删除状态与持久化键，兼容读旧 localStorage 不报错", "文档改述并链接 ADR-0006"],
 acc=["grep setLang = 0", "旧 localStorage 存在 lang 时页面无报错（单测）"],
 cmd="pnpm -C apps/web exec vitest run stores",
 allow=[f"{W}/stores/uiStore.ts", f"{W}/stores/__tests__/**", "docs/product/design/界面交互文档.md"], deny=DENY_COMMON,
 dep=["T120-09"], blocks=[], stop="未裁决不得开工", size="小（≈1h，与 T120-09 同批）", cond="Q-12-02")

card(id="T120-36", name="V0.12 收口：RTM 回写 + 全量门禁 + 证据 + CHANGELOG", slice="S12-8", owner="外部助手A", tier="sonnect",
 reqs="REQ-L-009", src="§9.2 完成定义",
 goal="V0.12 全部非条件卡合并后，同一 HEAD 上一次性取得全部门禁读数并回写规划与追溯矩阵。",
 inputs=["全部非条件卡 merged"],
 outputs=["docs/任务规划V0.12.0/25_执行记录.md", "docs/任务规划V0.12.0/06_validation/evidence/EVD-T120-36/", "docs/product/requirements/需求追溯矩阵.md", "CHANGELOG.md"],
 steps=["同一 HEAD：tsc/lint/vitest 三包/test:int/guard run-all/docs-rule/docs-facts/build/全量 e2e/raw-palette/admin-ui-audit/axe/perf", "回写 task-index 状态与提交号", "矩阵状态列更新"],
 acc=["12 项读数全部 exit=0 并落 verify.txt（≤40 行）", "task-index 无『进行中』", "独立验证者 PASS"],
 cmd="bash docs/任务规划V0.12.0/tools/gates-all.sh",
 allow=["docs/任务规划V0.12.0/**", "docs/product/requirements/需求追溯矩阵.md", "CHANGELOG.md"], deny=DENY_COMMON + [f"{W}/**", "packages/**"],
 dep=["T120-01", "T120-03", "T120-04", "T120-05", "T120-06", "T120-07", "T120-08", "T120-09", "T120-14", "T120-15", "T120-16", "T120-21", "T120-22", "T120-23", "T120-24", "T120-27", "T120-28", "T120-29", "T120-31", "T120-32", "T120-33", "T120-34"], blocks=[], stop="任一门禁 FAIL → 不得写『完成』", size="中（≈3h）")

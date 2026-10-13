# > 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档——任务数据单一源
# -*- coding: utf-8 -*-
# 任务规划V0.1.0 任务数据（单一数据源 → 渲染任务卡/索引/DAG/成本表/所有权校验）
P = "docs/任务规划V0.1.0"
HDR = "> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）"

# ---------------- 所有权（Agent × 路径） ----------------
OWNERS = {
    "Agent-Contract": {
        "own": ["packages/shared/src/"],
        "except": ["packages/shared/src/__tests__/contract/"],
    },
    "Agent-API": {
        "own": ["apps/web/app/api/", "apps/web/lib/features/", "apps/web/middleware.ts", "apps/web/lib/security/",
                "apps/web/lib/rate-limit.ts", "apps/web/lib/sync/", "apps/web/lib/discovery/", "apps/web/lib/intelligence/",
                "apps/web/lib/admin/", "apps/web/lib/site-config.ts", "apps/web/lib/env-check.ts"],
        "except": ["apps/web/lib/sync/writers/"],
    },
    "Agent-App": {
        "own": ["apps/web/app/(site)/", "apps/web/app/(admin)/", "apps/web/app/(admin-login)/", "apps/web/components/",
                "apps/web/stores/", "apps/web/hooks/", "packages/ui/", "apps/web/lib/navigation.ts"],
        "except": [],
    },
    "Agent-Data": {
        "own": ["apps/web/prisma/", "apps/web/lib/db/", "apps/web/lib/sync/writers/", "apps/web/lib/admin-nav-default-tree.ts"],
        "except": [],
    },
    "Agent-Guard": {
        "own": [".github/", "scripts/", "apps/web/scripts/", "e2e/", "playwright.config.ts", "apps/web/vitest.config.ts",
                "package.json", "apps/web/package.json", "packages/shared/package.json", "pnpm-lock.yaml", "packages/shared/src/__tests__/contract/",
                "docker/", "deploy/", "Dockerfile"],
        "except": ["scripts/check-docs-facts.mjs", "scripts/check-docs-rule.mjs"],
    },
    "Agent-Docs": {
        "own": ["docs/", "CHANGELOG.md", "README.md", "scripts/check-docs-facts.mjs", "scripts/check-docs-rule.mjs"],
        "except": ["docs/任务规划V0.1.0/"],
    },
}

COMMON_FORBID = [
    ".example/history/**（铁律4 历史只读）",
    f"{P}/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）",
    "AGENTS.md",
]

def ev(tid):
    return f"{P}/06_validation/evidence/EVD-{tid}/"

T = []
def task(**kw):
    T.append(kw)

# ======================= S0 步行骨架与契约守卫 =======================
task(id="001", slice="S0", name="错误码唯一源迁入 shared + 删除冲突旧表 + 新增 3 码 + SystemReady 契约",
     owner="Agent-Contract", assignee="Hark(主Agent)", tier="opus", tier_reason="契约语义与唯一源裁决，影响全端，不可逆度高",
     req="REQ-NF-01 契约唯一源（开发流程.md §五.2）/ REQ-F-09 功能开关 / REQ-F-13 收藏", sol="ADR-P001",
     goal="packages/shared/src/errors.ts 成为唯一错误码源（25 码），旧 types/index.ts ErrorCode 删除，shared 单测断言码值无重复且含 22 个既有码原值",
     docs=["contracts/02-errors.contract.ts", "contracts/01-api.contract.ts §S0", "docs/architecture/API接口文档.md §4"],
     contracts=["ERROR_CODES", "DEFAULT_STATUS_BY_CODE", "httpStatusOf", "ErrorBodySchema", "ERROR_PRESENTATION", "SystemReadySchema"],
     pre_state="HEAD=77c7952 基线全绿（shared vitest 118 / web vitest 1081）",
     outputs=["packages/shared/src/errors.ts（新建）", "packages/shared/src/schemas/system.schema.ts（新建）", "packages/shared/src/types/index.ts（删除 ErrorCode/ErrorCodeValue）", "packages/shared/src/index.ts（导出）", "packages/shared/src/__tests__/errors.spec.ts（新建）"],
     steps=["将 contracts/02-errors.contract.ts 的 ERROR_CODES/DEFAULT_STATUS_BY_CODE/httpStatusOf/ErrorBodySchema/ERROR_PRESENTATION/FAILURE_PATHS 原样落入 packages/shared/src/errors.ts",
            "将 contracts/01-api.contract.ts 的 SystemReadySchema 落入 schemas/system.schema.ts",
            "删除 packages/shared/src/types/index.ts 中 ErrorCode/ErrorCodeValue（全仓 0 引用，先 grep 复核）",
            "index.ts 增加 export * from \"./errors\" 与 \"./schemas/system.schema\"，确认无命名冲突（ErrorCode 类型名在 web errors.ts:97 仍为本地类型，不受影响）",
            "新增 errors.spec.ts：码值唯一、22 既有码与 apps/web/app/api/v1/_lib/errors.ts 逐值相等（读取对象比对）、httpStatusOf 映射表驱动断言"],
     accept=["`pnpm --filter @aidean/shared exec tsc --noEmit` 退出码 0",
             "`pnpm --filter @aidean/shared test` 全绿且用例数 ≥ 118+新增",
             "`grep -rn \"ErrorCode =\" packages/shared/src` 无输出（旧表已删）",
             "contracts 自检脚本 selfcheck.ts 输出 mism=0、dup=[]"],
     verify="pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test",
     allow=["packages/shared/src/errors.ts", "packages/shared/src/schemas/system.schema.ts", "packages/shared/src/types/index.ts", "packages/shared/src/index.ts", "packages/shared/src/__tests__/errors.spec.ts"],
     forbid=["apps/**", "apps/web/prisma/migrations/**"],
     deps=[], block_cond="发现 ErrorCode 旧表在仓内存在任何运行时引用（grep 非 0）→ 停止并提 ADR",
     escalate="需改动任一既有码值或 HTTP 映射 → 升 fable（推翻已上线契约）", size="中", hours=6)

task(id="002", slice="S0", name="web 侧错误码改为从 shared 重导出（消除双源）",
     owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="机械重构，契约已冻结，有既有 1081 单测兜底",
     req="REQ-NF-01", sol="ADR-P001",
     goal="apps/web/app/api/v1/_lib/errors.ts 不再定义码值，仅重导出 shared；web 全量单测与 tsc 保持全绿",
     docs=["contracts/02-errors.contract.ts"], contracts=["ERROR_CODES", "DEFAULT_STATUS_BY_CODE"],
     pre_state="TASK-001 已合并", outputs=["apps/web/app/api/v1/_lib/errors.ts", "apps/web/app/api/v1/_lib/response.ts（如需改为 import shared 映射）"],
     steps=["errors.ts 中 ERROR_CODES/DEFAULT_STATUS_BY_CODE 改为 `export { ERROR_CODES, DEFAULT_STATUS_BY_CODE } from \"@aidean/shared\"`，保留 formatZodMessage 与 ApiError（运行时类）",
            "response.ts 继续 import ./errors（路径不变，零调用方改动）",
            "运行 web tsc 与 vitest 全量"],
     accept=["`pnpm --filter web exec tsc --noEmit` 退出码 0", "`pnpm --filter web test` 1081+ 例全绿", "`grep -nE \"^\\s+[A-Z_]+: [0-9]{5},\" apps/web/app/api/v1/_lib/errors.ts` 无输出（无本地码值）"],
     verify="pnpm --filter web exec tsc --noEmit && pnpm --filter web test",
     allow=["apps/web/app/api/v1/_lib/errors.ts", "apps/web/app/api/v1/_lib/response.ts"],
     forbid=["packages/shared/**", "apps/web/app/api/v1/**/route.ts"], deps=["001"],
     block_cond="任何 route 因类型变化需改动 → 停止，回报 Agent-Contract", escalate="单测失败 2 次 → 升 opus", size="小", hours=3)

task(id="003", slice="S0", name="新增 GET /api/v1/system/ready（DB+Redis 就绪探针）",
     owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="单端点 + 单测，契约已冻结",
     req="REQ-NF-02 可运维性（步行骨架 health 维度；现 /system/health 仅返回 ok 不探依赖）", sol="SOL-S0",
     goal="DB 与 Redis 均可达时 200 + SystemReadySchema；任一不可达 503 + 错误码 50010，单测覆盖三分支",
     docs=["contracts/01-api.contract.ts §S0"], contracts=["SystemReadySchema", "SERVICE_UNAVAILABLE(50010)"],
     pre_state="TASK-002 已合并", outputs=["apps/web/app/api/v1/system/ready/route.ts（新建）", "apps/web/lib/features/system/readiness.ts（新建）", "apps/web/lib/features/system/__tests__/readiness.spec.ts（新建）"],
     steps=["readiness.ts：prisma.$queryRaw`SELECT 1` 不可用（check-docs-facts 断言业务代码 $queryRaw=0）→ 改用 prisma.user.count({take:1}) 等价轻查询；Redis 用 lib/db/redis.ts 客户端 PING，各 1s 超时",
            "route.ts：force-dynamic，失败抛 ApiError(50010, \"依赖不可用: db|redis\")",
            "单测 mock prisma/redis 覆盖 ok / db 挂 / redis 挂"],
     accept=["readiness.spec.ts 3 例通过", "本地无 DB 时 `curl -s -o /dev/null -w %{http_code} localhost:3000/api/v1/system/ready` = 503", "`grep -rn \"queryRaw\" apps/web/lib/features/system` 无输出（facts 门禁 queryraw-biz=0 约束；计数类断言由 TASK-009 同步）"],
     verify="pnpm --filter web exec vitest run lib/features/system && pnpm --filter web exec tsc --noEmit",
     allow=["apps/web/app/api/v1/system/ready/**", "apps/web/lib/features/system/**"],
     forbid=["packages/shared/**", "apps/web/lib/db/**", "apps/web/app/api/v1/system/health/**"], deps=["002"],
     block_cond="lib/db/redis.ts 无可复用 ping 能力需改 → 停止，提给 Agent-Data", escalate="2 次验收失败 → 升 opus", size="小", hours=4)

task(id="004", slice="S0", name="契约测试生成器（从 shared 契约自动生成契约测试）",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="脚本+生成测试；断言口径已由契约冻结",
     req="REQ-NF-01 / §9.4 契约测试", sol="ADR-P001",
     goal="`node scripts/contract/gen-contract-tests.mjs` 生成 packages/shared/src/__tests__/contract/*.generated.spec.ts，覆盖码表↔文档§4、HTTP 映射、权限注册表↔seed-rbac、信封 round-trip，并接入 CI",
     docs=["contracts/02-errors.contract.ts", "contracts/03-identity.contract.ts", "docs/architecture/API接口文档.md §4"],
     contracts=["ERROR_CODES", "ErrorBodySchema", "PermissionCodeSchema", "AUTHZ_BOUNDARY"], pre_state="TASK-001 已合并",
     outputs=["scripts/contract/gen-contract-tests.mjs（新建）", "packages/shared/src/__tests__/contract/*.generated.spec.ts（生成物，入库）", ".github/workflows/ci.yml（新增 contract 生成+diff 校验步骤）"],
     steps=["生成器读取 packages/shared/src/errors.ts 与 permissions.ts（tsx 动态 import），生成表驱动 spec",
            "解析 docs/architecture/API接口文档.md §4 码表（仅 3xxxx/4xxxx 已登记段 + 本规划新增登记后全段），生成「文档登记 ⊇ 代码码表」断言",
            "CI 增步：生成后 `git diff --exit-code packages/shared/src/__tests__/contract` 防手改",
            "生成物头部写 `// AUTO-GENERATED — DO NOT EDIT`"],
     accept=["生成器幂等：连续运行两次 git diff 为空", "`pnpm --filter @aidean/shared test` 全绿", "CI verify job 含 contract 步骤且通过"],
     verify="node scripts/contract/gen-contract-tests.mjs && git diff --exit-code packages/shared/src/__tests__/contract && pnpm --filter @aidean/shared test",
     allow=["scripts/contract/**", "packages/shared/src/__tests__/contract/**", ".github/workflows/ci.yml"],
     forbid=["packages/shared/src/*.ts", "packages/shared/src/schemas/**", "docs/**"], deps=["001"],
     block_cond="API接口文档 §4 码表格式无法稳定解析 → 停止，提给 Agent-Docs 先规范表格（TASK-009）", escalate="生成断言与契约语义冲突 → 升 opus", size="中", hours=8)

task(id="005", slice="S0", name="步行骨架 e2e：注册→登录→鉴权写→页面可见→错误信封",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="E2E 脚本，复用既有端点",
     req="REQ-F-05 用户系统 / REQ-NF-01 统一错误", sol="SOL-S0",
     goal="e2e/web/walking-skeleton.spec.ts 在 :3000 真实服务上串起：POST /auth/register→POST /auth/login→POST /user/api-keys（鉴权写）→/user/console 可见新 Key→匿名 GET /user/api-keys 得 401 且信封四要素齐全→/system/ready 200",
     docs=["contracts/02-errors.contract.ts", "contracts/03-identity.contract.ts"], contracts=["ErrorBodySchema", "SystemReadySchema", "AUTHZ_BOUNDARY[0]"],
     pre_state="TASK-003 已合并；本地/CI 有 PG16+Redis 且已 migrate deploy + seed",
     outputs=["e2e/web/walking-skeleton.spec.ts（新建）"],
     steps=["复用 e2e/fixtures.ts 的登录辅助；邮箱用时间戳唯一", "断言错误体用 ErrorBodySchema.parse（从 @aidean/shared 导入）", "清理：测试末尾 DELETE 创建的 api-key"],
     accept=["`pnpm exec playwright test e2e/web/walking-skeleton.spec.ts --config playwright.config.ts --project=web --workers=1` 通过", "无 DB 时该 spec 因 ready 503 明确失败（非超时）"],
     verify="pnpm exec playwright test e2e/web/walking-skeleton.spec.ts --config playwright.config.ts --project=web --workers=1",
     allow=["e2e/web/walking-skeleton.spec.ts"], forbid=["apps/**", "packages/**"], deps=["003"],
     block_cond="注册需邮箱验证码且无测试旁路 → 停止，改用 seed 用户并在证据中注明", escalate="2 次失败 → 升 opus 排查环境 vs 产品缺陷", size="小", hours=4)

task(id="006", slice="S0", name="CI 新增 e2e-skeleton job（PG16+Redis7 服务容器、空库迁移重放、:3000 启动）",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="CI 配置；现 ci.yml 明言 e2e 未进 CI",
     req="REQ-NF-03 测试可复现 / 未完成事项 #36", sol="SOL-S0",
     goal="push/PR 时 e2e-skeleton job 在全新 PG16 上 `prisma migrate deploy` 重放 16 条迁移、seed、build、`next start -p 3000`、等待 /system/ready=200 后跑 smoke + walking-skeleton，全部通过",
     docs=[".github/workflows/ci.yml（现状：e2e 不进 CI 注释）", "docs/engineering/开发环境搭建.md"], contracts=["SystemReadySchema"],
     pre_state="TASK-005 已合并", outputs=[".github/workflows/ci.yml（新增 job）"],
     steps=["services: postgres:16（POSTGRES_DB=aidean）、redis:7；env 注入 DATABASE_URL/REDIS_URL/JWT 相关与 AIDEAN_ENABLE_MOCK_UPSTREAM=1、AIDEAN_BYPASS_LOGIN_RATE_LIMIT=1（仅测试，constants.ts:141 双条件保护）",
            "步骤：pnpm install --frozen-lockfile → prisma migrate deploy → db:seed → seed-navigation-menu → seed-rbac → build → start -p 3000 & → 轮询 ready ≤60s → playwright --project=smoke,web（walking-skeleton）",
            "失败上传 playwright-report 为 artifact"],
     accept=["GitHub Actions e2e-skeleton job 绿", "job 日志可见 `migrate deploy` 应用 16 条迁移", "端口恒为 3000（与 playwright baseURL 一致）"],
     verify="gh run list --workflow CI --limit 1 （或在 Actions 页面查看 e2e-skeleton job 结论）",
     allow=[".github/workflows/ci.yml"], forbid=["apps/**", "packages/**", "e2e/**"], deps=["005", "004", "009"],
     block_cond="seed 依赖外网（上游采集）导致 CI 不稳定 → 停止，在证据中列出外网调用点", escalate="连续 2 次 CI 红且非产品缺陷 → 升 opus", size="中", hours=8)

task(id="007", slice="S0", name="守卫脚本：根目录污染 / 密钥扫描 / 模块边界 / 端口一致性（零新依赖）",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="确定性脚本",
     req="§9.4 自动化守卫 / REQ-C-02 端口约束（Aidean 3000、AideanBot 3333）", sol="SOL-S0",
     goal="`node scripts/guard/run-all.mjs` 四项检查全 PASS 并接入 CI verify job",
     docs=["AGENTS.md 铁律", "docs/governance/目录结构文档.md"], contracts=["contracts/03-identity.contract.ts AUTHZ_BOUNDARY（敏感字段名清单）"],
     pre_state="无", outputs=["scripts/guard/root-pollution.mjs", "scripts/guard/secret-scan.mjs", "scripts/guard/module-boundary.mjs", "scripts/guard/port-consistency.mjs", "scripts/guard/run-all.mjs", ".github/workflows/ci.yml"],
     steps=["root-pollution：根目录文件白名单 = 当前 git ls-files 根级文件集合，新增根级文件即失败",
            "secret-scan：git ls-files 全量扫描私钥头/AKIA/sk-[A-Za-z0-9]{20,}/password= 明文模式，.env.example 豁免",
            "module-boundary：packages/** 不得 import apps/**；apps/web/components/** 不得 import @prisma/client 或 lib/db/**",
            "port-consistency：apps/web/package.json dev/start 无 -p 或 -p 3000；playwright baseURL=3000；Dockerfile EXPOSE 3000；seed wechat-rag redirectUris 含 localhost:3333 且不含 localhost:3200（依赖 TASK-008）"],
     accept=["四脚本在当前 HEAD + TASK-008 后全部 exit 0", "人为加入根级文件/私钥样本时对应脚本 exit 1（证据记录负向测试）", "CI verify job 含 guard 步骤"],
     verify="node scripts/guard/run-all.mjs",
     allow=["scripts/guard/**", ".github/workflows/ci.yml"], forbid=["apps/**", "packages/**"], deps=["008"],
     block_cond="现存代码违反模块边界（非新引入）→ 不改代码，登记为白名单例外并上报", escalate="误报率高无法收敛 → 升 opus", size="中", hours=6)

task(id="008", slice="S0", name="OIDC 种子端口口径对齐：wechat-rag(AideanBot) 本地回调 3200→3333",
     owner="Agent-Data", assignee="外部Agent", tier="haiku", tier_reason="单值替换（seed.ts:354）",
     req="REQ-C-02 端口（AideanBot=3333；子平台规范说明 §5 + e2e/web/sso-3333.spec.ts + apps/web/scripts/check-oidc.mjs 均为 3333）", sol="SOL-S0",
     goal="seed.ts wechat-rag.redirectUris = ['https://wechat-rag.aidean.local/auth/aidean/callback','http://localhost:3333/auth/aidean/callback']，seed 幂等复跑后 check-oidc has3333=true",
     docs=["docs/product/modules/子平台规范说明.md §5.0 端口区间（AideanBot 3300–3400）"], contracts=["无（数据值）"],
     pre_state="U-6 未被否决（默认按用户口径 3333）", outputs=["apps/web/prisma/seed.ts"],
     steps=["修改 seed.ts:354 本地回调为 3333", "本地 db:seed 两次，运行 node apps/web/scripts/check-oidc.mjs"],
     accept=["`grep -n \"localhost:3200\" apps/web/prisma/seed.ts` 无输出", "check-oidc.mjs 输出 has3333: true"],
     verify="grep -n \"localhost:3333/auth/aidean/callback\" apps/web/prisma/seed.ts && node apps/web/scripts/check-oidc.mjs",
     allow=["apps/web/prisma/seed.ts"], forbid=["apps/web/prisma/migrations/**", "apps/web/prisma/schema.prisma"], deps=[],
     block_cond="用户裁决 U-6 = 其他端口 → 按裁决值执行", escalate="无", size="小（<2h，§6.3 过小信号：因所有权仅 Agent-Data 可写 seed，无法并入同刀他卡，保留独立卡并在证据中注明）", hours=1)

task(id="009", slice="S0", name="S0 文档同步：API接口文档§4 全码表 + /system/ready 登记 + 双向锚 + 版本头",
     owner="Agent-Docs", assignee="外部Agent", tier="haiku", tier_reason="按冻结契约填表",
     req="AGENTS.md 铁律2/3", sol="ADR-P001",
     goal="API接口文档 §4 列全 25 码（含 HTTP 状态与前端展示）并登记 /system/ready；API架构设计方案对应节互引锚；check-docs-rule/facts 全 PASS",
     docs=["contracts/02-errors.contract.ts", "contracts/01-api.contract.ts"], contracts=["ERROR_CODES", "ENDPOINTS[API-001]"],
     pre_state="TASK-001/002/003 已合并", outputs=["docs/architecture/API接口文档.md", "docs/architecture/API架构设计方案.md", "docs/文档索引.md"],
     steps=["重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）", "§4 码表改为全段单表（码位|标识|HTTP|语义|前端展示），删除「与 errors.ts 双源对齐」措辞，改为「唯一源 packages/shared/src/errors.ts」",
            "§5.7 系统 增 GET /api/v1/system/ready", "两文档文首版本头升版", "运行文档门禁"],
     accept=["`node scripts/check-docs-rule.mjs` exit 0", "`node scripts/check-docs-facts.mjs` 全 PASS（若计数漂移，同步更新期望值由 Agent-Guard 处理并记录）", "§4 表行数 = 25"],
     verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
     allow=["scripts/check-docs-facts.mjs", "docs/architecture/API接口文档.md", "docs/architecture/API架构设计方案.md", "docs/文档索引.md"], forbid=["apps/**", "packages/**", f"{P}/**"],
     deps=["003", "004", "005"], block_cond="计数漂移来源无法归因到本切片 → 停止上报", escalate="无", size="小", hours=3)

# ======================= S1 价格历史唯一约束（数据完整性） =======================
task(id="010", slice="S1", name="复现：model_prices (model_id,is_current) 唯一约束致二次同步失败",
     owner="Agent-Data", assignee="外部Agent", tier="sonnect", tier_reason="集成测试编写",
     req="REQ-F-14 数据供给/采集（需求 §3.4.1）/ REQ-F-12 限时优惠前置", sol="ADR-P003",
     goal="在真实 PG16 上证明：同一模型第二次 persistPrices（已存在一条 is_current=false 历史行时）抛 P2002，或证伪该缺陷",
     docs=["apps/web/prisma/schema.prisma:481 @@unique([modelId,isCurrent])", "apps/web/prisma/migrations/20260925170000_align_unique_indexes/migration.sql", "apps/web/lib/sync/writers/index.ts:74-95 persistPrices"],
     contracts=["无（数据层缺陷复现）"], pre_state="TASK-006 已合并（CI 有 PG）",
     outputs=["apps/web/lib/sync/writers/__tests__/persist-prices.int.spec.ts（新建，需 DATABASE_URL 才运行，否则 skip）"],
     steps=["建模型 → persistPrices 一次 → 再一次 → 第三次", "断言第二/三次行为并记录真实错误码", "多价格数组（prices.length=2）一次写入是否触发唯一冲突同测"],
     accept=["在 CI PG 上运行得到确定结论（复现 or 证伪），证据附完整错误栈", "无 DATABASE_URL 时 spec 自动 skip 不影响 1081 基线"],
     verify="DATABASE_URL=postgresql://... pnpm --filter web exec vitest run lib/sync/writers/__tests__/persist-prices.int.spec.ts",
     allow=["apps/web/lib/sync/writers/__tests__/**"], forbid=["apps/web/prisma/**", "apps/web/lib/sync/writers/index.ts"], deps=["006"],
     block_cond="证伪（未复现）→ TASK-011/012 取消，S4 改依赖 TASK-010 结论", escalate="结果不稳定 → 升 opus", size="小", hours=4)

task(id="011", slice="S1", name="ADR-P003 + 迁移 M-001：is_current 改为部分唯一索引（WHERE is_current）",
     owner="Agent-Data", assignee="Hark(主Agent)", tier="opus", tier_reason="破坏性 DDL + Prisma 不原生支持部分索引，需 ADR 级决策",
     req="REQ-F-14 / REQ-F-12", sol="ADR-P003",
     goal="迁移 20261014000000_model_prices_partial_current_unique 删除 model_prices_model_id_is_current_key，新建 UNIQUE INDEX ... WHERE is_current = true；空库重放与存量库升级均成功",
     docs=[f"{P}/03_solution/decisions/ADR-P003-价格当前行部分唯一索引.md", f"{P}/database/001_init.sql（M-001 草案）"],
     contracts=["数据模型基线 §5 M-001"], pre_state="TASK-010 复现成立",
     outputs=["apps/web/prisma/migrations/20261014000000_model_prices_partial_current_unique/migration.sql", "apps/web/prisma/schema.prisma（移除 @@unique([modelId,isCurrent]) 并以注释指向迁移）"],
     steps=["迁移前置核验 SQL：is_current=true 重复组=0（写入迁移注释）", "DROP INDEX + CREATE UNIQUE INDEX ... WHERE is_current", "schema.prisma 移除 @@unique，保留 @@index([isCurrent])；注释说明部分索引由迁移维护",
            "空库：migrate deploy 17 条全成功；`prisma migrate diff --from-migrations --to-schema-datamodel --shadow-database-url` 记录差异仅为该部分索引（Prisma 无法表达，需在 ADR 中登记豁免）"],
     accept=["CI e2e-skeleton job 空库重放 17 条迁移成功", "TASK-010 集成测试由红转绿（第二次同步不再 P2002）", "并发两条 is_current=true 写入仍被唯一索引拒绝（集成测试断言）"],
     verify="pnpm --filter web exec prisma migrate deploy && pnpm --filter web exec vitest run lib/sync/writers/__tests__/persist-prices.int.spec.ts",
     allow=["apps/web/prisma/migrations/20261014000000_model_prices_partial_current_unique/**", "apps/web/prisma/schema.prisma"],
     forbid=["apps/web/prisma/migrations/2026091*/**", "apps/web/prisma/migrations/2026092*/**", "apps/web/prisma/migrations/2026093*/**", "apps/web/prisma/migrations/0000_init/**", "apps/web/prisma/migrations/202610[01]*/**（既有迁移只读）"],
     deps=["010"], block_cond="存量库存在 is_current=true 重复组 → 停止，先出清洗方案再迁移", escalate="需改既有迁移 → 升 fable", size="中", hours=6)

task(id="012", slice="S1", name="persistPrices 修正：单模型仅一条 current、事务化",
     owner="Agent-Data", assignee="外部Agent", tier="sonnect", tier_reason="单函数修复 + 单测",
     req="REQ-F-14", sol="ADR-P003",
     goal="多价格数组时仅 effectiveAt 最新一条 is_current=true，其余写为历史；updateMany+create 包在 $transaction；单测与集成测试全绿",
     docs=["apps/web/lib/sync/writers/index.ts:62-110"], contracts=["无"], pre_state="TASK-011 已合并",
     outputs=["apps/web/lib/sync/writers/index.ts", "apps/web/lib/sync/writers/__tests__/persist-prices.spec.ts"],
     steps=["按 effectiveAt 降序，首条 isCurrent=true", "$transaction 包裹", "补单测（mock prisma）+ 复跑集成测试"],
     accept=["`pnpm --filter web exec vitest run lib/sync` 全绿", "集成测试三次同步均成功且 current 行恰 1 条"],
     verify="pnpm --filter web exec vitest run lib/sync",
     allow=["apps/web/lib/sync/writers/**"], forbid=["apps/web/prisma/**", "apps/web/lib/sync/adapters/**"], deps=["011"],
     block_cond="mapper 未提供 effectiveAt → 停止，提给 Agent-API（lib/sync/mappers）", escalate="2 次失败 → 升 opus", size="小", hours=4)

task(id="013", slice="S1", name="S1 文档同步：数据库文档 model_prices 约束口径 + 台账登记缺陷闭环",
     owner="Agent-Docs", assignee="外部Agent", tier="haiku", tier_reason="登记类", req="AGENTS 铁律3/6", sol="ADR-P003",
     goal="数据库文档 model_prices 行改为「部分唯一索引 WHERE is_current」，迁移数 16→17；未完成事项目录登记缺陷与闭环证据",
     docs=["docs/architecture/数据库文档.md"], contracts=["M-001"], pre_state="TASK-012 已合并",
     outputs=["docs/architecture/数据库文档.md", "docs/plans/未完成事项目录.md"], steps=["重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）", "改约束描述与迁移清单", "升版本头", "跑文档门禁"],
     accept=["check-docs-rule exit 0", "check-docs-facts 全 PASS", "数据库文档出现 20261014000000 迁移名"],
     verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
     allow=["scripts/check-docs-facts.mjs", "docs/architecture/数据库文档.md", "docs/plans/未完成事项目录.md"], forbid=["apps/**", "packages/**", f"{P}/**"], deps=["012"],
     block_cond="无", escalate="无", size="小", hours=2)

# ======================= S2 功能开关运行时（§3.9） =======================
task(id="014", slice="S2", name="功能开关契约落地（码枚举/公开 DTO/后台 DTO/受控面映射）",
     owner="Agent-Contract", assignee="Hark(主Agent)", tier="opus", tier_reason="定义开关受控面（哪些 API/页面受控），影响多模块",
     req="REQ-F-09 功能开关（需求 §3.9）", sol="DESIGN-001",
     goal="packages/shared/src/schemas/feature-flags.schema.ts 导出 FEATURE_FLAG_CODES/FeatureFlagCodeSchema/PublicFeaturesSchema/AdminFeatureFlagSchema/AdminFeatureFlagPatchSchema/FEATURE_GATES，单测断言 7 码与 seed 一致",
     docs=["contracts/01-api.contract.ts §S2", f"{P}/03_solution/design/DESIGN-001-功能开关运行时.md"], contracts=["FEATURE_FLAG_CODES", "FEATURE_GATES"],
     pre_state="TASK-001 已合并", outputs=["packages/shared/src/schemas/feature-flags.schema.ts", "packages/shared/src/index.ts", "packages/shared/src/__tests__/feature-flags.spec.ts"],
     steps=["原样落地冻结稿", "单测：码值集合 = seed.ts:240-248 flagCode 集合（读文件正则提取）", "PATCH schema strict 拒未知键"],
     accept=["shared tsc + test 全绿", "feature-flags.spec.ts ≥4 例"], verify="pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test",
     allow=["packages/shared/src/schemas/feature-flags.schema.ts", "packages/shared/src/index.ts", "packages/shared/src/__tests__/feature-flags.spec.ts"],
     forbid=["apps/**"], deps=["001"], block_cond="U-7 裁决改变开关失败策略（fail-open/closed）→ 按裁决调整 DESIGN-001 后再落地", escalate="需新增权限域 → 升 opus 复核 RBAC", size="小", hours=3)

task(id="015", slice="S2", name="开关服务 + 公开端点 + API 受控面接入（网关/测评/天梯站榜）",
     owner="Agent-API", assignee="Hark(主Agent)", tier="opus", tier_reason="触达统一计费网关与测评计费路径，跨模块高风险",
     req="REQ-F-09", sol="DESIGN-001",
     goal="lib/features/flags 提供 getFeatureFlags()（unstable_cache tag feature-flags）与 requireFeature(code)；GET /api/v1/system/features 上线；FEATURE_GATES 中 API 在开关关闭时返回 403+50011",
     docs=[f"{P}/03_solution/design/DESIGN-001-功能开关运行时.md", "contracts/05-events.contract.ts CACHE_TAGS"], contracts=["PublicFeaturesSchema", "FEATURE_GATES", "FEATURE_DISABLED(50011)"],
     pre_state="TASK-014、TASK-002 已合并",
     outputs=["apps/web/lib/features/flags/{repository,service}.ts（新建）", "apps/web/lib/features/flags/__tests__/*.spec.ts", "apps/web/app/api/v1/system/features/route.ts（新建）",
              "apps/web/app/api/v1/gateway/chat/route.ts", "apps/web/app/api/v1/evaluations/route.ts", "apps/web/app/api/v1/ladder/route.ts"],
     steps=["repository：读 feature_flags（isEnabled + enableFrom/Until 时间窗）", "service：DB 异常 fail-open（DESIGN-001，待 U-7 确认）并 console.error", "requireFeature 置于 withApi handler 首行（鉴权之前，避免泄露）",
            "接入：gateway/chat POST、evaluations POST、ladder GET type=stations/models", "单测：开/关/时间窗/DB 异常四态"],
     accept=["flags 单测 ≥8 例全绿", "web 全量 vitest 不回归", "关闭 gateway.chat 后 POST /api/v1/gateway/chat 返回 403 且 code=50011（单测 route 级）"],
     verify="pnpm --filter web exec tsc --noEmit && pnpm --filter web test",
     allow=["apps/web/lib/features/flags/**", "apps/web/app/api/v1/system/features/**", "apps/web/app/api/v1/gateway/chat/route.ts", "apps/web/app/api/v1/evaluations/route.ts", "apps/web/app/api/v1/ladder/route.ts"],
     forbid=["packages/shared/**", "apps/web/lib/features/gateway/**（计费逻辑不动）", "apps/web/prisma/**"], deps=["014", "002"],
     block_cond="开关读取需新增 DB 列 → 停止（禁止提前加表）", escalate="网关回归失败 → 立即回滚该接入点并升 opus 复审", size="中", hours=10)

task(id="016", slice="S2", name="后台开关端点 GET/PATCH /api/v1/admin/feature-flags（审计+即时失效）",
     owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="标准 admin CRUD 模式（参照 admin/oidc-clients）",
     req="REQ-F-09 / 需求 §3.10 管理留痕", sol="DESIGN-001",
     goal="GET 列表（admin.configs.read）、PATCH（admin.configs.write）写 AuditLog 并 revalidateTag('feature-flags')；单测覆盖权限拒绝/未知键/成功",
     docs=["contracts/01-api.contract.ts API-003/004", "contracts/03-identity.contract.ts AUTHZ_BOUNDARY"], contracts=["AdminFeatureFlagSchema", "AdminFeatureFlagPatchSchema"],
     pre_state="TASK-014、TASK-002 已合并", outputs=["apps/web/app/api/v1/admin/feature-flags/route.ts", "apps/web/app/api/v1/admin/feature-flags/[id]/route.ts", "apps/web/lib/features/auth/__tests__/admin-feature-flags.spec.ts"],
     steps=["参照 app/api/v1/admin/oidc-clients 写法", "writeAudit(tableName='feature_flags')", "revalidateTag('feature-flags')"],
     accept=["单测 ≥6 例全绿", "MODERATOR PATCH → 403/10008（单测）"], verify="pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-feature-flags.spec.ts && pnpm --filter web exec tsc --noEmit",
     allow=["apps/web/app/api/v1/admin/feature-flags/**", "apps/web/lib/features/auth/__tests__/admin-feature-flags.spec.ts"],
     forbid=["packages/shared/**", "apps/web/lib/features/flags/**"], deps=["014", "002"], block_cond="需要新权限域 → 停止（本规划裁定复用 admin.configs.*）", escalate="2 次失败 → 升 opus", size="小", hours=4)

task(id="017", slice="S2", name="后台菜单种子：新增「功能开关」入口（seed-navigation-menu + 默认树）",
     owner="Agent-Data", assignee="外部Agent", tier="haiku", tier_reason="追加种子行",
     req="REQ-F-09", sol="DESIGN-001",
     goal="seed-navigation-menu.ts 与 admin-nav-default-tree.ts 增 adm_feature_flags → /admin/feature-flags（requiredPermissions admin.configs.read），coverage 断言同步 +1",
     docs=["apps/web/prisma/seed-navigation-menu.ts", "apps/web/lib/admin-nav-default-tree.ts"], contracts=["无"], pre_state="TASK-016 已合并",
     outputs=["apps/web/prisma/seed-navigation-menu.ts", "apps/web/lib/admin-nav-default-tree.ts", "apps/web/prisma/seed-admin-nav-default.ts"],
     steps=["两处追加叶子", "更新 EXPECTED_HREFS 计数", "跑 admin-nav-default-tree.spec"],
     accept=["`pnpm --filter web exec vitest run lib/admin-nav-default-tree.spec.ts lib/admin-navigation-core.spec.ts` 全绿", "种子复跑 coverage 断言通过"],
     verify="pnpm --filter web exec vitest run lib/admin-nav-default-tree.spec.ts lib/admin-navigation-core.spec.ts",
     allow=["apps/web/prisma/seed-navigation-menu.ts", "apps/web/prisma/seed-admin-nav-default.ts", "apps/web/lib/admin-nav-default-tree.ts"], forbid=["apps/web/prisma/schema.prisma", "apps/web/prisma/migrations/**"],
     deps=["016"], block_cond="spec 文件位于 apps/web/lib/*.spec.ts（Agent-API 所有）需改 → 提给 Agent-API", escalate="无", size="小", hours=2)

task(id="018", slice="S2", name="UI：后台功能开关页 + 前台入口隐藏 + 功能关闭 403 态",
     owner="Agent-App", assignee="Hark(主Agent)", tier="opus", tier_reason="UI 设计与交互决策（主 Agent 亲自完成）",
     req="REQ-F-09（入口隐藏、页面 403）", sol="DESIGN-001",
     goal="/admin/feature-flags 可切换开关；关闭 ladder.station 后 SiteHeader/MobileNav 不显示「模型服务提供商」入口，直访 /providers 呈 feature-disabled 态（HTTP 403）",
     docs=["contracts/06-ux-states.contract.ts 功能关闭态/后台功能开关", "docs/product/design/UI设计文档.md"], contracts=["PublicFeaturesSchema", "FEATURE_GATES"],
     pre_state="TASK-015、TASK-016、TASK-017 已合并",
     outputs=["apps/web/app/(admin)/admin/feature-flags/page.tsx", "apps/web/components/admin/FeatureFlagsManager.tsx", "apps/web/components/common/FeatureDisabled.tsx", "apps/web/components/site/SiteHeader.tsx", "apps/web/components/site/MobileNav.tsx", "apps/web/lib/navigation.ts", "受控页面 page.tsx（/providers、/evaluations/new、/models、/ladder）"],
     steps=["RSC 读 getFeatureFlags（通过 API 层导出的服务函数，只读调用）", "导航按 FEATURE_GATES.pages 过滤", "受控页首行判定，关闭时渲染 FeatureDisabled 并设置 403（notFound 不适用，使用自定义 forbidden 呈现）",
            "后台页复用 AdminDataTable + Switch + ConfirmDialog（gateway.chat 关闭二次确认）", "全部状态带 data-testid（契约⑥）"],
     accept=["`pnpm --filter web exec tsc --noEmit` 与 `pnpm --filter web lint` 0 error", "TASK-019 e2e 全绿（独立验证者判定）", "人工：三套浅色主题下开关页可读（对比度 ≥4.5:1）"],
     verify="pnpm --filter web exec tsc --noEmit && pnpm --filter web lint",
     allow=["apps/web/app/(admin)/admin/feature-flags/**", "apps/web/components/admin/FeatureFlagsManager.tsx", "apps/web/components/common/FeatureDisabled.tsx", "apps/web/components/site/SiteHeader.tsx", "apps/web/components/site/MobileNav.tsx", "apps/web/lib/navigation.ts",
            "apps/web/app/(site)/providers/page.tsx", "apps/web/app/(site)/evaluations/new/page.tsx", "apps/web/app/(site)/models/page.tsx", "apps/web/app/(site)/ladder/page.tsx"],
     forbid=["apps/web/app/api/**", "packages/shared/**", "apps/web/lib/features/**"], deps=["015", "016", "017"],
     block_cond="RSC 需要的服务函数未导出 → 停止，提给 Agent-API", escalate="—（已为 opus）连续 2 次验收失败 → 重写任务书", size="大", hours=14)

task(id="019", slice="S2", name="e2e：功能开关端到端（关→入口消失+API 50011→开→恢复）",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="E2E 脚本",
     req="REQ-F-09", sol="DESIGN-001",
     goal="e2e/admin/feature-flags.spec.ts 通过：SUPER_ADMIN 关闭 ladder.station → 前台导航无入口、/providers 显示 feature-disabled、GET /api/v1/ladder?type=stations 返回 code 50011 → 重新开启后恢复（测毕还原）",
     docs=["contracts/06-ux-states.contract.ts"], contracts=["FEATURE_DISABLED(50011)"], pre_state="TASK-018 已合并，CI e2e job 可用",
     outputs=["e2e/admin/feature-flags.spec.ts"], steps=["复用 admin-setup 登录态", "finally 中恢复开关", "workers=1（全局状态）"],
     accept=["`pnpm exec playwright test e2e/admin/feature-flags.spec.ts --config playwright.config.ts --project=admin --workers=1` 通过", "测后 feature_flags 状态与测前一致"],
     verify="pnpm exec playwright test e2e/admin/feature-flags.spec.ts --config playwright.config.ts --project=admin --workers=1",
     allow=["e2e/admin/feature-flags.spec.ts"], forbid=["apps/**", "packages/**"], deps=["018", "006"], block_cond="UI testid 与契约⑥不符 → 判 FAIL 回 TASK-018", escalate="2 次失败 → 升 opus", size="小", hours=4)

task(id="020", slice="S2", name="S2 文档同步：API 文档登记 3 端点 + 功能设计 §3.9 实装口径 + 术语表",
     owner="Agent-Docs", assignee="外部Agent", tier="haiku", tier_reason="登记类", req="AGENTS 铁律2/3", sol="DESIGN-001",
     goal="API接口文档登记 API-002/003/004 与 50011；API架构设计方案互引锚；功能设计文档 §3.9 改为已实装；术语表增「功能开关」",
     docs=["contracts/01-api.contract.ts"], contracts=["ENDPOINTS API-002..004"], pre_state="TASK-019 通过",
     outputs=["docs/architecture/API接口文档.md", "docs/architecture/API架构设计方案.md", "docs/product/design/功能设计文档.md", "docs/governance/术语表.md", "docs/文档索引.md"],
     steps=["重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）", "登记端点", "双向锚", "升版本头", "跑门禁"], accept=["check-docs-rule exit 0", "check-docs-facts 全 PASS"],
     verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
     allow=["scripts/check-docs-facts.mjs", "docs/architecture/API接口文档.md", "docs/architecture/API架构设计方案.md", "docs/product/design/功能设计文档.md", "docs/governance/术语表.md", "docs/文档索引.md"],
     forbid=["apps/**", "packages/**", f"{P}/**"], deps=["019"], block_cond="无", escalate="无", size="小", hours=2)

# ======================= S3 收藏 =======================
task(id="021", slice="S3", name="收藏契约落地（favorites.schema.ts）",
     owner="Agent-Contract", assignee="外部Agent", tier="sonnect", tier_reason="冻结稿原样落地",
     req="REQ-F-13 收藏（需求 §二 免费注册用户「收藏」）", sol="SOL-S3",
     goal="packages/shared/src/schemas/favorites.schema.ts 导出 FavoriteCreate/ListQuery/Item/ListResponse/DeleteResponse，单测覆盖非法 refType 与超长 note",
     docs=["contracts/01-api.contract.ts §S3"], contracts=["Favorite*"], pre_state="TASK-001 已合并",
     outputs=["packages/shared/src/schemas/favorites.schema.ts", "packages/shared/src/index.ts", "packages/shared/src/__tests__/favorites.spec.ts"],
     steps=["原样落地", "单测"], accept=["shared tsc+test 全绿"], verify="pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test",
     allow=["packages/shared/src/schemas/favorites.schema.ts", "packages/shared/src/index.ts", "packages/shared/src/__tests__/favorites.spec.ts"], forbid=["apps/**"],
     deps=["001"], block_cond="U-8 否决收藏 → 整刀 S3 取消", escalate="无", size="小", hours=2)

task(id="022", slice="S3", name="收藏 API：GET/POST /api/v1/user/favorites + DELETE /[id]",
     owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="标准用户域 CRUD（参照 user/api-keys）",
     req="REQ-F-13", sol="SOL-S3",
     goal="三端点按契约实现：POST 幂等、目标存在性校验 20003、DELETE 非本人 40000、受 favorites.enabled 控制；repository/service/route 单测 ≥10 例",
     docs=["contracts/01-api.contract.ts API-005..007", "apps/web/prisma/schema.prisma model Favorite（@@unique userId,refType,refId）"], contracts=["Favorite*", "FAVORITE_TARGET_NOT_FOUND"],
     pre_state="TASK-021、TASK-015 已合并", outputs=["apps/web/lib/features/favorites/**（新建）", "apps/web/app/api/v1/user/favorites/route.ts", "apps/web/app/api/v1/user/favorites/[id]/route.ts"],
     steps=["repository：upsert by unique、分页 list（userId 索引已存在）、deleteMany({id,userId})", "目标校验：MODEL→aiModel 未软删；API_STATION→apiStation 存在且启用", "requireFeature('favorites.enabled')", "target 投影 {name,href,slug}，目标缺失返回 null"],
     accept=["favorites 单测 ≥10 例全绿", "web tsc 0 错误", "无 N+1：列表投影使用一次 IN 查询（单测断言 prisma 调用次数）"],
     verify="pnpm --filter web exec vitest run lib/features/favorites && pnpm --filter web exec tsc --noEmit",
     allow=["apps/web/lib/features/favorites/**", "apps/web/app/api/v1/user/favorites/**"], forbid=["packages/shared/**", "apps/web/prisma/**"], deps=["021", "015"],
     block_cond="需新增索引/列 → 停止（现索引已覆盖 userId 与唯一键）", escalate="2 次失败 → 升 opus", size="中", hours=6)

task(id="023", slice="S3", name="UI：收藏按钮（详情页/天梯卡片）+ 控制台「我的收藏」Tab",
     owner="Agent-App", assignee="Hark(主Agent)", tier="opus", tier_reason="UI 设计与交互（乐观更新/未登录引导），主 Agent 亲自完成",
     req="REQ-F-13", sol="SOL-S3",
     goal="登录用户可在 /models/[slug] 与天梯卡片收藏/取消，控制台收藏 Tab 分页展示与删除；五态与 testid 符合契约⑥",
     docs=["contracts/06-ux-states.contract.ts 收藏按钮/我的收藏"], contracts=["FavoriteListResponseSchema", "PublicFeaturesSchema"], pre_state="TASK-022 已合并",
     outputs=["apps/web/components/site/FavoriteButton.tsx", "apps/web/components/console/FavoritesPanel.tsx", "apps/web/app/(site)/models/[slug]/page.tsx", "apps/web/components/ladder/*（卡片挂按钮）", "apps/web/components/console/ConsoleWorkspace.tsx（加 Tab）", "apps/web/hooks/useFavorites.ts"],
     steps=["SWR 数据层 + 乐观更新回滚", "未登录点击跳 /login?redirect", "收藏开关关闭时隐藏按钮与 Tab", "复用 @aidean/ui Button/Card/Tabs"],
     accept=["web tsc/lint 0 error", "TASK-024 e2e 全绿（独立验证者判定）", "人工：天梯卡片悬浮态不遮挡分数"],
     verify="pnpm --filter web exec tsc --noEmit && pnpm --filter web lint",
     allow=["apps/web/components/site/FavoriteButton.tsx", "apps/web/components/console/FavoritesPanel.tsx", "apps/web/components/console/ConsoleWorkspace.tsx", "apps/web/components/ladder/**", "apps/web/app/(site)/models/[slug]/**", "apps/web/hooks/useFavorites.ts"],
     forbid=["apps/web/app/api/**", "packages/shared/**", "apps/web/components/site/SiteHeader.tsx（S2/S5 占用）"], deps=["022"],
     block_cond="天梯卡片组件与 S5 搜索同时改 → 串行（本卡不改 SiteHeader）", escalate="连续 2 次验收失败 → 重写任务书", size="大", hours=12)

task(id="024", slice="S3", name="e2e：收藏端到端（收藏→控制台可见→取消→未登录引导）",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="E2E 脚本", req="REQ-F-13", sol="SOL-S3",
     goal="e2e/web/favorites.spec.ts 通过：登录用户收藏模型→控制台收藏 Tab 出现→取消后消失；匿名点击跳登录；他人收藏 DELETE 得 40000",
     docs=["contracts/06-ux-states.contract.ts"], contracts=["AUTHZ_BOUNDARY（他人收藏）"], pre_state="TASK-023 已合并",
     outputs=["e2e/web/favorites.spec.ts"], steps=["两个测试用户", "API 级越权断言", "清理数据"],
     accept=["`pnpm exec playwright test e2e/web/favorites.spec.ts --config playwright.config.ts --project=web --workers=1` 通过"],
     verify="pnpm exec playwright test e2e/web/favorites.spec.ts --config playwright.config.ts --project=web --workers=1",
     allow=["e2e/web/favorites.spec.ts"], forbid=["apps/**", "packages/**"], deps=["023", "006"], block_cond="testid 不符 → FAIL 回 TASK-023", escalate="2 次失败 → 升 opus", size="小", hours=4)

task(id="025", slice="S3", name="S3 文档同步：API 文档登记收藏端点 + 数据库文档 favorites 由「零消费」改「已消费」",
     owner="Agent-Docs", assignee="外部Agent", tier="haiku", tier_reason="登记类", req="AGENTS 铁律2/3", sol="SOL-S3",
     goal="API接口文档登记 API-005..007 与 20003；数据库文档 §九 favorites 裁决改为已激活；功能设计文档补收藏",
     docs=["contracts/01-api.contract.ts"], contracts=["ENDPOINTS API-005..007"], pre_state="TASK-024 通过",
     outputs=["docs/architecture/API接口文档.md", "docs/architecture/API架构设计方案.md", "docs/architecture/数据库文档.md", "docs/product/design/功能设计文档.md", "docs/文档索引.md"],
     steps=["重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）", "登记", "双向锚", "升版本头", "门禁"], accept=["check-docs-rule exit 0", "check-docs-facts 全 PASS"], verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
     allow=["scripts/check-docs-facts.mjs", "docs/architecture/API接口文档.md", "docs/architecture/API架构设计方案.md", "docs/architecture/数据库文档.md", "docs/product/design/功能设计文档.md", "docs/文档索引.md"],
     forbid=["apps/**", "packages/**", f"{P}/**"], deps=["024"], block_cond="无", escalate="无", size="小", hours=2)

# ======================= S4 限时优惠 =======================
task(id="026", slice="S4", name="限时优惠契约落地（PromotionPrice*/EffectivePrice）",
     owner="Agent-Contract", assignee="Hark(主Agent)", tier="opus", tier_reason="计费口径契约，涉及价格透明与敏感字段一票否决",
     req="REQ-F-12 限时优惠（需求 §3.6）/ REQ-C-03 价格透明（§五.6）", sol="DESIGN-002",
     goal="packages/shared/src/schemas/promotion.schema.ts 落地，单测覆盖 until<=from 拒绝、价格非负字符串、EffectivePrice 不含 markup/multiplier 键",
     docs=["contracts/01-api.contract.ts §S4", f"{P}/03_solution/design/DESIGN-002-限时优惠计费.md"], contracts=["PromotionPriceCreateSchema", "PromotionPricePatchSchema", "EffectivePriceSchema"],
     pre_state="TASK-001 已合并", outputs=["packages/shared/src/schemas/promotion.schema.ts", "packages/shared/src/index.ts", "packages/shared/src/__tests__/promotion.spec.ts"],
     steps=["原样落地", "单测含「EffectivePriceSchema.keyof() 不含 markupRate/tokenMultiplier」断言"], accept=["shared tsc+test 全绿"],
     verify="pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test",
     allow=["packages/shared/src/schemas/promotion.schema.ts", "packages/shared/src/index.ts", "packages/shared/src/__tests__/promotion.spec.ts"], forbid=["apps/**"],
     deps=["001"], block_cond="U-9 裁决优惠需叠加用户等级折扣 → 停止，修订 DESIGN-002", escalate="需改既有价格契约 → 升 fable", size="小", hours=3)

task(id="027", slice="S4", name="生效价解析服务 + 网关计费/前台展示接入",
     owner="Agent-API", assignee="Hark(主Agent)", tier="opus", tier_reason="资金路径（统一计费网关扣费），高风险",
     req="REQ-F-12 / REQ-F-07 计费公式", sol="DESIGN-002",
     goal="resolveEffectivePrice(modelId, at) 实现契约生效规则；网关 PLATFORM 计费基准价改用之（加价率/倍率仍在服务端内乘，不外泄）；/api/v1/models/[id] 与 pricing 读侧返回 EffectivePrice；单测覆盖窗口边界/免费/过期回落/无优惠",
     docs=[f"{P}/03_solution/design/DESIGN-002-限时优惠计费.md", "docs/architecture/网关计费时序契约.md", "apps/web/lib/features/gateway/repository.ts:89,109（isCurrent 取价）"],
     contracts=["EffectivePriceSchema"], pre_state="TASK-026、TASK-011 已合并（部分唯一索引已上线，允许多条非 current 行）",
     outputs=["apps/web/lib/features/pricing/effective-price.ts（新建）", "apps/web/lib/features/pricing/__tests__/effective-price.spec.ts", "apps/web/lib/features/gateway/repository.ts", "apps/web/app/api/v1/models/[id]/route.ts"],
     steps=["查询：PROMOTION 且 effectiveFrom<=at<effectiveUntil 取最新；否则 isCurrent", "gateway repository 两处取价改调用（保持原 Decimal 精度）", "读侧 DTO 增 isPromotion/promotionEndsAt/base*", "回归：gateway 既有 9 个 __tests__ 全绿"],
     accept=["effective-price 单测 ≥8 例", "gateway __tests__ 全绿", "grep 断言 EffectivePrice 序列化不含 markup/multiplier（单测）"],
     verify="pnpm --filter web exec vitest run lib/features/pricing lib/features/gateway && pnpm --filter web exec tsc --noEmit",
     allow=["apps/web/lib/features/pricing/**", "apps/web/lib/features/gateway/repository.ts", "apps/web/app/api/v1/models/[id]/route.ts"],
     forbid=["packages/shared/**", "apps/web/lib/features/billing/**（账务服务不动）", "apps/web/prisma/**"], deps=["026", "011"],
     block_cond="发现计费精度需改 Decimal→BigInt 口径 → 停止，升 opus 出 ADR", escalate="资金回归任一失败 → 立即回滚并重写任务书", size="大", hours=12)

task(id="028", slice="S4", name="后台限时优惠端点 /api/v1/admin/prices/promotions（CRUD+窗口不重叠校验）",
     owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="admin CRUD（参照 admin/prices）",
     req="REQ-F-12", sol="DESIGN-002",
     goal="GET/POST/PATCH/DELETE 按契约实现（admin.models.*），同模型窗口重叠 → 40000，写审计并 revalidatePath('/pricing')；单测 ≥8 例",
     docs=["contracts/01-api.contract.ts API-008..011"], contracts=["PromotionPriceCreateSchema", "PromotionPricePatchSchema"], pre_state="TASK-026、TASK-011 已合并",
     outputs=["apps/web/app/api/v1/admin/prices/promotions/route.ts", "apps/web/app/api/v1/admin/prices/promotions/[id]/route.ts", "apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts"],
     steps=["写入 sourceType=PROMOTION, isCurrent=false", "重叠检测查询", "DELETE 仅允许 PROMOTION 行"], accept=["单测 ≥8 例全绿", "尝试删除 OFFICIAL 行 → 40000"],
     verify="pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-promotions.spec.ts && pnpm --filter web exec tsc --noEmit",
     allow=["apps/web/app/api/v1/admin/prices/promotions/**", "apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts"],
     forbid=["apps/web/app/api/v1/admin/prices/route.ts", "apps/web/app/api/v1/admin/prices/[id]/**", "packages/shared/**"], deps=["026", "011"],
     block_cond="无", escalate="2 次失败 → 升 opus", size="中", hours=6)

task(id="029", slice="S4", name="UI：后台优惠子表与创建对话框 + 前台优惠价徽标",
     owner="Agent-App", assignee="Hark(主Agent)", tier="opus", tier_reason="UI 设计（价格透明呈现），主 Agent 亲自完成",
     req="REQ-F-12 / REQ-C-03", sol="DESIGN-002",
     goal="/admin/prices 可增改删优惠；/pricing 与 /models/[slug] 显示「限时优惠/限时免费」徽标与原价划线；五态符合契约⑥",
     docs=["contracts/06-ux-states.contract.ts 后台限时优惠/前台价格徽标"], contracts=["EffectivePriceSchema"], pre_state="TASK-027、TASK-028 已合并",
     outputs=["apps/web/components/admin/PromotionsPanel.tsx", "apps/web/components/admin/PricesManager.tsx", "apps/web/components/common/PriceTag.tsx", "apps/web/app/(site)/pricing/page.tsx", "apps/web/app/(site)/models/[slug]/page.tsx"],
     steps=["Dialog + 日期时间输入（Asia/Shanghai 展示，提交 ISO UTC）", "PriceTag 统一价格渲染", "无写权限只读"], accept=["web tsc/lint 0 error", "TASK-030 通过（独立验证者判定）"],
     verify="pnpm --filter web exec tsc --noEmit && pnpm --filter web lint",
     allow=["apps/web/components/admin/PromotionsPanel.tsx", "apps/web/components/admin/PricesManager.tsx", "apps/web/components/common/PriceTag.tsx", "apps/web/app/(site)/pricing/**", "apps/web/app/(site)/models/[slug]/**"],
     forbid=["apps/web/app/api/**", "packages/shared/**"], deps=["027", "028", "023"],
     block_cond="与 TASK-023 同改 models/[slug]/page.tsx → 必须在 TASK-023 合并后开始（已列依赖）", escalate="连续 2 次验收失败 → 重写任务书", size="大", hours=10)

task(id="030", slice="S4", name="计费集成 e2e：优惠窗口内按优惠价扣费、窗外按原价",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="E2E 脚本（mock-upstream 已有）", req="REQ-F-12 / REQ-F-07", sol="DESIGN-002",
     goal="e2e/tests/promotion-billing.spec.ts：建优惠（priceInput=0）→ 网关调用 → 用户余额不变且 usage_log quotaMinor=0 → 删除优惠 → 再调用 → 按原价扣费（逐分断言）",
     docs=["e2e/tests/gateway-flow.spec.ts（参照）"], contracts=["EffectivePriceSchema", "PromotionPriceCreateSchema"], pre_state="TASK-029 已合并；CI 注入 AIDEAN_ENABLE_MOCK_UPSTREAM=1",
     outputs=["e2e/tests/promotion-billing.spec.ts"], steps=["admin 建优惠", "用户调网关", "查余额/流水", "清理"], accept=["`pnpm exec playwright test e2e/tests/promotion-billing.spec.ts --config e2e/playwright.config.ts --workers=1` 通过（TASK-037 收敛后改为根配置）"],
     verify="pnpm exec playwright test e2e/tests/promotion-billing.spec.ts --config e2e/playwright.config.ts --workers=1",
     allow=["e2e/tests/promotion-billing.spec.ts"], forbid=["apps/**", "packages/**"], deps=["029", "006"], block_cond="mock-upstream 未在 CI 启用 → 停止交 TASK-006 补 env", escalate="2 次失败 → 升 opus", size="中", hours=6)

task(id="031", slice="S4", name="S4 文档同步：API 文档登记优惠端点 + 网关计费时序契约补生效价规则",
     owner="Agent-Docs", assignee="外部Agent", tier="haiku", tier_reason="登记类", req="AGENTS 铁律2/3", sol="DESIGN-002",
     goal="API接口文档登记 API-008..011；网关计费时序契约增「生效价解析」节；术语表增「生效价」",
     docs=["contracts/01-api.contract.ts"], contracts=["ENDPOINTS API-008..011"], pre_state="TASK-030 通过",
     outputs=["docs/architecture/API接口文档.md", "docs/architecture/API架构设计方案.md", "docs/architecture/网关计费时序契约.md", "docs/governance/术语表.md", "docs/文档索引.md"],
     steps=["重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）", "登记", "双向锚", "升版本头", "门禁"], accept=["check-docs-rule exit 0", "check-docs-facts 全 PASS"], verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
     allow=["scripts/check-docs-facts.mjs", "docs/architecture/API接口文档.md", "docs/architecture/API架构设计方案.md", "docs/architecture/网关计费时序契约.md", "docs/governance/术语表.md", "docs/文档索引.md"],
     forbid=["apps/**", "packages/**", f"{P}/**"], deps=["030"], block_cond="无", escalate="无", size="小", hours=2)

# ======================= S5 全局搜索（待 U-5 确认） =======================
task(id="032", slice="S5", name="搜索契约落地（search.schema.ts）",
     owner="Agent-Contract", assignee="外部Agent", tier="sonnect", tier_reason="冻结稿原样落地", req="REQ-F-15 顶栏搜索（需求 §五.2 隐含）", sol="SOL-S5",
     goal="packages/shared/src/schemas/search.schema.ts 落地并单测（q 去空白、types 解析、limit 上限）",
     docs=["contracts/01-api.contract.ts §S5"], contracts=["SearchQuerySchema", "SearchResponseSchema"], pre_state="TASK-001 已合并；U-5 已确认需要搜索",
     outputs=["packages/shared/src/schemas/search.schema.ts", "packages/shared/src/index.ts", "packages/shared/src/__tests__/search.spec.ts"],
     steps=["原样落地", "单测"], accept=["shared tsc+test 全绿"], verify="pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test",
     allow=["packages/shared/src/schemas/search.schema.ts", "packages/shared/src/index.ts", "packages/shared/src/__tests__/search.spec.ts"], forbid=["apps/**"],
     deps=["001"], block_cond="U-5 否决 → 整刀 S5 取消", escalate="无", size="小", hours=2)

task(id="033", slice="S5", name="搜索 API GET /api/v1/search（模型/产品/资讯，仅已发布）",
     owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="只读聚合查询", req="REQ-F-15", sol="SOL-S5",
     goal="按契约返回分组命中；仅 AiModel 未软删且 verifiedStatus 口径一致、Product ACTIVE、NewsItem PUBLISHED；限流复用 lib/rate-limit.ts；单测 ≥8 例",
     docs=["contracts/01-api.contract.ts API-012"], contracts=["SearchQuerySchema", "SearchResponseSchema"], pre_state="TASK-032 已合并",
     outputs=["apps/web/lib/features/search/**（新建）", "apps/web/app/api/v1/search/route.ts"],
     steps=["三路 Promise.all，contains+mode insensitive，各 take=limit", "tookMs 计时", "IP 级限流"], accept=["单测 ≥8 例", "web tsc 0"],
     verify="pnpm --filter web exec vitest run lib/features/search && pnpm --filter web exec tsc --noEmit",
     allow=["apps/web/lib/features/search/**", "apps/web/app/api/v1/search/**"], forbid=["packages/shared/**", "apps/web/prisma/**（无基线前禁止加索引/扩展）"], deps=["032"],
     block_cond="需 pg_trgm 等扩展 → 停止（无基线禁止优化，§9.1）", escalate="2 次失败 → 升 opus", size="中", hours=5)

task(id="034", slice="S5", name="UI：顶栏搜索（桌面框 + 移动端展开 + 键盘导航）",
     owner="Agent-App", assignee="Hark(主Agent)", tier="opus", tier_reason="全站头部交互设计，主 Agent 亲自完成", req="REQ-F-15 / §五.2（搜索框仅在顶部导航栏）", sol="SOL-S5",
     goal="SiteHeader/MobileNav 内唯一搜索入口，防抖 250ms、AbortController、↑↓/Enter/Esc，五态符合契约⑥；其他页面不出现搜索框",
     docs=["contracts/06-ux-states.contract.ts 顶栏全局搜索"], contracts=["SearchResponseSchema"], pre_state="TASK-033、TASK-018 已合并（SiteHeader 由 S2 先改）",
     outputs=["apps/web/components/site/GlobalSearch.tsx", "apps/web/components/site/SiteHeader.tsx", "apps/web/components/site/MobileNav.tsx"],
     steps=["组件实现", "可访问性 role=combobox/listbox", "三主题对比度自查"], accept=["web tsc/lint 0 error", "TASK-035 通过（独立验证者判定）", "`grep -rln \"GlobalSearch\" apps/web/app apps/web/components` 仅出现在 site/ 下"],
     verify="pnpm --filter web exec tsc --noEmit && pnpm --filter web lint",
     allow=["apps/web/components/site/GlobalSearch.tsx", "apps/web/components/site/SiteHeader.tsx", "apps/web/components/site/MobileNav.tsx"], forbid=["apps/web/app/api/**", "packages/shared/**"],
     deps=["033", "018"], block_cond="与 S2 TASK-018 同改 SiteHeader → 已串行", escalate="连续 2 次验收失败 → 重写任务书", size="中", hours=8)

task(id="035", slice="S5", name="e2e：搜索（命中/无结果/键盘跳转/移动端）",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="E2E 脚本", req="REQ-F-15", sol="SOL-S5",
     goal="e2e/web/search.spec.ts 通过（含 mobile project）", docs=["contracts/06-ux-states.contract.ts"], contracts=["SearchResponseSchema"], pre_state="TASK-034 已合并",
     outputs=["e2e/web/search.spec.ts"], steps=["种子模型名作为查询词", "Esc 关闭", "mobile 视口"], accept=["`pnpm exec playwright test e2e/web/search.spec.ts --config playwright.config.ts --project=web --workers=1` 通过"],
     verify="pnpm exec playwright test e2e/web/search.spec.ts --config playwright.config.ts --project=web --workers=1",
     allow=["e2e/web/search.spec.ts"], forbid=["apps/**", "packages/**"], deps=["034", "006"], block_cond="testid 不符 → FAIL 回 TASK-034", escalate="2 次失败 → 升 opus", size="小", hours=3)

task(id="036", slice="S5", name="S5 文档同步：API 文档登记搜索端点 + UI/界面交互文档补搜索",
     owner="Agent-Docs", assignee="外部Agent", tier="haiku", tier_reason="登记类", req="AGENTS 铁律2/3", sol="SOL-S5",
     goal="API接口文档登记 API-012；界面交互文档补搜索交互；门禁全 PASS", docs=["contracts/01-api.contract.ts"], contracts=["ENDPOINTS API-012"], pre_state="TASK-035 通过",
     outputs=["docs/architecture/API接口文档.md", "docs/architecture/API架构设计方案.md", "docs/product/design/界面交互文档.md", "docs/文档索引.md"],
     steps=["重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）", "登记", "双向锚", "升版本头", "门禁"], accept=["check-docs-rule exit 0", "check-docs-facts 全 PASS"], verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
     allow=["scripts/check-docs-facts.mjs", "docs/architecture/API接口文档.md", "docs/architecture/API架构设计方案.md", "docs/product/design/界面交互文档.md", "docs/文档索引.md"], forbid=["apps/**", "packages/**", f"{P}/**"],
     deps=["035"], block_cond="无", escalate="无", size="小", hours=2)

# ======================= S6 测试资产与量级基线 =======================
task(id="037", slice="S6", name="e2e 配置口径收敛：根 playwright.config.ts 唯一（138+64 例并表）",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="测试配置整理", req="REQ-NF-03 / 未完成事项 #36", sol="SOL-S6",
     goal="root config 新增 project `flows`（testDir e2e/tests，排除 smoke 重复），package.json test:e2e 指向根配置；`--list` 总数 = 收敛前两配置去重并集，并产出唯一基线表",
     docs=["playwright.config.ts", "e2e/playwright.config.ts", "package.json:16"], contracts=["无"], pre_state="TASK-006 已合并",
     outputs=["playwright.config.ts", "e2e/playwright.config.ts（删除或改为 re-export）", "package.json", f"{P}/06_validation/evidence/EVD-037/e2e-baseline.md"],
     steps=["收敛前 `--list` 两配置各记录", "合并 projects", "收敛后 `--list` 对账", "CI e2e job 改用根配置"],
     accept=["`pnpm exec playwright test --list --config playwright.config.ts` 总数 = 收敛前去重并集（证据表逐文件对账）", "`pnpm test:e2e` 使用根配置"],
     verify="pnpm exec playwright test --list --config playwright.config.ts",
     allow=["playwright.config.ts", "e2e/playwright.config.ts", "package.json", ".github/workflows/ci.yml"], forbid=["apps/**", "packages/**", "e2e/**/*.spec.ts"], deps=["006"],
     block_cond="合并后 smoke 重复执行导致登录限流 → 保留 workers=1 并登记", escalate="2 次失败 → 升 opus", size="中", hours=5)

task(id="038", slice="S6", name="单测覆盖率基线测量（web/shared，不设阈值）",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="测量类", req="REQ-NF-03 / §9.1 基线指标", sol="SOL-S6",
     goal="引入 @vitest/coverage-v8（与 vitest 主版本匹配的 devDependency）并产出 web/shared 行/分支覆盖率首次测量值写入证据；CI 只上报不卡阈值",
     docs=["apps/web/vitest.config.ts"], contracts=["无"], pre_state="无",
     outputs=["apps/web/vitest.config.ts", "apps/web/package.json", "packages/shared/package.json（仅 devDependencies/脚本）", "pnpm-lock.yaml", f"{P}/06_validation/evidence/EVD-038/coverage-baseline.md"],
     steps=["安装与 vitest 2.1.x 匹配的 coverage-v8", "coverage.reporter=text-summary,json-summary", "记录数值"], accept=["`pnpm --filter web exec vitest run --coverage` exit 0 并输出 Lines/Branches 百分比", "测试总数不变（1081）"],
     verify="pnpm --filter web exec vitest run --coverage",
     allow=["apps/web/vitest.config.ts", "apps/web/package.json", "packages/shared/package.json", "pnpm-lock.yaml"], forbid=["apps/web/lib/**", "apps/web/app/**", "packages/shared/src/**"], deps=["004"],
     block_cond="新增 devDependency 被视为技术栈偏离 → 停止待 U-10 裁决", escalate="无", size="小", hours=3)

task(id="039", slice="S6", name="千级模型天梯量级基线（只测量，不优化）",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="测量脚本", req="未完成事项 #17 / R-83（千级）/ §9.1", sol="SOL-S6",
     goal="在 CI 临时库生成 1000 模型（脚本，不进 seed）后测 GET /api/v1/ladder?type=models p50/p95（20 次）与 /models 首屏 HTML 字节数，写入基线证据",
     docs=["scripts/test/benchmark/", "e2e/perf/"], contracts=["无"], pre_state="TASK-006 已合并",
     outputs=["scripts/test/benchmark/ladder-1k.mjs", f"{P}/06_validation/evidence/EVD-039/ladder-1k-baseline.md"],
     steps=["批量插入 1000 AiModel+benchmark（仅临时库，结束 TRUNCATE 回滚）", "autocannon 不可用则用 node fetch 循环计时", "记录 p50/p95/HTML 字节"], accept=["证据含命令、原始样本与 p50/p95", "脚本对非临时库（DATABASE_URL 不含 ci/test 标识）拒绝运行"],
     verify="node scripts/test/benchmark/ladder-1k.mjs --dry-run",
     allow=["scripts/test/benchmark/**"], forbid=["apps/**", "packages/**", "apps/web/prisma/seed*.ts"], deps=["006"],
     block_cond="需改业务代码才能测 → 停止", escalate="无", size="中", hours=6)

# ======================= S7 文档治理收口 =======================
task(id="040", slice="S7", name="需求文档 v1.15 对齐代码事实与用户裁决",
     owner="Agent-Docs", assignee="Hark(主Agent)", tier="opus", tier_reason="需求口径修订（需用户裁决 U-1/U-2/U-11），影响全局范围",
     req="§3 需求基线复核 C-1..C-6", sol="ADR-P004",
     goal="需求文档 §3.5 JWT 有效期、§3.10 后台域表、§3.11 导航口径、§六 MVP（微信扫码/在线支付暂停）、§3.9 实装口径与代码/裁决一致，升 v1.15",
     docs=[f"{P}/03_需求基线复核.md", "docs/product/requirements/需求文档.md"], contracts=["contracts/03-identity.contract.ts TOKEN_TTL"], pre_state="U-1/U-2/U-11 已裁决",
     outputs=["docs/product/requirements/需求文档.md", "docs/文档索引.md"], steps=["逐条按裁决改写", "保留上一版摘要行", "门禁"],
     accept=["check-docs-rule exit 0（核心文档版本头）", "C-1..C-6 每条在文中有对应修订或「保持原文+裁决注记」"], verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
     allow=["docs/product/requirements/需求文档.md", "docs/文档索引.md"], forbid=["apps/**", "packages/**", f"{P}/**"], deps=["009"],
     block_cond="U-1/U-2/U-11 任一未裁决 → 只改无争议条目并标「待裁决」", escalate="涉及范围增删 → 升 fable（需求终裁）", size="中", hours=4)

task(id="041", slice="S7", name="台账拆分 + 勾选滞后补录 + CHANGELOG 补录 finalize 里程碑",
     owner="Agent-Docs", assignee="外部Agent", tier="haiku", tier_reason="整理与拆分，不改语义", req="AGENTS 铁律6（单文档 >3000 字须拆分）", sol="SOL-S7",
     goal="未完成事项目录（155,968 字节）按 §一~§八/§7.x 回执拆为主表 + 回执分册；finalize-admin-ia-and-ops-gaps/tasks.md 按代码证据补勾；CHANGELOG 补 finalize 条目；文档索引同步",
     docs=["docs/plans/未完成事项目录.md", "docs/specs/finalize-admin-ia-and-ops-gaps/tasks.md", "CHANGELOG.md"], contracts=["无"], pre_state="无（与实现无文件交集；但与其他 Agent-Docs 卡串行）",
     outputs=["docs/plans/未完成事项目录.md", "docs/plans/未完成事项回执/*.md（新建分册）", "docs/specs/finalize-admin-ia-and-ops-gaps/tasks.md", "CHANGELOG.md", "docs/文档索引.md", "docs/plans/README.md"],
     steps=["重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）", "拆分保持锚点可达（被引用锚改为分册链接）", "补勾每项附证据路径（如 lib/admin-nav-default-tree.ts、api/v1/admin/holds）", "门禁"],
     accept=["check-docs-rule exit 0", "check-docs-facts 全 PASS", "`grep -rn \"未完成事项目录.md#\" docs` 链接全部可解析（脚本或人工抽查 10 条）"],
     verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
     allow=["scripts/check-docs-facts.mjs", "docs/plans/**", "docs/specs/finalize-admin-ia-and-ops-gaps/tasks.md", "CHANGELOG.md", "docs/文档索引.md"], forbid=["apps/**", "packages/**", f"{P}/**", ".example/**"],
     deps=["040"], block_cond="check-docs-facts 硬引用台账路径 → 本卡同步脚本中的路径（Agent-Docs 所有）", escalate="无", size="中", hours=5)

# ======================= S8 生产部署（BLOCKING U-3） =======================
task(id="042", slice="S8", name="备份/恢复演练脚本（pg_dump→restore→逐表行数比对）",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="运维脚本", req="未完成事项 #3 生产级数据策略", sol="SOL-S8",
     goal="scripts/ops/pg-drill.mjs 在 CI PG 上完成 dump→新库 restore→68 模型对应表行数逐表一致，输出耗时与备份体积",
     docs=["docs/engineering/部署运维文档.md"], contracts=["无"], pre_state="TASK-006 已合并",
     outputs=["scripts/ops/pg-drill.mjs", ".github/workflows/ci.yml（可选 workflow_dispatch 步骤）"], steps=["pg_dump -Fc", "createdb + pg_restore", "information_schema 行数比对"],
     accept=["演练输出 diff=0", "证据含耗时/体积"], verify="node scripts/ops/pg-drill.mjs --source $DATABASE_URL",
     allow=["scripts/ops/**", ".github/workflows/ci.yml"], forbid=["apps/**", "packages/**", "docker/**"], deps=["006"], block_cond="CI 镜像无 pg_dump 客户端 → 使用 postgres:16 容器内执行", escalate="无", size="中", hours=5)

task(id="043", slice="S8", name="生产部署实弹（条件方案 A：自有服务器 docker compose prod）",
     owner="Agent-Guard", assignee="Hark(主Agent)", tier="opus", tier_reason="生产环境不可逆操作 + 密钥处理", req="未完成事项 #2 生产部署实弹（P0）", sol="SOL-S8 方案A/B",
     goal="在用户提供的服务器上以 docker/docker-compose.prod.yml 起服，/api/v1/system/ready=200、e2e smoke 对生产域名通过、备份任务就绪",
     docs=["docker/docker-compose.prod.yml", "docs/engineering/部署运维文档.md", "docs/archive/REL-ENG-02-发布收口与运行契约.md"], contracts=["SystemReadySchema"],
     pre_state="U-3 裁决（服务器/域名/密钥/registry）完成；TASK-042 演练通过", outputs=["docker/.env（不入库）", "deploy/**（按需）", f"{P}/06_validation/evidence/EVD-043/"],
     steps=["方案A：服务器供给→env 五件套→compose up -d→migrate deploy→seed（生产口径）→ready 检查→smoke", "方案B（U-3=暂缓）：本卡冻结，仅保留 TASK-042"],
     accept=["`curl https://<域名>/api/v1/system/ready` 200", "smoke 7 例对生产 baseURL 通过", "密钥扫描（TASK-007）对仓库 0 命中"], verify="E2E_BASE_URL=https://<域名> pnpm exec playwright test --config playwright.config.ts --project=smoke",
     allow=["deploy/**", "docker/**", "Dockerfile"], forbid=["apps/**", "packages/**"], deps=["042", "007", "003"],
     block_cond="U-3 未裁决 → 不执行", escalate="生产故障 → 立即回滚并上报用户", size="大", hours=16)

# ======================= S9 子平台介绍页截图区块（BLOCKING U-4） =======================
task(id="044", slice="S9", name="Product.intro 契约扩展：screenshots（≤6，url/alt/caption）",
     owner="Agent-Contract", assignee="外部Agent", tier="sonnect", tier_reason="向后兼容的可选字段扩展", req="未完成事项 #70 / R-84 介绍页充实", sol="SOL-S9",
     goal="ProductIntroSchema 增 screenshots?: ProductIntroScreenshotSchema[] (max 6)，旧数据 parse 不受影响（单测）",
     docs=["packages/shared/src/schemas/admin.schema.ts:378-430", "contracts/01-api.contract.ts §S9"], contracts=["ProductIntroScreenshotSchema"], pre_state="U-4 素材托管方式已裁决",
     outputs=["packages/shared/src/schemas/admin.schema.ts", "packages/shared/src/__tests__/schemas.spec.ts"], steps=["加可选字段", "单测旧 intro v1/v2 样本仍通过"], accept=["shared tsc+test 全绿"],
     verify="pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test",
     allow=["packages/shared/src/schemas/admin.schema.ts", "packages/shared/src/__tests__/schemas.spec.ts"], forbid=["apps/**"], deps=["001"],
     block_cond="U-4 未裁决 → 不执行", escalate="无", size="小", hours=2)

task(id="045", slice="S9", name="UI：介绍页截图画廊区块 + 后台 intro 编辑器截图条目",
     owner="Agent-App", assignee="Hark(主Agent)", tier="opus", tier_reason="展示页视觉设计，主 Agent 亲自完成", req="#70 / R-84", sol="SOL-S9",
     goal="/products/[slug] 有截图时渲染画廊（懒加载、点击放大、SafeImage 兜底），无截图不渲染；后台 ProductsManager 可增删排序截图",
     docs=["contracts/04-resources.contract.ts", "docs/product/design/UI设计文档.md"], contracts=["ProductIntroScreenshotSchema", "ImageRefSchema"], pre_state="TASK-044 已合并",
     outputs=["apps/web/app/(site)/products/[slug]/page.tsx", "apps/web/components/site/ProductScreenshots.tsx", "apps/web/components/admin/ProductsManager.tsx（或其 intro 子编辑器）"],
     steps=["画廊组件", "后台编辑条目", "tsc/lint"], accept=["web tsc/lint 0 error", "人工：无截图产品页面与现状逐像素一致（截图对比证据）"],
     verify="pnpm --filter web exec tsc --noEmit && pnpm --filter web lint",
     allow=["apps/web/app/(site)/products/[slug]/**", "apps/web/components/site/ProductScreenshots.tsx", "apps/web/components/admin/ProductsManager.tsx", "apps/web/components/admin/ProductIntroEditor.tsx"], forbid=["apps/web/app/api/**", "packages/shared/**"],
     deps=["044"], block_cond="U-4 未裁决 → 不执行", escalate="连续 2 次验收失败 → 重写任务书", size="中", hours=8)

task(id="046", slice="S9", name="S9 文档同步：合作产品内容配置 / 子平台介绍页 intro 字段登记",
     owner="Agent-Docs", assignee="外部Agent", tier="haiku", tier_reason="登记类", req="AGENTS 铁律3", sol="SOL-S9",
     goal="合作产品内容配置文档与 API 文档 products 契约节登记 screenshots 字段；门禁全 PASS", docs=["docs/product/design/合作产品内容配置.md"], contracts=["ProductIntroScreenshotSchema"], pre_state="TASK-045 已合并",
     outputs=["docs/product/design/合作产品内容配置.md", "docs/architecture/API接口文档.md", "docs/文档索引.md"], steps=["重算本切片引入的计数漂移（route/page/spec/lib-features/@aidean/ui refs）并同步 scripts/check-docs-facts.mjs 期望值；admin 域/页数变化同步《功能设计文档》§3.5 口径锚（check-docs-rule 以文档为锚）", "登记", "升版本头", "门禁"],
     accept=["check-docs-rule exit 0", "check-docs-facts 全 PASS"], verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
     allow=["scripts/check-docs-facts.mjs", "docs/product/design/合作产品内容配置.md", "docs/architecture/API接口文档.md", "docs/文档索引.md"], forbid=["apps/**", "packages/**", f"{P}/**"], deps=["045"],
     block_cond="无", escalate="无", size="小（<2h，§6.3 过小信号：Agent-Docs 独占文档路径，无法并入 TASK-045（Agent-App）；保留独立卡）", hours=1)

SLICES = {
    "S0": ("步行骨架与契约守卫", "契约唯一源 + 就绪探针 + 鉴权写闭环 e2e + CI 真库重放 + 守卫脚本", "无"),
    "S1": ("价格历史唯一约束修复（数据完整性）", "同一模型多次采集不再 P2002；为限时优惠多行价格铺路", "U-无（技术缺陷）"),
    "S2": ("功能开关运行时（需求 §3.9）", "后台切换开关 → 前台入口隐藏/页面 403/API 50011", "U-7（失败策略）"),
    "S3": ("收藏", "登录用户收藏模型/站点并在控制台管理", "U-8（是否保留需求）"),
    "S4": ("限时优惠计费生效（需求 §3.6）", "后台建优惠 → 前台显示优惠价 → 网关按优惠价扣费", "U-9（是否叠加等级折扣）"),
    "S5": ("顶栏全局搜索", "顶部导航搜索模型/产品/资讯并跳转", "U-5（是否需要）"),
    "S6": ("测试资产与量级基线", "e2e 唯一配置 + 覆盖率首测 + 千级天梯首测", "U-10（新增 devDep）"),
    "S7": ("文档治理收口", "需求文档对齐代码与裁决 + 台账拆分 + 勾选补录", "U-1/U-2/U-11"),
    "S8": ("生产部署实弹", "备份恢复演练通过 → 生产 ready=200", "U-3（BLOCKING）"),
    "S9": ("子平台介绍页截图区块", "介绍页展示真实截图画廊", "U-4（BLOCKING）"),
}

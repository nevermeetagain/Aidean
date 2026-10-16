# V0.4.0 规划反向审计（只读）→ V0.5.0 修正输入

> 审计对象：`docs/任务规划V0.4.0/`（RTM 99 条、73 张卡）｜仓库：`/workspace/work/aidean/repo` main@cd5b1a9
> 代码基线：`git diff --stat 77c7952 cd5b1a9 -- apps packages` 输出为空，业务代码无 delta，已核实。
> 方法：逐条到 `apps/web`、`packages`、`scripts`、`e2e` 用 grep/sed/vitest 取证。下文代码路径若无前缀，均相对 `apps/web/`。全程只读，仓库未做任何修改。
> 结论标记：**成立** / **不成立** / **证据不足**。

---

## 0. 摘要

| 维度 | 结论 |
|---|---|
| 需求覆盖 | 99 条以外**新发现 14 条遗漏需求**（MUST 7 / SHOULD 7）。主要来自《功能设计文档》《子平台SSO接入指南》《登录方案》，以及需求文档 §3.4.1、§七。V0.4.0 在 15_前提与局限.md:23 中**主动把设计文档排除在 RTM 之外**，这是遗漏的根源。 |
| 状态复核 | 部分实现/未实现 45 条全部复查：**成立 41｜不成立 1（REQ-M-006）｜证据不足 3**。已实现 43 条抽查 20 条：**成立 19｜不成立 1（REQ-F-010）**。 |
| 任务卡 | 抽查 12 张（6 Hark / 6 外部）：**7 张有问题**，包括迁移计数写错、grep 验收在文件不存在时会误判通过、允许路径与既有组件不符、依赖与 00_深度分析 自相矛盾、契约名写错。 |
| 执行者分工 | 外部卡中**含 UI 实现的数量为 0**，脚本已核验。另有 **8 张卡分配不当**：核心/高难卡被派给外部或低档位 4 张；与既有实现重叠、需要先由 Hark 定设计 1 张；Hark 卡偏简单或可外包 3 张。 |
| 内部矛盾 | 共 **13 处**：计数、DAG 串行链与边不一致、迁移数量、基线 commit、RTM 表格转义等。 |

---

## 1. 需求覆盖：V0.4.0 99 条以外的遗漏

### 1.1 需求源清单（已全量检索）
- `docs/product/requirements/需求文档.md`（185 行）、`项目需求更新分析.md`
- `docs/product/modules/{天梯模块设计文档,登录方案,子平台SSO接入指南,子平台规范说明,支付渠道集成指南}.md`
- `docs/product/design/{功能设计文档,界面交互文档,UI设计文档,合作产品内容配置}.md`
- `docs/plans/未完成事项目录.md`（台账）、`参考文档/**`、`.example/参考文档/**`
- **inbox**：仓库内**不存在** Aidean 的 inbox 目录（`find / -iname '*inbox*'`）。`/workspace/.trash/2026-10-14-06/*-REQ-INBOX-20261010-001.md` 属于另一个项目（弘道教育 hd1994.com 官网重构，正文第 2 节），**不是 Aidean 的需求，已排除**。
- **REQ-M-001..016 的来源** `instruction_v3`（01_规划快照.md:19 记为 `/workspace/work/aidean_planning_instruction_v3.md`）**在工作区不存在**（`ls` 返回 No such file）。这 16 条需求的原文无法回溯，见矛盾 C-13。

### 1.2 遗漏需求（MUST/SHOULD，均不在 03a 的 99 条中）

| 建议 ID | 分级 | 源文件:行 | 可验证表述 | 代码现状（证据） | 建议状态 |
|---|---|---|---|---|---|
| REQ-F-053 | MUST | 需求文档.md:69 | 生产上线前，seed 演示数据（verifiedStatus=1）须逐条人工审核 | `prisma/seed.ts:531` 统一写 `verifiedStatus: 1, // 演示环境豁免`；没有上线前的审核清单、脚本或任务 | 未实现（发布门禁缺口，无任务卡） |
| REQ-F-054 | MUST | 功能设计文档.md:233-281（§五 D-2=C）、:276 | 字段所有权矩阵：sync 只 SET sync 字段，不覆盖人工字段；新增字段须先登记写者 | 本轮没有逐字段核验 `lib/sync/writers/index.ts`；RTM 与任务中均无对应条目 | 证据不足（需立核验卡） |
| REQ-F-055 | MUST | 需求文档.md:66；功能设计文档.md:279 | 人工与 sync 的所有写操作都写 `model_change_logs`（前后值） | 存在 `lib/features/admin/model-change-log.ts`、`lib/sync/writers/index.ts`（grep `modelChangeLog.create`）；admin 路由是否全量覆盖尚未穷举 | 部分确认 |
| REQ-F-056 | MUST | 子平台SSO接入指南.md:55,89,141,215-218,229 | 主平台 OIDC 授权端：公共客户端强制 PKCE 且只接受 S256（不支持 plain）；refresh 轮换并做重放检测，命中即撤销整链；会话 Cookie 为 host-only | 有实现迹象：`lib/features/auth/repository.ts:59,67`（chainId / `kind:"replayed"`），`lib/features/oauth/codes.ts`、`clients.ts` 含 PKCE。RTM 只登记了 back-channel（NF-010）和 tokenVersion（NF-011），这组安全红线未入表、也没有回归守卫 | 已实现（待核，应纳入 RTM 并加守卫测试） |
| REQ-F-057 | SHOULD | 登录方案.md:16（R2 邮箱验证码登录，标注「非必须」） | 邮箱验证码登录通道 | 已实现：`app/api/v1/auth/email/{code,verify}` | 已实现（RTM 漏登） |
| REQ-F-058 | SHOULD | 需求文档.md:179（§七 验收） | 五维筛选每组「全部」可全选、也可全不选 | `components/ladder/LadderFilterBar.tsx:5,152` 只有「不限」（清空该组），没有「全选」 | 部分实现 |
| REQ-F-059 | MUST | 需求文档.md:44-46、:180 | 详情页基准测试以**弹窗**呈现；历史测评示例为多模型回答并排 | 见 §2 REQ-F-010（不成立）：`app/(site)/models/[slug]/page.tsx:374` 是「测评示例功能即将上线（Phase 4）」占位；基准测试在 :342-357 以内联 `<table>` 展示，无 dialog/modal | 部分实现（并入 F-010 改判） |
| REQ-F-060 | SHOULD | 功能设计文档.md:322-324（D.4） | 缓存命中 token 参与计价（priceCache / discountCache） | `lib/features/gateway/service.ts:681-704` 预估扣费只用 priceInput/priceOutput；`cachedTokens` 在 :712-860 解析后只落库，不参与计价 | 未实现 |
| REQ-F-061 | SHOULD | 功能设计文档.md:209-211 | 后台批量能力：models/batch-status、prices/batch-upsert、requestId 幂等 | `app/api/v1/admin/models/batch/route.ts` 已存在；`app/api/v1/admin/prices/` 下只有 `[id]` 和 `route.ts`，没有 batch-upsert | 部分实现 |
| REQ-F-062 | MUST | 需求文档.md:90-92 | 通用版等级固定序 Opus>Sonnet>Fable>Haiku；专业版默认映射 1/2/3/4；free 等级由系统定义、用户不可配 | `lib/features/gateway/service.ts:5`「等级映射(1/2/3/4)与优先级(1~99)合并…free 兜底」。现有 RTM F-033 只写了「共享路由配置」，验收粒度不够 | 已实现（需在 RTM 细化表述） |
| REQ-F-063 | SHOULD | 需求文档.md:105 | 限时优惠「随上游价格采集同步展示价」 | F-038 的可验证表述没有这半句；TASK-026–031 也没有覆盖采集同步 | 未实现（并入 F-038 表述） |
| REQ-L-013 | SHOULD | 未完成事项目录.md:221（台账 #67，🟡 待立项） | 详情页「测评示例」占位立项 | 同 REQ-F-059 | 未实现（无任务卡） |
| REQ-L-014 | SHOULD | 未完成事项目录.md:46（台账 #19，🟡 治理待收口） | admin 配置治理专项收口 | RTM 只引用了 #35 / #43，#19 未登记 | 证据不足 |
| REQ-NF-012 | SHOULD | 需求文档.md:41（「天梯页面不展示页脚」）+ §五.3 | 天梯页无页脚 | F-009 证据只核了「到底了」，页脚隐藏没有取证 | 证据不足 |

> 说明：子平台规范说明主要约束子平台；主平台侧的端口义务已由 REQ-C-005/006 覆盖，不再重复列出。AideanBot 分级权益（需求文档.md:56）属子平台范围，已排除。

---

## 2. 状态复核

### 2.1 「部分实现 / 未实现」45 条（全部复查）

| ID | V0.4.0 状态 | 复核 | 证据（文件:行 / 命令） |
|---|---|---|---|
| REQ-F-011 | 未实现 | 成立 | `lib/features/gateway/service.ts:681-704`、:991-1004 以 `Number(price.priceInput)` 直接作为 ¥/M，不读 billingCurrency；seed 中 `priceCurrency: 'USD'` 共 48 处（grep -c）；`app/(site)/pricing/page.tsx:6,84` 按行内币种出 `$`；`lib/discovery/pricing-extraction.ts:217-243` 硬编码 7.2 |
| REQ-F-015 | 部分 | 成立 | `prisma/seed.ts:845,884,923` 指向 github.com/aideanew |
| REQ-F-019 | 部分 | 成立 | `prisma/schema.prisma:480 @@unique([modelId, isCurrent])`：false 行同样受唯一约束，第二次写 false 必然 23505；PGlite 证据 `06_validation/evidence/EVD-BASELINE-V2/pglite-repro-p2002.txt` 存在 |
| REQ-F-021 | 未实现 | 成立（附带纠正） | `lib/sync/cross-validator.ts` grep weight/fusion 为 0；另外 `项目需求更新分析.md:257` 称「schema 中 weight/isWeighted/scorePercentile 字段存在」，但 grep schema 无 isWeighted/scorePercentile，该文档陈述已过时 |
| REQ-F-024 | 未实现 | 成立 | `app/api/v1/wechat/qrcode/route.ts:19-23` 注释桩 |
| REQ-F-027 | 未实现 | 成立 | `lib/features/billing/service.ts:200-206` 生产环境直接抛「支付渠道尚未接入」，非生产走 mock |
| REQ-F-038 | 未实现 | 成立 | `schema.prisma:499 PROMOTION` 仅枚举；`lib/features/gateway/repository.ts:89,109` 只取 `isCurrent:true` |
| REQ-F-041 | 未实现 | 成立 | grep `featureFlag\|feature_flag\|50011`（lib/app/components/middleware）为 0；种子在 `seed.ts:240-248` |
| REQ-F-042 | 未实现 | 成立 | `ls app/api/v1/admin` 共 36 个目录，无 feature-flags；需求文档.md:133 写「✅GET/✅PATCH」，与代码不符 |
| REQ-F-052 | 未实现 | 成立 | `schema.prisma:1307 model Favorite`；app/lib/components 运行时 grep favorite 为 0 |
| REQ-C-008 | 部分 | 成立 | 台账 `wc -c` = 155968；`node scripts/check-docs-rule.mjs` PASS |
| REQ-NF-001 | 未实现 | 成立 | `packages/shared/src/types/index.ts:74-75,85`（10002/10003/50001 旧表）与 `app/api/v1/_lib/errors.ts`（22 码）双源并存 |
| REQ-NF-002 | 未实现 | 成立 | `app/api/v1/system/health/route.ts:11-14` 恒返回 ok；`app/api/v1/system/` 下只有 health、navigation |
| REQ-NF-003 | 未实现 | 成立 | 台账 未完成事项目录.md:19 #2 ⬜ |
| REQ-NF-004 | 未实现 | 结论成立，证据**表述有误** | 已有 `scripts/db/backup.sh`（98 行）、`scripts/db/restore.sh`（59 行，:56-59 只统计表数量）、`restore-path.test.mjs`。V0.4.0 写「无演练脚本」不准确：缺的是**逐表行数比对与演练记录**，不是脚本本身。TASK-042 应复用这两个脚本 |
| REQ-NF-005 | 部分 | 成立 | `.github/workflows/ci.yml:5`「e2e…暂不进 CI」；存在 `playwright.config.ts` 与 `e2e/playwright.config.ts` 两套配置 |
| REQ-NF-006 | 未实现 | 成立 | ci.yml:36-61 各步中无 lint、无 @aidean/ui 测试、无守卫脚本 |
| REQ-NF-007 | 部分 | 证据不足（与 V0.4.0 一致） | 无 DB，无法测量基线 |
| REQ-NF-008 | 未实现 | 成立 | grep coverage：`apps/web/package.json`、`vitest.config.ts` 均为 0 |
| REQ-NF-009 | 部分 | 成立 | `middleware.ts:65-67` 使用 AUTH_ISSUER；`docs/specs/harden-rc02-standalone-address/checklist.md` 有 16 项未勾 |
| REQ-NF-010 | 部分 | 成立 | `lib/features/oauth/backchannel.ts:48,83-87` 有限重试 |
| REQ-NF-011 | 部分 | 成立 | `lib/features/auth/session.ts:53-66` 只回库比对 status/deletedAt |
| REQ-L-001 | 未实现 | 成立 | `app/(admin)/admin/` 下无 tools；`e2e/admin/tools.spec.ts:66` describe.skip |
| REQ-L-002 | 部分 | 成立 | `app/api/v1/admin/wallets/adjust/route.ts` 中 note 只进 writeAudit 的 newData |
| REQ-L-003 | 未实现 | 成立 | `schema.prisma:972-984 UsageDailyStat` 无扩列 |
| REQ-L-004 | 未实现 | 成立 | `apps/web/docs/index.json` 存在但没有生成脚本，仅 check-docs-rule 引用 |
| REQ-L-007 | 未实现 | 成立 | 未完成事项目录.md:44 #17 🟡；:113 #36 🟡 与 :295 ✅ 相互冲突 |
| REQ-L-008 | 部分 | 成立 | grep `- [ ]`：establish-dev-workflow tasks 33、checklist 3；harden-rc02 checklist 16 |
| REQ-L-009 | 未实现 | 成立（实为部分） | 03a 已存在但尚未入 docs/plans |
| REQ-L-012 | 部分 | 成立 | 实测 components 非 admin 18/51 引用 @aidean/ui |
| REQ-M-001 | 部分 | 成立 | `lib/sync/sources/registry.ts:34-46` 只有 key/label/role 11 源；schema 68 个 model，grep monitoring 为 0 |
| REQ-M-002 | 部分 | 成立 | `seed.ts:300-308` crawl_models 02:00；`lib/sync/adapters/` 无 aihubmix；grep credential_missing 为 0 |
| REQ-M-003 | 未实现 | 成立 | SyncBatch 无 hash/raw 字段；`schema.prisma:2212 MarketSnapshot` 为全局聚合 |
| REQ-M-004 | 未实现 | 成立 | `schema.prisma:579 @@unique([providerId, modelId])`；写入方只有 `app/api/v1/admin/providers/[id]/offerings/**` |
| REQ-M-005 | 部分 | 成立 | `lib/intelligence/change-detector.ts:13` 六类全局事件，没有快照 ID |
| **REQ-M-006** | **未实现** | **不成立 → 应为「部分实现」** | ① 已有公开端点 `app/api/v1/models/[id]/stations/route.ts:1-37`，返回服务该模型的站台及资费；② 前台详情页已有多源区块 `app/(site)/models/[slug]/page.tsx:246-290`「提供商与折扣价」，逐个 offering 展示原币标价与 listedAt。V0.4.0「无 offerings 端点、前台无多源区块」的说法有误，TASK-066/067 存在重复建设风险 |
| REQ-M-007 | 部分 | 成立 | `schema.prisma:461-467` 有 billingCurrency/billingUnit/originalCurrency/exchangeRate；`pricing-extraction.ts:217-243` 硬编码 7.2 |
| REQ-M-008 | 部分 | 成立 | `lib/discovery/llmtest.ts:63` 把 score 拼进 meta；`reliabilityObservation.` 写入方 grep 为 0 |
| REQ-M-009 | 部分 | 成立 | `lib/features/admin/script-executor.ts`；`docker/docker-compose.prod.yml:354` scheduler |
| REQ-M-011 | 未实现 | 成立 | 只有 `app/(admin)/admin/{sync,discovery}/page.tsx`；可复用 `app/api/v1/admin/scripts/run-due/route.ts:27,75` 的锁 |
| REQ-M-012 | 未实现 | 成立 | shared/src/schemas 中无 monitoring；20004/50012 grep 为 0 |
| REQ-M-013 | 未实现 | 成立 | admin 页面中无 monitoring |
| REQ-M-014 | 部分 | 成立 | `app/api/v1/admin/discovery/candidates/[id]/promote/route.ts` 为人工 promote |
| REQ-M-015 | 部分 | 成立 | `lib/sync/adapters/artificial-analysis.ts:5,67,70`（原端点 404，回落到 OpenRouter）；components / app/(site) 中 grep「Artificial Analysis」为 0 |
| REQ-M-016 | 未实现 | 成立 | `lib/discovery/protocol-probe.ts` grep signature/identity/thinking 为 0 |

小计：成立 41（REQ-NF-004 的结论成立，但证据需更正）｜不成立 1（REQ-M-006）｜证据不足 3（REQ-NF-007、REQ-L-003 仅核了 schema、REQ-L-009 实为部分）。

### 2.2 「已实现」抽查 20 条（覆盖天梯、详情、测评、后台、认证、计费、网关、排名、首页、约束、监控各模块，优先 MUST）

| ID | 复核 | 证据 |
|---|---|---|
| REQ-F-001 | 成立 | `app/api/v1/ladder/route.ts:59-73` 用 LadderQuerySchema 校验 type；`app/(site)/models`、`providers` 页面存在 |
| REQ-F-006 | 成立 | `lib/features/ranking/formula-parser.ts`；`ladder/route.ts:75` 读取 `formula` |
| REQ-F-007 | 成立 | `lib/features/ladder/__tests__/ladder.spec.ts:540-546`（g=5 → 100,95…） |
| REQ-F-009 | 成立（页脚未核，见 REQ-NF-012） | `components/ladder/LadderMatrixBoard.tsx:565`「到底了」 |
| **REQ-F-010** | **不成立 → 部分实现** | `app/(site)/models/[slug]/page.tsx:374`「测评示例功能即将上线（Phase 4）」占位；基准测试为内联 table（:342-357），无弹窗。目录与高亮已实现（`components/models/DetailToc.tsx:5-25`） |
| REQ-F-012 | 成立 | `lib/features/evaluation/service.ts:64-67 evalPerModelMinor`、:214 captureHold；`seed.ts:275 pricing.evalPerModel=2` |
| REQ-F-018 | 成立 | `app/api/v1/admin/prices/route.ts:131 writeAudit` |
| REQ-F-022 | 成立 | `app/api/v1/auth/{register,login,refresh,logout,me}`；`lib/features/auth/keys.ts:18` RS256 |
| REQ-F-025 | 成立 | `schema.prisma:868-872 RefreshCycle`；`app/api/v1/admin/free-quotas/batch` |
| REQ-F-026 | 成立（附缺陷） | `app/(site)/pricing/page.tsx:31` 本地硬编码 `[10,55,115,600,2500]`，与 `packages/shared/src/constants/billing.constants.ts:43-47 RECHARGE_TIERS` 重复，单一源被违反 |
| REQ-F-029 | 成立 | `app/(site)/user/balance/page.tsx:134-138` |
| REQ-F-030 | 成立 | `app/api/v1/_lib/errors.ts:72 INSUFFICIENT_BALANCE: 40001` |
| REQ-F-032 | 成立 | `lib/features/gateway/service.ts:5-8,17,58` free 兜底链；9 个 __tests__ 文件 |
| REQ-F-034 | 成立 | `packages/shared/src/utils/billing.ts:49-64`；非 admin 的 route.ts grep markupRate/tokenMultiplier 为 0 |
| REQ-F-040 | 成立 | `app/api/v1/admin/redemption-codes/{batch,batches,[id]}` |
| REQ-F-047 | 成立 | `app/api/v1/admin/ranking-weights/route.ts:61-62` revalidatePath |
| REQ-F-050 | 成立 | `components/home/PartnerMarquee.tsx:9,15,48` reverse |
| REQ-C-001 | 成立 | grep `dark:` 仅命中 `CompareDock.tsx:8`（注释）和 `packages/ui/src/components/ui/button.tsx:22`（variant 名为 dark 的深色按钮，不是深色模式类） |
| REQ-C-005 | 成立 | `playwright.config.ts:59` 3000；`Dockerfile:77 ENV PORT=3000` |
| REQ-M-010 | 成立 | grep `sk-or-\|OPENROUTER_API_KEY\|SILICONFLOW\|AA_API`（lib/app/scripts）为 0 |

小计：成立 19，不成立 1（REQ-F-010）。

---

## 3. 任务卡质量抽查（12 张，seed=20261014 随机抽取）

抽样：Hark = 018、023、045、058、060、071；外部 = 028、039、041、049、055、059。

在沙箱中实际运行的命令：
- `node scripts/check-docs-rule.mjs` 返回 exit 0；`node scripts/check-docs-facts.mjs` 返回 exit 0，「All 14 assertions passed」（TASK-041 的验证命令可执行）。
- `npx vitest run lib/features/auth/__tests__/admin-config-seed-parity.spec.ts lib/admin-nav`：3 个文件、26 个用例通过（TASK-055、TASK-058 的测试筛选器可解析）。
- `grep -nE "\.(create|update|delete|upsert)" scripts/audit/price-normalization-audit.mjs`：stdout 无输出、exit=2（文件不存在）。这正是 TASK-049 验收「无输出」的判据，**文件不存在也会误判通过**。
- `grep -n "pricing.fxUsdCny" apps/web/prisma/seed.ts` 当前为 0 行，与 TASK-055「恰 1 行」可机械判定。
- `vitest.config.ts:13 include: ["lib/**/*.spec.ts"]`：TASK-059 的 `lib/sync/writers/catalog-snapshot.spec.ts` 能被收集；但 UI 卡（018/023/045/064/067）在 components/app 下写测试**不会被收集**。

| 卡 | 允许路径 | 验证命令 | 验收可机械判定 | 依赖 | 问题 |
|---|---|---|---|---|---|
| 018 (H) | 9 条路径中 `components/common/FeatureDisabled.tsx` 不存在（新建，合理），其余存在 | tsc + lint（`apps/web/package.json:11 "lint": "next lint"`）可执行 | 「对比度 ≥4.5:1」需人工；功能验收全部依赖 TASK-019 | 015/016/017 正确 | 卡内没有可独立运行的功能验证，自身验收只剩 tsc/lint |
| 023 (H) | 存在，`components/ladder/**` 范围过宽 | 同上 | 「悬浮态不遮挡分数」需人工 | 022 正确 | 写 `components/ladder/**` 与 S5/S4 卡潜在冲突，资源锁只写在文字说明里 |
| 045 (H) | **`components/admin/ProductIntroEditor.tsx` 不存在**；intro 编辑器实际位于 `components/admin/ProductsManager.tsx`（grep intro 唯一命中） | 可执行 | 「逐像素一致」需人工 | 044 正确 | 路径与现状不符 |
| 058 (H) | 合理 | 需要 `$TEST_DATABASE_URL`，沙箱无法执行 | **「空库 migrate deploy 17/17」错误**：现有迁移 16 个（`ls prisma/migrations` 除 toml 外 16 个）+ M-001（TASK-011，`20261014000000_…`）+ M-002 = **18** | 011/056 正确 | 计数错误（矛盾 C-6） |
| 060 (H) | `lib/monitoring/catalog/` 为新目录，归属 Agent-API ✓ | 可执行（目录创建后） | 可机械判定 ✓ | 056 ✓ | 无。fixture 价格 30/60 为假设值，需按 OpenRouter 实际的每 token 字符串换算 |
| 071 (H) | 合理 | 可执行 | 可机械判定 ✓ | 070（条件 U-M3）✓ | 无 |
| 028 (E) | 合理；测试放在 `lib/features/auth/__tests__/` 符合既有惯例 | 可执行 | ✓ | 026/011 | **目标写「按契约实现（admin.models.*）」，契约名错误**，应为 prices.promotions |
| 039 (E) | `scripts/test/benchmark/` 已存在 ✓ | `--dry-run` 可执行 | 「拒绝非临时库」✓ | 006 | 无 |
| 041 (E) | 合理 | 已实测可执行 | 「人工抽查 10 条链接」不可机械判定 | 040 | 156KB 台账拆分加链接保真却定为 haiku 档，档位偏低 |
| 049 (E) | `scripts/audit/` 新建，归 Guard ✓ | 可执行 | **grep 判据在文件不存在时误判通过**；「USD 与 CNY 两行」与「按 currency×unit×source 分组」口径冲突 | **依赖 006 与 00_深度分析.md:71「S0 不阻塞 049 盘点」矛盾** | 3 处问题 |
| 055 (E) | seed.ts ✓ | 可执行，当前通过 | parity 测试只校验 registry→seed 方向，**新增键不在 registry 时仍会通过**，测试对本卡无约束力 | 依赖 026；**契约键（047）排在种子（055）之后，顺序倒置** | 依赖顺序与契约先行原则相反 |
| 059 (E) | ✓ | ✓ | ✓ | 058 ✓ | 无 |

---

## 4. 执行者分工复核（73 张逐张检查）

**机械检查**（脚本解析每张卡的「允许修改」）：外部卡中触及 `components/`、`app/(site)`、`app/(admin)`、`packages/ui`、`navigation.ts` 的数量为 **0**；外部卡「目标」中含 UI/页面/组件/渲染字样的只有 TASK-019（e2e 断言，不是 UI 实现）。**「UI 由 Hark 完成」这一条整体满足。**

**分配不当的卡：**

| 卡 | 当前 | 问题 | 建议 |
|---|---|---|---|
| TASK-006 | 外部 / sonnect | CI 真库 e2e 骨架处在关键路径上，是 35 张卡的功能祖先（脚本计算），属核心、高难的基础设施 | 改由 Hark 执行，或升 opus |
| TASK-028 | 外部 / sonnect | 优惠窗口与价格行直接决定扣费，属资金路径。10_档位与成本预算.md:10 规定「资金路径 opus」 | 升 opus，或由 Hark 执行并请外部 review |
| TASK-051 | 外部 / sonnect | RTM 入库对应用户本次核心指令 REQ-L-009（MUST），且需要裁决台账矛盾 | 改由 Hark 执行 |
| TASK-057 | 外部 / sonnect | 修改需求文档（新增 §3.4.2），与同性质的 TASK-040（Hark/opus）不一致，属需求范围决策 | 改由 Hark 执行，或并入 040 |
| TASK-066 | 外部 / sonnect | 与既有 `/api/v1/models/[id]/stations` 和详情页 offerings 区块重叠（§2 REQ-M-006），需要先做端点合并/取舍的设计 | 先由 Hark 出设计（可并入 056/067），再外包实现 |
| TASK-041 | 外部 / **haiku** | 155,968 字节台账拆分加跨文档锚点保真，不是简单任务 | 执行者不变，档位改 sonnect |
| TASK-070 | Hark / opus 大/8h | 060 框架建好后按模式复制 keyed collector，加上 credential_missing 分支，属中等难度 | 改为外部 / sonnect，由 Hark 审 |
| TASK-014、TASK-026 | Hark / opus 小/3h | 规模小，但属契约语义，10_档位与成本预算.md:10 已说明理由 | 保留（低优先级标注） |

---

## 5. V0.4.0 内部矛盾

| # | 矛盾 | 证据 |
|---|---|---|
| C-1 | RTM 表格中 `\|` 未转义，导致两行列错位 | 03a:30（`models\|stations`）、03a:108（`tasks.md\|checklist.md`）。按列机械解析只得到 已实现 42、部分 18，与汇总 03a:10 的 43/19 不符 |
| C-2 | 需求总数仍写 83 | 15_前提与局限.md:23「RTM 83 条」、14_自检结果.md:7「83/83」、00_深度分析.md:64,80，与 README.md:8 / 03a:9 的 99 条冲突 |
| C-3 | Hark 卡数写 16 | 11_基线指标.md:60「Hark 执行的 16 张卡」，与 task-index.md:5 的 24 张冲突 |
| C-4 | 祖先计数过时 | 06_垂直切片清单.md:25、00_深度分析.md:71「001 是 51 张卡祖先、006 是 24 张」；按 08 §8.5 的 101 条边脚本计算为 **69 / 35** |
| C-5 | 文档链顺序与资源锁边相反 | 08 §8.7 写 `…031 → 036 → 040 → 041…`，而 §8.6 有边 `TASK-040 → TASK-036`、`TASK-041 → TASK-036` |
| C-6 | 迁移数量 | 08 §8.8「本规划仅 M-001 一个迁移」与 §8.2④「M-001、M-002 两个迁移」冲突；TASK-058「17/17」应为 18/18 |
| C-7 | 迁移链描述 | 08 §8.7「010 → 011 → 012 → {027, 028}」，而 §8.5 中 027、028 只依赖 011（无 012 边） |
| C-8 | 049 的启动前提 | 00_深度分析.md:71「S0 不阻塞 049 盘点」与 task-index TASK-049 依赖 006（S0 末端，L5）冲突 |
| C-9 | opus 用途清单过时 | 10_档位与成本预算.md:10 只列 001/014/026/047/027/048/011/015/018/023/029/034/045/053/040/043（16 张），缺 056/058/060/064/067/068/070/071 |
| C-10 | 基线 commit 引用不一 | 03a:5、task-index.md:3 写 main@bfb3aef（V0.3.0 文档提交）；11_基线指标.md:20、15_前提与局限.md:6 写 main@59e83dd（V0.1.0 提交）；实际 V0.4.0 位于 cd5b1a9（git log） |
| C-11 | 状态与证据标签语义混用 | REQ-F-023、REQ-F-048 状态为「待澄清」、标签却是「已确认」；REQ-L-009 状态「未实现」，但 03a 已产出（实为部分实现） |
| C-12 | 「规划缺口 0 条」不成立 | 03a:24 称机械校验 0 缺口，但遗漏需求（§1.2，如 REQ-F-053 上线前审核、REQ-F-059/REQ-L-013 测评示例）没有任何卡；03a 校验只覆盖已登记的 99 条，不能证明需求已穷尽 |
| C-13 | REQ-M 来源不可回溯 | 03a:113-128 来源列为「instruction_v3 补充1/补充2」；01_规划快照.md:19 指向的文件在工作区不存在，仓库内也没有副本 |

---

## 6. 建议的 V0.5.0 修正清单

ID｜修正内容｜依据
---|---|---
FIX-01｜REQ-F-010 改判为「部分实现」；新增任务卡：详情页基准弹窗 + 历史测评示例（UI→Hark，API→外部）｜`app/(site)/models/[slug]/page.tsx:374`、:342-357；需求文档.md:44-46,180；台账 #67（未完成事项目录.md:221）
FIX-02｜REQ-M-006 改判为「部分实现」；TASK-066 改为扩展或替换 `/api/v1/models/[id]/stations`，TASK-067 改为改造既有「提供商与折扣价」区块，不再另起区块｜`app/api/v1/models/[id]/stations/route.ts:1-37`；`page.tsx:246-290`
FIX-03｜RTM 新增 REQ-F-053（上线前 seed 人工审核）并立发布门禁卡（挂 S8，条件 U-3）｜需求文档.md:69；`seed.ts:531`
FIX-04｜RTM 新增 REQ-F-054 字段所有权矩阵（MUST），立只读核验卡（外部 / sonnect）｜功能设计文档.md:233-281
FIX-05｜RTM 新增 REQ-F-055 model_change_logs 全写入面，并立核验卡｜需求文档.md:66；功能设计文档.md:279；`lib/features/admin/model-change-log.ts`
FIX-06｜RTM 新增 REQ-F-056 OIDC 安全红线（PKCE S256-only / refresh 重放撤链 / host-only Cookie），补回归守卫测试卡｜子平台SSO接入指南.md:55,89,141,215-229；`lib/features/auth/repository.ts:59,67`
FIX-07｜RTM 补登 REQ-F-057 邮箱验证码登录（已实现）｜登录方案.md:16；`app/api/v1/auth/email/{code,verify}`
FIX-08｜RTM 新增 REQ-F-058「全部」全选/全不选（部分实现）并立 UI 卡（Hark）｜需求文档.md:179；`LadderFilterBar.tsx:5,152`
FIX-09｜RTM 新增 REQ-F-060 缓存命中计费，并与 S4 计价归一合并立卡（资金路径→Hark/opus）｜功能设计文档.md:322-324；`gateway/service.ts:681-704`
FIX-10｜RTM 新增 REQ-F-061 prices/batch-upsert + requestId 幂等（部分实现）｜功能设计文档.md:209-211；`app/api/v1/admin/prices/` 无 batch
FIX-11｜REQ-F-033 细化为四段可验证表述（等级固定序 / 默认映射 / free 不可配）；REQ-F-038 补入「随采集同步展示价」｜需求文档.md:90-92,105
FIX-12｜RTM 新增 REQ-L-014（台账 #19）、REQ-NF-012（天梯页无页脚），先标证据不足并立核验｜未完成事项目录.md:46；需求文档.md:41
FIX-13｜15_前提与局限.md:23 撤销「设计文档不入 RTM」的豁免，改为对设计文档中的 MUST/必须语句强制入表｜§1.2 中有 7 条遗漏来自设计/模块文档
FIX-14｜REQ-NF-004 证据更正为「已有 backup.sh/restore.sh，缺逐表行数比对与演练记录」；TASK-042 改为在既有脚本上扩展｜`scripts/db/restore.sh:56-59`
FIX-15｜REQ-F-026 记录缺陷：价格页充值档位硬编码，与 shared RECHARGE_TIERS 重复｜`pricing/page.tsx:31`；`billing.constants.ts:43-47`
FIX-16｜TASK-058 验收改为「空库 migrate deploy 18/18」｜`ls prisma/migrations` 共 16 个 + M-001 + M-002
FIX-17｜TASK-045 允许路径删除不存在的 `ProductIntroEditor.tsx`，改为 `components/admin/ProductsManager.tsx`（已列）或明确新建｜`ls components/admin`
FIX-18｜TASK-028 目标中的契约名「admin.models.*」改为 prices.promotions 对应契约｜TASK-028.md:16
FIX-19｜TASK-049 去掉对 006 的依赖（只需 DATABASE_URL）；grep 验收改为「文件存在且 grep exit=1」；行数口径改为按三维分组计数｜00_深度分析.md:71；沙箱实测 grep exit=2 且无输出
FIX-20｜TASK-055 与 TASK-047 顺序调换（契约 registry 先、seed 后），或在 055 验收中加「键存在于 ADMIN_CONFIG_REGISTRY」｜`admin-config-seed-parity.spec.ts` 头注释（只校验 registry→seed 方向）
FIX-21｜UI 卡（018/023/045/064/067）补可被 vitest 收集的测试位置，或明确只用 e2e 验收；当前 include 只有 lib/**｜`vitest.config.ts:13`
FIX-22｜执行者调整：006→Hark（或升 opus）、028→升 opus（或改 Hark）、051→Hark、057→Hark 或并入 040、066→先由 Hark 出设计、041 档位 haiku→sonnect、070→外部 / sonnect｜§4；10_档位与成本预算.md:10
FIX-23｜修正 08 §8.7 文档链顺序（与 §8.6 边一致）、迁移链（027/028 依赖 011）、§8.8「仅 M-001」｜08_依赖DAG.md §8.5–8.8
FIX-24｜统一计数：15/14/00 中的 83→99、11:60 中的 16→24、06:25 与 00:71 中的 51/24→69/35、10.1 opus 清单补齐｜§5 C-2/C-3/C-4/C-9
FIX-25｜03a 表格单元格内的 `\|` 转义（F-001、L-008），并让生成器对列数做断言｜03a:30,108
FIX-26｜基线 commit 统一记为 main@cd5b1a9（业务树 77c7952）｜git log；03a:5、11:20、15:6
FIX-27｜REQ-M 来源原文入库（docs/plans 或 inbox），或改注为可回溯的来源｜01_规划快照.md:19 指向的文件不存在
FIX-28｜纠正《项目需求更新分析》:257 关于 weight 字段存在的过时陈述（随 TASK-040/041 处理）｜schema grep isWeighted/scorePercentile 为 0

---

## 7. 局限
- 沙箱没有 PG/Redis，没有运行 e2e、migrate 或运行态布局，涉及运行态的条目（NF-007、F-004 布局、NF-012 页脚）标为证据不足。
- REQ-F-054/055/056 只确认了实现迹象，没有逐路由穷举。
- 第 3 节的 TASK-018/023/045/064 tsc、lint、build 没有完整运行（耗时长，且这些卡尚未实施）。

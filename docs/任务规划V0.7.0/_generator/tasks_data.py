# > 版本: v0.4 | 更新: 2026-10-14 | 变更: V0.4.0 任务数据单一源——继承 V0.2.0/V0.3.0 55 卡（代码无 delta，逐卡沿用）+ 模型源监控体系新卡 056–075 + 执行者/条件卡口径
# -*- coding: utf-8 -*-
# 渲染：python3 gen.py（生成任务卡/索引/DAG/所有权/成本/阶段/追溯矩阵，并做机械校验）
import copy, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import base_v010 as B

P = "docs/任务规划V0.7.0"
P1 = "docs/任务规划V0.1.0"
HDR = "> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）"

OWNERS = copy.deepcopy(B.OWNERS)
OWNERS["Agent-Docs"]["except"] = [P1 + "/", "docs/任务规划V0.2.0/", "docs/任务规划V0.3.0/", "docs/任务规划V0.4.0/", P + "/"]
OWNERS["Agent-API"]["own"].append("apps/web/lib/monitoring/")

COMMON_FORBID = [
    ".example/history/**（铁律4 历史只读）",
    f"{P}/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）",
    "docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）",
    "AGENTS.md",
]

def _swap(v):
    if isinstance(v, str):
        return v.replace(P1, P)
    if isinstance(v, list):
        return [_swap(x) for x in v]
    return v

T = []
for t in B.T:
    t2 = {k: _swap(v) for k, v in copy.deepcopy(t).items()}
    t2.setdefault("cond", None)
    t2["v2"] = "沿用（V0.2.0 已对 main@59e83dd 复核前提仍成立）"
    T.append(t2)

def get(i):
    return next(t for t in T if t["id"] == i)

def patch(i, **kw):
    t = get(i)
    t.update(kw)

def insert_after(after_id, **kw):
    kw.setdefault("cond", None)
    idx = next(n for n, t in enumerate(T) if t["id"] == after_id)
    T.insert(idx + 1, kw)

# ------------------------------------------------------------------ 复核结论：逐卡差异
patch("001", v2="沿用（复核：旧表 packages/shared/src/types/index.ts:72-89 仍在且全仓 0 引用；web 22 码未变；selfcheck mism=0）")
patch("003", v2="沿用（复核：/system/health 无 DB 时实测仍 200，route.ts:11-14 不探依赖）")
patch("006", v2="沿用 + 证据升级：规划期以 PGlite(PG16.4 WASM) 空库重放 16/16 迁移成功、68 张表（EVD-BASELINE-V2/pglite-replay.txt），CI 真 PG16 复验仍必需")

patch("007",
      name="守卫脚本：根目录污染 / 密钥扫描 / 模块边界 / 端口区间一致性（零新依赖）",
      req="§9.4 自动化守卫 / REQ-C-02 端口（Aidean 3000–3100，用户 2026-10-14 口径；子平台区间以 P-1/P-2 裁决为准）",
      steps=["root-pollution：根目录文件白名单 = 当前 git ls-files 根级文件集合，新增根级文件即失败",
             "secret-scan：git ls-files 全量扫描私钥头/AKIA/sk-[A-Za-z0-9]{20,}/password= 明文模式，.env.example 豁免",
             "module-boundary：packages/** 不得 import apps/**；apps/web/components/** 不得 import @prisma/client 或 lib/db/**",
             "port-consistency：Aidean 自身入口（apps/web/package.json dev/start、playwright baseURL、Dockerfile EXPOSE/PORT、auth/constants.ts AUTH_ISSUER 默认值）全部 ∈ 3000–3100；seed.ts OIDC localhost 回调端口逐一必须落在 scripts/guard/port-ranges.json 登记区间内——区间表初值只登记已确认项（Aidean 3000–3100、BotHot 3200–3300、AideanFleet 3100–3200），P-1/P-2 未裁决项输出 WARN 不失败"],
      accept=["四脚本在当前 HEAD 全部 exit 0（端口项允许 WARN，WARN 清单写入证据）", "人为加入根级文件/私钥样本/3500 端口回调时对应脚本 exit 1（负向测试证据）", "CI verify job 含 guard 步骤"],
      deps=[],
      v2="修订：删除 V0.1.0 的「seed 必须含 3333 且不得含 3200」断言与对 TASK-008 的依赖——该前提被推翻（3200 = BotHot 前端宿主端口，见 02_事实基线 §2.6）；端口区间改为数据表驱动")

patch("008",
      name="OIDC 种子 wechat-rag 回调白名单按端口裁决对齐（保留 BotHot 3200；AideanBot 3333 按 P-2 补录）",
      req="REQ-C-02 端口 / P-2（AideanBot 是否仍需 3333 回调）",
      goal="seed.ts wechat-rag.redirectUris 与 P-2 裁决一致：方案A（AideanBot 仍在用）= [wechat-rag.aidean.local, localhost:3200, localhost:3333]；方案B（AideanBot 已由 BotHot 取代）= 保持现状 [wechat-rag.aidean.local, localhost:3200]，sso-3333 e2e 的去留另行立卡（Agent-Guard 所有，本卡不改 e2e）",
      docs=["docs/product/modules/子平台规范说明.md §5.0 端口区间", "BotHot AGENTS.md 端口表（3200 前端宿主，外部仓 aideanew/BotHot@13acacc）"],
      pre_state="P-2 已由用户裁决",
      steps=["方案A：seed.ts:354 redirectUris 追加 'http://localhost:3333/auth/aidean/callback'（不删 3200）", "本地 db:seed 两次（upsert 幂等），运行 node apps/web/scripts/check-oidc.mjs", "方案B：不改代码，证据目录写入裁决原文"],
      accept=["方案A：`grep -c \"localhost:3200/auth/aidean/callback\\|localhost:3333/auth/aidean/callback\" apps/web/prisma/seed.ts` 两个回调均命中；check-oidc has3333=true", "方案B：git diff 为空且证据含裁决记录", "TASK-007 端口守卫对 seed 回调无 ERROR"],
      verify="grep -n \"auth/aidean/callback\" apps/web/prisma/seed.ts && node scripts/guard/port-consistency.mjs",
      block_cond="P-2 未裁决 → 不执行（条件卡）", cond="P-2",
      v2="需要返工：V0.1.0 要求「3200→3333 替换」会删除 BotHot 回调（BotHot AGENTS.md：3200=BotHot 前端宿主；BotHot ci.yml:287「主平台 OIDC 白名单已登记 bothot redirect_uri」；BotHot 复用 wechat-rag client）。改为「保留 3200 + 按裁决补 3333」")

patch("010",
      name="固化复现：PG16 集成测试证明二次写价违反唯一索引（规划期已在 PGlite PG16.4 复现 23505）",
      goal="新增集成测试在真实 PG16 上断言：现行 persistPrices 第二次写价抛 P2002（SQLSTATE 23505），作为 TASK-011/012 的红灯测试",
      steps=["以 EVD-BASELINE-V2/repro.mjs 的 SQL 序列为蓝本改写为 vitest 集成测试（Prisma 客户端，DATABASE_URL 门控）", "断言：第 1 次成功、第 2/3 次 P2002；同批 2 条 is_current=true 亦 P2002", "无 DATABASE_URL 时 describe.skip，不影响 1081 基线"],
      accept=["CI PG16 上该 spec 在 TASK-011 之前为红（预期失败已用 it.fails 标注）且错误码=P2002", "无 DATABASE_URL 时 spec 自动 skip，`pnpm --filter web test` 仍 1081 通过"],
      block_cond="真 PG16 上未复现（与 PGlite 结论矛盾）→ 停止，升 opus 复核 PGlite 差异", 
      v2="修订：缺陷由「部分确认」升级为「已确认」（PGlite PG16.4 + 16 条真实迁移 + 1:1 SQL：第 2 次写价 23505，EVD-BASELINE-V2/pglite-repro-p2002.txt）；本卡由「复现或证伪」改为「固化为回归测试」")
patch("011", v2="沿用 + 证据升级：M-001 草案已在 PGlite 验证——三次写价全部成功、current 恰 1 条、OFFICIAL current + PROMOTION(is_current=false) 可并存（EVD-BASELINE-V2/pglite-verify-m001.txt）")
patch("012", v2="沿用（复核强化：M-001 后同批 2 条 is_current=true 仍会 23505——本卡「仅最新一条 current」为必需而非可选）")
patch("015", v2="沿用（复核：grep featureFlag|feature_flags 在 apps/web/{app,lib,components,stores,hooks,middleware.ts} 0 命中）")
patch("016", v2="沿用（复核：app/api/v1/admin/ 36 个域目录中无 feature-flags；需求文档 §3.10「功能开关 ✅GET/✅PATCH」为文档错误）")
patch("022", v2="沿用（复核：Favorite 模型在 schema 中，运行时 grep -i favorite 0 命中）")
patch("027", v2="沿用（复核：gateway/repository.ts:89,109 仍只取 isCurrent=true；PROMOTION 仅枚举/注释）；注意：币种/计价单位归一另由 TASK-048 在同一解析器内完成（资源锁串行）")
patch("034", v2="沿用（复核：components/site/* 无搜索组件；条件卡 U-5）", cond="U-5")
for i in ("032", "033", "035", "036"):
    patch(i, cond="U-5")
for i in ("043",):
    patch(i, cond="U-3")
for i in ("044", "045", "046"):
    patch(i, cond="U-4")
patch("037", v2="沿用（复核：两配置 --list 仍为 138/26 与 64/14）；若 P-2=方案B，sso-3333.spec.ts 的 skip 处理须另立 Guard 卡，本卡禁止改 spec")
patch("040",
      goal="需求文档 v1.15：§3.5 JWT 有效期、§3.9/§3.10 功能开关实装口径（后台域表中「功能开关 ✅GET/PATCH」改为实测）、§3.11 导航、§六 MVP（微信扫码/在线支付暂停）、§3.2 计价展示口径（¥/M 与汇率，按 U-15）与代码/裁决一致，并在文末链接统一追溯矩阵",
      v2="修订：新增 §3.2 汇率口径（U-15）与 §3.10 功能开关域表错误两条修订点；文末链接 RTM（TASK-051）")
patch("041", v2="沿用（复核：台账仍 155,968 字节；另发现台账内部状态矛盾 #17/#36——交 TASK-051 消解）")
patch("042", cond="U-3", v2="沿用（条件：生产数据策略属发布事务，随 U-3）")

# ------------------------------------------------------------------ 新卡
insert_after("007", id="050", slice="S0", name="CI 门禁补齐：lint + @aidean/ui 单测进入 verify job",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="CI 配置追加两个既有命令，确定性",
     req="REQ-NF-03 测试可复现 / §9.4 守卫（ci.yml 现无 lint 与 packages/ui 测试步骤）", sol="SOL-S0",
     goal="CI verify job 新增 `pnpm --filter web lint`（0 error）与 `pnpm --filter @aidean/ui exec vitest run`（4 例）两步，任一失败阻断合并",
     docs=[".github/workflows/ci.yml:47-69", "11_基线指标.md §11.2（lint 0 error/1 warning、ui 4 例）"], contracts=["无（CI 配置）"],
     pre_state="TASK-006/007 已合并（同文件资源锁）",
     outputs=[".github/workflows/ci.yml"],
     steps=["在 Typecheck(web) 之后插入 Lint(web) 步骤", "在 Unit tests(shared) 之后插入 Unit tests(ui) 步骤", "本地按 CI 顺序复跑两命令"],
     accept=["CI verify job 日志含 Lint(web) 与 Unit tests(ui) 两步且均成功", "lint 输出 0 error（既有 1 warning SafeImage.tsx:19 允许）", "@aidean/ui 4 tests passed"],
     verify="pnpm --filter web lint && pnpm --filter @aidean/ui exec vitest run",
     allow=[".github/workflows/ci.yml"], forbid=["apps/**", "packages/**"], deps=["007"],
     block_cond="lint 在 CI Node 20 下出现本地无的 error → 不改业务代码，登记并上报", escalate="2 次失败 → 升 opus", size="小", hours=2,
     v2="新增：V0.2.0 复核发现 ci.yml 无 lint/ui 测试步骤（V0.1.0 未登记）")

insert_after("026", id="055", slice="S4", name="种子：系统配置新增 pricing.fxUsdCny 默认行（值取 U-15 裁决）",
     owner="Agent-Data", assignee="外部Agent", tier="haiku", tier_reason="seed 单行数据追加",
     req="REQ-F-011 计价口径归一（汇率默认值）", sol="ADR-P005",
     goal="apps/web/prisma/seed.ts systemConfigsData 追加 {configKey:'pricing.fxUsdCny', configGroup:'pricing', configValue:<U-15 裁决值>}，db:seed 幂等复跑后该行存在",
     docs=["03_solution/decisions/ADR-P005-计价口径归一.md", "apps/web/lib/features/auth/__tests__/admin-config-seed-parity.spec.ts（registry⊆seed 守卫）"],
     contracts=["PRICE_NORMALIZATION.FX_CONFIG_KEY"],
     pre_state="U-15 已裁决（给出汇率数值）",
     outputs=["apps/web/prisma/seed.ts"],
     steps=["在 systemConfigsData 追加一行（configType 与 047 的 registry 条目一致：STRING，值为十进制字符串）", "本地 db:seed 两次", "运行 parity 守卫"],
     accept=["`grep -n \"pricing.fxUsdCny\" apps/web/prisma/seed.ts` 恰 1 行", "`pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-config-seed-parity.spec.ts` 通过"],
     verify="pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-config-seed-parity.spec.ts",
     allow=["apps/web/prisma/seed.ts"], forbid=["apps/web/prisma/schema.prisma", "apps/web/prisma/migrations/**", "packages/**"], deps=["026"],
     block_cond="U-15 未裁决 → 不执行（条件卡）", escalate="无", size="小", hours=1, cond="U-15",
     v2="新增：配置键四处同步约束（shared registry / admin configs PUT 白名单 / seed / parity 守卫，见 auth/constants.ts:27,101）要求 seed 先于 registry 落地")

insert_after("055", id="047", slice="S4", name="计价口径归一契约：币种 CNY + 每百万 Token + 汇率配置键（EffectivePrice 扩展）",
     owner="Agent-Contract", assignee="Hark(主Agent)", tier="opus", tier_reason="资金路径契约语义（币种/单位），不可逆度高",
     req="REQ-F-02b 价格统一 ¥/M Tokens 与 ¥5=$1 换算（需求文档 §3.2）/ REQ-C-03 价格透明", sol="ADR-P005 / DESIGN-003",
     goal="packages/shared/src/schemas/promotion.schema.ts 的 EffectivePriceSchema 增加 currency='CNY'、unit='per_million_tokens'、sourceCurrency、sourceUnit、fxRate 字段，并导出 PRICE_NORMALIZATION 常量与 normalizeUnitPrice 纯函数；shared 单测覆盖 CNY/USD × per_1k/per_million 四象限",
     docs=["contracts/01-api.contract.ts §S4 PRICE_NORMALIZATION", "03_solution/decisions/ADR-P005-计价口径归一.md"],
     contracts=["EffectivePriceSchema（v0.2 扩展）", "PRICE_NORMALIZATION", "normalizeUnitPrice"],
     pre_state="TASK-026、TASK-055 已合并；U-15（汇率口径）已裁决",
     outputs=["packages/shared/src/schemas/promotion.schema.ts", "packages/shared/src/utils/price-normalization.ts（新建）", "packages/shared/src/constants/admin-config.constants.ts（registry 增 pricing.fxUsdCny）", "packages/shared/src/utils/pricing-config.ts（PRICING_CONFIG_KEYS 增 fxUsdCny）", "packages/shared/src/index.ts", "packages/shared/src/__tests__/price-normalization.spec.ts（新建）"],
     steps=["按冻结稿落地 PRICE_NORMALIZATION（目标币种 CNY、目标单位 per_million_tokens、配置键 pricing.fxUsdCny）", "normalizeUnitPrice(value, currency, unit, fx)：per_1k×1000；USD×fx；未知币种抛错（调用方 fail-closed）", "EffectivePriceSchema 扩展字段", "ADMIN_CONFIG_REGISTRY 增 pricing.fxUsdCny（valueRule >0，defaultValue = TASK-055 种子值），使后台 PUT /api/v1/admin/configs 白名单可写", "单测四象限 + 未知币种 + fx<=0 拒绝"],
     accept=["`pnpm --filter @aidean/shared test` 全绿且新增 ≥6 例", "`pnpm --filter @aidean/shared exec tsc --noEmit` 0", "price-normalization.ts 无硬编码汇率数值（汇率只来自参数）", "`pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-config-seed-parity.spec.ts` 通过（registry 与 seed 一致）"],
     verify="pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test",
     allow=["packages/shared/src/schemas/promotion.schema.ts", "packages/shared/src/utils/price-normalization.ts", "packages/shared/src/constants/admin-config.constants.ts", "packages/shared/src/utils/pricing-config.ts", "packages/shared/src/index.ts", "packages/shared/src/__tests__/price-normalization.spec.ts"],
     forbid=["apps/**", "packages/shared/src/utils/billing.ts（calcCharge 不动）"], deps=["026", "055"],
     block_cond="U-15 未裁决 → 不执行（条件卡）；需要改 calcCharge 的签名或精度 → 停止，升 fable", escalate="与 provider-pricing.ts 既有展示口径冲突 → 升 opus 仲裁", size="中", hours=4, cond="U-15",
     v2="新增：V0.2.0 发现网关扣费忽略 billingCurrency/billingUnit（gateway/service.ts:681-704、990-1003 直接以 priceInput 作 ¥/M），seed 82 条价格中 48 条 USD")

insert_after("027", id="048", slice="S4", name="生效价解析器接入币种/单位归一（网关扣费与读侧同口径）",
     owner="Agent-API", assignee="Hark(主Agent)", tier="opus", tier_reason="资金路径：改变实际扣费金额",
     req="REQ-F-02b / REQ-F-07 计费公式", sol="ADR-P005 / DESIGN-003",
     goal="resolveEffectivePrice 返回的 priceInput/priceOutput 一律为 CNY/百万 Token（USD 行按 pricing.fxUsdCny 换算、per_1k 行 ×1000），网关 PLATFORM 预扣与结算、/api/v1/models/[id]、pricing 读侧全部消费归一后的价格；无法归一的价格行使该候选被跳过（降级链继续）",
     docs=["03_solution/design/DESIGN-003-生效价解析器.md", "docs/architecture/网关计费时序契约.md"],
     contracts=["EffectivePriceSchema（v0.2）", "PRICE_NORMALIZATION"],
     pre_state="TASK-027、TASK-047 已合并；U-15 已裁决；TASK-049 盘点结果已入证据（存量 USD/per_1k 行数），且人工抽样确认 USD 行为美元原价（ADR-P005 反证排除）",
     outputs=["apps/web/lib/features/pricing/effective-price.ts", "apps/web/lib/features/pricing/__tests__/effective-price-normalization.spec.ts"],
     steps=["解析器读取 billingCurrency/billingUnit 并调用 normalizeUnitPrice", "汇率读 SystemConfig pricing.fxUsdCny（经 shared PRICING_CONFIG_KEYS；缺失 → 视为不可归一，候选跳过并记 warn 日志）", "单测：USD per_million / CNY per_1k / 未知币种 / 汇率缺失 四路径 + 网关预扣金额断言", "回归 gateway 全部 __tests__"],
     accept=["新增单测 ≥8 例全绿", "`pnpm --filter web exec vitest run lib/features/gateway lib/features/pricing` 全绿", "USD 1.00/M、fx=F 时扣费基准 = F 元/M（表驱动断言）"],
     verify="pnpm --filter web exec vitest run lib/features/pricing lib/features/gateway && pnpm --filter web exec tsc --noEmit",
     allow=["apps/web/lib/features/pricing/**"], forbid=["packages/shared/**", "apps/web/lib/features/billing/**", "apps/web/prisma/**", "apps/web/lib/features/gateway/service.ts"],
     deps=["047", "027"], block_cond="U-15 未裁决 → 不执行（条件卡）；需改 gateway/service.ts → 停止回报", escalate="资金回归任一失败 → 立即回滚并重写任务书", size="中", hours=8, cond="U-15",
     v2="新增：修复 V0.2.0 新发现的计价口径缺陷 D-NEW-1")

insert_after("028", id="049", slice="S4", name="存量价格行口径盘点脚本（只读：币种×计价单位×来源）",
     owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="只读统计脚本",
     req="REQ-F-02b（为 U-15 裁决提供数据）", sol="ADR-P005",
     goal="`node scripts/audit/price-normalization-audit.mjs` 对任意库输出 model_prices 中 is_current=true 行按 billing_currency × billing_unit × source_type 的计数表与 5 条样例，退出码恒 0",
     docs=["03_solution/decisions/ADR-P005-计价口径归一.md"], contracts=["无（只读盘点）"],
     pre_state="TASK-006 已合并（CI 有 seed 后的 PG16）",
     outputs=["scripts/audit/price-normalization-audit.mjs（新建）"],
     steps=["用 @prisma/client 只读查询（无写语句；脚本内 grep 自检无 create/update/delete）", "输出 markdown 表到 stdout", "在 CI seed 后库运行一次并存证"],
     accept=["seed 后库输出含 USD 与 CNY 两行，合计 = is_current 行总数", "`grep -nE \"\\.(create|update|delete|upsert)\" scripts/audit/price-normalization-audit.mjs` 无输出"],
     verify="node scripts/audit/price-normalization-audit.mjs",
     allow=["scripts/audit/**"], forbid=["apps/**", "packages/**"], deps=["006"],
     block_cond="无 DATABASE_URL → 打印用法后 exit 0 并在证据注明", escalate="无", size="小", hours=3,
     v2="新增：为 U-15/TASK-048 提供存量数据证据（规划期静态统计 seed：82 条中 USD 48、CNY 34）")

insert_after("029", id="053", slice="S4", name="UI：价格页/详情页统一 ¥/M 展示（附原币原价注记）",
     owner="Agent-App", assignee="Hark(主Agent)", tier="opus", tier_reason="全部 UI 设计实现由主 Agent 负责；展示口径直接面向用户",
     req="REQ-F-02b / REQ-C-03 价格透明（展示价与官方一致：原币原价须可见）", sol="DESIGN-003",
     goal="/pricing 网关单价表与 /models/[slug] 参数表的价格列统一显示「¥x.xx / M Tokens」，USD 官方价以次级文字「官方 $y / M」并列（不隐藏原价）；三套浅色主题对比度 ≥4.5:1",
     docs=["contracts/06-ux-states.contract.ts PRICING_TABLE", "docs/product/design/UI设计文档.md"],
     contracts=["EffectivePriceSchema（v0.2）", "UX_STATES.pricingTable"],
     pre_state="TASK-048、TASK-029 已合并（同页资源锁）",
     outputs=["apps/web/app/(site)/pricing/page.tsx", "apps/web/app/(site)/models/[slug]/page.tsx"],
     steps=["价格单元格改读 EffectivePrice.priceInput/priceOutput（已归一）", "sourceCurrency≠CNY 时追加原币注记", "空态/错误态沿用契约⑥", "三主题截图存证"],
     accept=["`pnpm --filter web exec tsc --noEmit` 0 且 `pnpm --filter web lint` 0 error", "页面无 `$` 作为主价格符号（e2e/人工：主列均为 ¥）", "原币注记对 USD 行可见（人工截图）"],
     verify="pnpm --filter web exec tsc --noEmit && pnpm --filter web lint",
     allow=["apps/web/app/(site)/pricing/**", "apps/web/app/(site)/models/[slug]/**"], forbid=["apps/web/lib/**", "packages/**"],
     deps=["048", "029"], block_cond="U-15 未裁决 → 不执行（条件卡）", escalate="设计与「展示价=官方价」约束冲突 → 升 opus 并回报用户", size="中", hours=6, cond="U-15",
     v2="新增：需求 §3.2「统一 ￥/M Tokens」与现 /pricing 以 $ 显示 USD 行（pricing/page.tsx:6,80-83）不一致")

insert_after("031", id="054", slice="S4", name="S4b 文档同步：计价口径归一（网关计费时序契约 + API 文档 + 术语表）",
     owner="Agent-Docs", assignee="外部Agent", tier="haiku", tier_reason="文档登记",
     req="REQ-F-02b / 铁律2 双向锚", sol="ADR-P005",
     goal="《网关计费时序契约》补「生效价归一」一节、《API接口文档》EffectivePrice 字段表补 currency/unit/fx、术语表新增「计价口径归一」，三处双向锚，升版本头",
     docs=["03_solution/decisions/ADR-P005-计价口径归一.md"], contracts=["EffectivePriceSchema（v0.2）"],
     pre_state="TASK-053 已合并",
     outputs=["docs/architecture/网关计费时序契约.md", "docs/architecture/API接口文档.md", "docs/governance/术语表.md"],
     steps=["补节与锚", "版本头", "门禁"],
     accept=["check-docs-rule exit 0", "check-docs-facts 全 PASS", "三文档出现「计价口径归一」锚且互链可达"],
     verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
     allow=["docs/architecture/网关计费时序契约.md", "docs/architecture/API接口文档.md", "docs/governance/术语表.md"], forbid=["apps/**", "packages/**", f"{P}/**"],
     deps=["053", "031"], block_cond="无", escalate="无", size="小", hours=2, cond="U-15",
     v2="新增：S4b 文档闭环")

insert_after("041", id="051", slice="S7", name="统一需求追溯矩阵入库 + 台账内部状态矛盾消解（#17/#36）",
     owner="Agent-Docs", assignee="外部Agent", tier="sonnect", tier_reason="按本规划 RTM 机械入库 + 两处状态对账",
     req="本次需求「建立统一规划体系」/ AGENTS 铁律1 单一事实来源", sol="ADR-P004 / 本规划 03a",
     goal="docs/product/requirements/需求追溯矩阵.md 成为需求→状态→任务的唯一追溯表（内容取自本规划 03a，逐行带证据路径），需求文档/台账/待执行大纲改为链接它；台账 #17（L44 🟡 vs §7.12 R-83 ✅）与 #36（L113 🟡 vs L295 ✅）各保留一个现行状态",
     docs=[f"{P}/03a_统一需求追溯矩阵.md", "docs/plans/未完成事项目录.md L44/L113/L295"], contracts=["无（文档）"],
     pre_state="TASK-041 已合并（台账拆分后路径）；TASK-040 已合并",
     outputs=["docs/product/requirements/需求追溯矩阵.md（新建）", "docs/plans/**（链接与状态对账）", "docs/文档索引.md", "scripts/check-docs-facts.mjs（新增 RTM 行数断言）"],
     steps=["复制 RTM 表并把「本规划任务号」列改为相对链接", "台账 #17/#36 状态对账（以 §7.12 收口回执与代码为准）", "check-docs-facts 增断言：RTM 中「未实现/部分」行均有任务号或「暂不执行」理由", "文档索引登记"],
     accept=["check-docs-rule exit 0", "check-docs-facts 全 PASS（含新断言）", "`grep -c \"^| REQ-\" docs/product/requirements/需求追溯矩阵.md` = 本规划 RTM 行数"],
     verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
     allow=["docs/product/requirements/需求追溯矩阵.md", "docs/plans/**", "docs/文档索引.md", "scripts/check-docs-facts.mjs"], forbid=["apps/**", "packages/**", f"{P}/**", ".example/**"],
     deps=["041"], block_cond="RTM 与 TASK-040 后的需求文档条目数不一致 → 停止回报 Hark 对账", escalate="无", size="中", hours=3,
     v2="新增：本轮重点需求「建立统一规划体系」的落盘卡")

insert_after("042", id="052", slice="S8", name="RC-02 遗留文档闭环：发布环境契约 + 发布回滚与恢复验收",
     owner="Agent-Docs", assignee="外部Agent", tier="sonnect", tier_reason="以既有 RC-02 spec 与 TASK-042 演练证据成文",
     req="REQ-NF-02 可运维 / harden-rc02-standalone-address checklist C4/C5（未勾）", sol="SOL-S8",
     goal="docs/engineering/发布环境契约.md（env 五件套、NEXT_PUBLIC_SITE_URL 构建期注入、端口 3000）与 docs/engineering/发布回滚与恢复验收.md（引用 TASK-042 演练 diff=0 证据）成文并登记文档索引；RC-02 checklist 中代码侧已满足项按证据补勾",
     docs=["docs/specs/harden-rc02-standalone-address/spec.md", "apps/web/middleware.ts:65（RC-02 已落码）", "apps/web/app/oauth/authorize/route.ts:80-86"],
     contracts=["contracts/04-resources.contract.ts（公开基址规则）"],
     pre_state="TASK-042 已合并",
     outputs=["docs/engineering/发布环境契约.md（新建）", "docs/engineering/发布回滚与恢复验收.md（新建）", "docs/specs/harden-rc02-standalone-address/checklist.md", "docs/文档索引.md"],
     steps=["成文两份", "checklist A1 依代码证据补勾，B/C 段需运行态项保持未勾并注明", "文档索引登记"],
     accept=["check-docs-rule exit 0", "两文档带版本头且登记索引", "checklist 每个补勾项附证据路径"],
     verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
     allow=["docs/engineering/发布环境契约.md", "docs/engineering/发布回滚与恢复验收.md", "docs/specs/harden-rc02-standalone-address/checklist.md", "docs/文档索引.md"], forbid=["apps/**", "packages/**", f"{P}/**"],
     deps=["042"], block_cond="无", escalate="无", size="小", hours=4, cond="U-3",
     v2="新增：V0.2.0 核查 specs 未勾项发现 RC-02 文档交付物（C4/C5）从未成文")

# 条件标记汇总（gen.py 用于关键路径与批次排除）
COND_REASON = {"U-5": "顶栏搜索是否需要", "U-3": "生产部署资源", "U-4": "截图素材", "U-15": "汇率口径", "P-2": "AideanBot 3333 回调是否保留"}

SLICES = copy.deepcopy(B.SLICES)
SLICES["S0"] = ("步行骨架与契约守卫", "契约唯一源 + 就绪探针 + 鉴权写闭环 e2e + CI 真库重放 + 守卫脚本 + CI 补 lint/ui 测试", "P-2 仅影响条件卡 TASK-008")
SLICES["S1"] = ("价格历史唯一约束修复（数据完整性，已确认缺陷）", "同一模型多次采集不再 P2002；为限时优惠多行价格铺路", "无（缺陷已在 PGlite PG16.4 复现）")
SLICES["S4"] = ("生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2）", "后台建优惠 → 前台显示优惠价 → 网关按优惠价扣费；USD/per_1k 价格行按统一口径扣费与展示", "U-9（优惠是否叠加折扣）/ U-15（汇率口径，BLOCKING 局部：仅 048/053/054）")
SLICES["S7"] = ("文档治理收口 + 统一需求追溯矩阵", "需求文档 v1.15 + 台账拆分 + RTM 入库 + 台账状态矛盾消解", "U-1/U-2/U-11/U-15")
SLICES["S8"] = ("生产部署实弹（含 RC-02 文档闭环）", "备份恢复演练通过 → 生产 ready=200；发布环境契约成文", "U-3（BLOCKING）")

# ======================================================================
# V0.4.0：继承卡统一标注（业务代码自 77c7952 无 delta，见 18b_V0.4.0代码重核与监控需求映射.md §一）
# ======================================================================
for _t in T:
    _t["v2"] = "沿用（V0.4.0 重核：bfb3aef 业务树=77c7952，无代码 delta；V0.2.0 判定 = " + _t["v2"].split("（")[0].split("：")[0] + "）"

# ======================================================================
# V0.4.0 新增：模型源监控体系（REQ-M-001..016；需求输入 = 用户「当前我找到的」+ 补充1/补充2，经核验见 19_外部来源核验证据.md）
# ======================================================================
MD = "docs/任务规划V0.7.0/03_solution/design/DESIGN-004-模型源监控体系.md"
MC = "contracts/07-monitoring.contract.ts"
def mk(**kw):
    kw.setdefault("cond", None)
    kw.setdefault("sol", "DESIGN-004 / ADR-P007")
    kw.setdefault("forbid", [])
    kw["forbid"] = list(kw["forbid"]) + ["apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）" if kw.get("owner") != "Agent-Data" else "apps/web/prisma/migrations/2026092*、20261008*、20261010*、20261012*（既有迁移只读）"]
    kw.setdefault("v2", "新增（V0.4.0 模型源监控）")
    T.append(kw)

mk(id="056", slice="S10", name="监控契约落地：monitoring.schema.ts（源/快照/观测/变更事件/管理端 DTO）+ 2 个新错误码",
   owner="Agent-Contract", assignee="Hark(主Agent)", tier="opus", tier_reason="契约语义（源分级、证据口径、错误码）影响数据/API/UI 三端，不可逆度高",
   req="REQ-M-001/002/003/004/012", goal="packages/shared 导出 MonitoringSource*/CatalogSnapshot*/ProviderModelObservation*/CatalogChangeEvent*/AdminMonitoring* zod 与 MONITOR_SOURCE_NOT_FOUND=20004、MONITOR_SOURCE_CREDENTIAL_MISSING=50012；码值与既有 25 码无冲突（单测断言）",
   docs=[MD, MC, "contracts/02-errors.contract.ts"], contracts=["MonitoringSourceSchema", "SOURCE_TIERS", "CatalogChangeEventSchema", "MONITORING_ERROR_CODES", "MONITORING_UX_STATES"],
   pre_state="TASK-001 已合并（errors.ts 唯一源已存在）",
   outputs=["packages/shared/src/schemas/monitoring.schema.ts（新建）", "packages/shared/src/errors.ts（追加 2 码 + HTTP 映射 50012→503）", "packages/shared/src/index.ts", "packages/shared/src/__tests__/monitoring.spec.ts（新建）"],
   steps=["将 contracts/07-monitoring.contract.ts 中 zod 定义原样落入 monitoring.schema.ts（不得改字段名/枚举值）",
          "errors.ts 追加 MONITOR_SOURCE_NOT_FOUND:20004、MONITOR_SOURCE_CREDENTIAL_MISSING:50012 与 DEFAULT_STATUS_BY_CODE[20004]=404、[50012]=503、ERROR_PRESENTATION 两条",
          "index.ts 导出；monitoring.spec.ts 断言：SOURCE_TIERS=[S1,S2,A,B,C]、码值全局唯一、CatalogChangeEvent 判别联合 4 种 kind 可解析样例"],
   accept=["`pnpm --filter @aidean/shared exec tsc --noEmit` exit 0", "`pnpm --filter @aidean/shared test` 全绿（含 monitoring.spec.ts）", "`node -e` 读取 ERROR_CODES 值去重后数量 = 27", "contracts/selfcheck-monitoring.ts 输出 collisions=0"],
   verify="pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test",
   allow=["packages/shared/src/schemas/monitoring.schema.ts", "packages/shared/src/errors.ts", "packages/shared/src/index.ts", "packages/shared/src/__tests__/monitoring.spec.ts"],
   forbid=["apps/**"], deps=["001"], block_cond="冻结稿字段与 Prisma 草案（05 §5.6）不一致 → 停止，回报规划者", escalate="需改既有码值 → 升 fable", size="中", hours=4)

mk(id="057", slice="S10", name="文档：模型源监控设计入库 + 需求文档新增 §3.4.2「模型源监控」+ 文档索引登记",
   owner="Agent-Docs", assignee="外部Agent", tier="sonnect", tier_reason="按 DESIGN-004 与 RTM 机械成文，无新决策",
   req="REQ-M-001..016（需求登记）/ REQ-L 文档治理", goal="docs/architecture/模型源监控设计.md 与需求文档 §3.4.2 成文（MUST/SHOULD/COULD/MUST NOT 与 REQ-M 编号一致），check-docs-rule/facts 通过",
   docs=[MD, "docs/任务规划V0.7.0/03b_监控需求增量.md", "docs/architecture/AI市场发现与智能引擎设计文档.md"], contracts=["无（文档）"],
   pre_state="APPROVE 已给出；U-M1..M6 裁决结果（若已有）写入",
   outputs=["docs/architecture/模型源监控设计.md（新建，带版本头）", "docs/product/requirements/需求文档.md（新增 §3.4.2）", "docs/文档索引.md"],
   steps=["以 DESIGN-004 为底稿成文（引用而非复制 .example/history）", "需求文档 §3.4.2 写入 REQ-M 表与 MUST NOT 清单，版本头递增", "文档索引登记；若 check-docs-facts 断言 schema 模型数，等 TASK-058 合并后再同步数字"],
   accept=["`node scripts/check-docs-rule.mjs` exit 0", "`node scripts/check-docs-facts.mjs` exit 0", "需求文档 §3.4.2 含 REQ-M-001..016 全部编号（grep 计数=16）"],
   verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs && grep -c 'REQ-M-0' docs/product/requirements/需求文档.md",
   allow=["docs/architecture/模型源监控设计.md", "docs/product/requirements/需求文档.md", "docs/文档索引.md"],
   forbid=["apps/**", "packages/**"], deps=["056"], block_cond="无", escalate="无", size="中", hours=4)

mk(id="058", slice="S10", name="迁移 M-002：monitoring_sources / catalog_snapshots / provider_model_observations / catalog_change_events + 种子注册公开源 + 后台导航节点",
   owner="Agent-Data", assignee="Hark(主Agent)", tier="opus", tier_reason="新增 4 表 + 索引 + 种子，迁移不可逆且需串行（持有 M-002）",
   req="REQ-M-001/002/003/004/005", goal="新增迁移 20261015000000_model_source_monitoring（仅 CREATE，不改既有表）在空库重放与存量升级均成功；seed 注册 5 个公开源（openrouter/aihubmix/quanzil/huggingface/llmtest）",
   docs=[MD, "docs/任务规划V0.7.0/05_数据模型基线.md §5.6", "docs/任务规划V0.7.0/database/002_monitoring.sql"], contracts=["MonitoringSourceSchema", "CatalogSnapshotSchema", "ProviderModelObservationSchema", "CatalogChangeEventSchema"],
   pre_state="TASK-011（M-001）已合并；TASK-056 已合并",
   outputs=["apps/web/prisma/schema.prisma（追加 4 model + 2 enum）", "apps/web/prisma/migrations/20261015000000_model_source_monitoring/migration.sql（新建）", "apps/web/prisma/seed.ts（monitoringSourcesData 5 行，upsert by key）", "apps/web/lib/admin-nav-default-tree.ts（新增「模型源监控」节点 /admin/monitoring）"],
   steps=["按 database/002_monitoring.sql 写 Prisma model（字段/索引/唯一键逐一对应），`prisma migrate dev --create-only` 生成并人工比对 SQL",
          "seed：monitoringSourcesData（key, tier, kind, endpoint, authRequired, cadenceCron, tosStatus, enabled）5 行；tosStatus 初值取 U-M6 裁决（未裁决=pending，仅后台可见）；authRequired=true 的源默认 enabled=false",
          "admin-nav-default-tree.ts 增节点（权限码复用 admin:sync:read，避免新增权限码）",
          "PG16 空库：migrate deploy + db:seed 两次（幂等）"],
   accept=["`DATABASE_URL=... npx prisma validate` exit 0", "空库 `prisma migrate deploy` 17/17 成功（证据含输出）", "seed 两次后 monitoring_sources 恰 5 行", "既有 16 条迁移文件 `git diff --stat` 为空", "admin-navigation 相关单测全绿"],
   verify="cd apps/web && DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy && DATABASE_URL=$TEST_DATABASE_URL npx prisma db seed && pnpm --filter web exec vitest run lib/admin-nav",
   allow=["apps/web/prisma/schema.prisma", "apps/web/prisma/migrations/20261015000000_model_source_monitoring/", "apps/web/prisma/seed.ts", "apps/web/lib/admin-nav-default-tree.ts"],
   forbid=["apps/web/app/**", "packages/**"], deps=["011", "056"], block_cond="需要 ALTER 既有表 → 停止并提 ADR（本迁移只允许 CREATE）", escalate="空库重放失败 2 次 → 升 opus 复审 SQL", size="大", hours=8)

mk(id="059", slice="S10", name="仓储：目录快照与观测写入器（幂等、原始响应哈希、首次/末次出现）",
   owner="Agent-Data", assignee="外部Agent", tier="sonnect", tier_reason="CRUD + 幂等键，契约与表已冻结",
   req="REQ-M-003/004/005", goal="lib/sync/writers/catalog-snapshot.ts 提供 persistCatalogSnapshot(sourceKey, fetchedAt, items, rawSha256)：同源同 rawSha256 重复调用不产生新快照；观测按 (sourceKey, externalModelId) upsert，维护 firstSeenAt/lastSeenAt/isListed",
   docs=[MD], contracts=["CatalogSnapshotSchema", "ProviderModelObservationSchema"], pre_state="TASK-058 已合并",
   outputs=["apps/web/lib/sync/writers/catalog-snapshot.ts（新建）", "apps/web/lib/sync/writers/catalog-snapshot.spec.ts（新建，Prisma mock）"],
   steps=["实现 persistCatalogSnapshot：事务内 create snapshot（rawSha256 唯一冲突→返回既有）→ 批量 upsert observations → 将本次未出现的 isListed=true 观测置 false 并记 delistedAt", "原始响应体不入库，仅存 sha256 + 字节数 + 采样前 2KB（rawSample）", "单测覆盖：首采/重复/下架/重新上架 4 场景"],
   accept=["`pnpm --filter web exec vitest run lib/sync/writers/catalog-snapshot.spec.ts` 全绿（≥4 用例）", "`pnpm --filter web exec tsc --noEmit` exit 0", "重复调用断言 snapshot.create 仅 1 次"],
   verify="pnpm --filter web exec vitest run lib/sync/writers/catalog-snapshot.spec.ts && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/lib/sync/writers/catalog-snapshot.ts", "apps/web/lib/sync/writers/catalog-snapshot.spec.ts"],
   forbid=["apps/web/prisma/**", "apps/web/lib/sync/writers/index.ts"], deps=["058"], block_cond="需改 schema → 停止回报 Agent-Data 串行队列", escalate="无", size="中", hours=5)

mk(id="060", slice="S10", name="目录采集器框架 + 3 个公开源（OpenRouter /api/v1/models、AIHubMix /api/v1/models、Quanzil /api/pricing）",
   owner="Agent-API", assignee="Hark(主Agent)", tier="opus", tier_reason="跨源归一（价格单位/模型 ID 规范化）是监控体系核心，高难度",
   req="REQ-M-002/003/006/007", goal="lib/monitoring/catalog/ 下 CatalogCollector 接口 + 3 实现，各自把源响应归一为 ProviderModelObservation[]（价格统一为 USD/1M tokens 原币字段 + 原始字段保留），fixture 单测通过；不依赖任何 API Key",
   docs=[MD, "docs/任务规划V0.7.0/19_外部来源核验证据.md（实测字段）", "apps/web/lib/sync/adapters/openrouter.ts", "apps/web/lib/sync/adapters/quanzil.ts"],
   contracts=["ProviderModelObservationSchema", "MonitoringSourceSchema"], pre_state="TASK-056 已合并",
   outputs=["apps/web/lib/monitoring/catalog/types.ts", "apps/web/lib/monitoring/catalog/openrouter.ts", "apps/web/lib/monitoring/catalog/aihubmix.ts", "apps/web/lib/monitoring/catalog/quanzil.ts", "apps/web/lib/monitoring/catalog/registry.ts", "apps/web/lib/monitoring/catalog/__tests__/*.spec.ts + fixtures/*.json（截取 ≤20 条真实响应）"],
   steps=["复用 lib/security/url-policy safeFetch/readCappedJson（响应上限按源配置，OpenRouter 实测 ~773KB、AIHubMix ~892KB，设 4MB 上限）",
          "OpenRouter：pricing.prompt/completion 为 USD/token 字符串 → ×1e6；`?output_modalities=all` 拉全量（实测默认仅 text 462，all 667）",
          "Quanzil：复用既有 QuanzilAdapter 的 ratio→价格换算函数（抽出纯函数，不改 adapter 行为），vendors[] 查表",
          "AIHubMix：字段 model_id/model_name/developer_id → 观测；价格字段按实测 fixture 映射，缺失置 null 不猜",
          "registry.ts：key→collector，键集合须与 seed monitoringSourcesData 一致（单测断言）"],
   accept=["`pnpm --filter web exec vitest run lib/monitoring/catalog` 全绿", "每个 collector 对 fixture 产出的每条观测均通过 ProviderModelObservationSchema.parse", "OpenRouter fixture 中 openai/gpt-4 价格 prompt=30、completion=60（USD/1M）断言", "tsc exit 0"],
   verify="pnpm --filter web exec vitest run lib/monitoring/catalog && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/lib/monitoring/catalog/"], forbid=["apps/web/lib/sync/adapters/**（本卡只读复用）"],
   deps=["056"], block_cond="源响应形状与 fixture 不符且无法确定字段语义 → 该源置 kind=unsupported 并回报，不得猜测映射", escalate="价格单位歧义 → 升 opus 与 ADR-P005 对齐", size="大", hours=10)

mk(id="061", slice="S10", name="变更检测：快照 diff → catalog_change_events（新上架/下架/价格变动/新模型首次出现）+ 证据链",
   owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="纯函数 diff + 写事件，规则在 DESIGN-004 已冻结",
   req="REQ-M-004/005/008", goal="lib/monitoring/diff/ 对同源相邻两次快照产出 4 类事件（listed/delisted/price_changed/model_first_seen），每条事件携带 sourceKey、snapshotId、sourceUrl、before/after，价格变动阈值 ≥1% 才记",
   docs=[MD], contracts=["CatalogChangeEventSchema"], pre_state="TASK-059、TASK-060 已合并",
   outputs=["apps/web/lib/monitoring/diff/detect.ts", "apps/web/lib/monitoring/diff/persist.ts", "apps/web/lib/monitoring/diff/__tests__/detect.spec.ts"],
   steps=["detect(prev, curr) 纯函数（按 externalModelId 对齐）", "model_first_seen：externalModelId 规范化后在全部源观测中首次出现", "persist：事件写 catalog_change_events，并为 model_first_seen 写 EvidenceChain(evidenceType='discovery', source='aggregator', sourceUrl)", "单测：4 类事件 + 阈值边界 0.99%/1%"],
   accept=["`pnpm --filter web exec vitest run lib/monitoring/diff` 全绿", "事件均可被 CatalogChangeEventSchema.parse", "tsc exit 0"],
   verify="pnpm --filter web exec vitest run lib/monitoring/diff && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/lib/monitoring/diff/"], deps=["059", "060"], block_cond="无", escalate="无", size="中", hours=6)

mk(id="062", slice="S10", name="调度脚本 monitor_catalogs.ts（按源 cron 运行 collector→writer→diff，单源失败不影响他源）",
   owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="薄封装脚本，沿用 crawl_llmtest.ts 范式",
   req="REQ-M-009/010", goal="`npx tsx scripts/crawl/monitor_catalogs.ts --source openrouter --dry-run` 输出观测数；非 dry-run 写库；任一源异常记 monitoring_sources.lastError 且退出码仍为 0（部分成功）、全部失败退出码 1",
   docs=[MD, "scripts/crawl/crawl_llmtest.ts（范式）", "apps/web/lib/features/admin/script-executor.ts（调度执行器）"], contracts=["MonitoringSourceSchema"],
   pre_state="TASK-061 已合并", outputs=["scripts/crawl/monitor_catalogs.ts（新建）"],
   steps=["参数：--source <key|all> --dry-run --limit N", "按 enabled 且 authRequired=false（或凭证已配置）的源顺序执行；每源 try/catch", "更新 monitoring_sources.lastRunAt/lastStatus/lastError/lastCount"],
   accept=["`npx tsx scripts/crawl/monitor_catalogs.ts --help` exit 0", "--dry-run 在无 DB 环境下对 fixture 模式（MONITOR_FIXTURE_DIR）输出 3 源计数", "人工断网时退出码 1 且 stderr 含每源错误"],
   verify="npx tsx scripts/crawl/monitor_catalogs.ts --help && MONITOR_FIXTURE_DIR=apps/web/lib/monitoring/catalog/__tests__/fixtures npx tsx scripts/crawl/monitor_catalogs.ts --source all --dry-run",
   allow=["scripts/crawl/monitor_catalogs.ts"], deps=["061"], block_cond="无", escalate="无", size="小", hours=3)

mk(id="063", slice="S10", name="管理端 API：/api/v1/admin/monitoring/{sources, sources/:key, sources/:key/run, changes}",
   owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="CRUD 路由，契约冻结，复用 requireAdminApi",
   req="REQ-M-009/011/012", goal="4 端点按 07-monitoring.contract.ts 实现：GET 源列表（含健康）、PATCH 启停/cadence（仅 enabled、cadenceCron 可改）、POST run（Redis 锁防重入，202）、GET changes 分页；未授权 401/403，未知源 20004，缺凭证源 run → 50012",
   docs=[MD, MC], contracts=["AdminMonitoringSourceListResponse", "AdminMonitoringSourcePatchBody", "AdminMonitoringChangeQuery", "MONITORING_ERROR_CODES"], pre_state="TASK-058、TASK-061 已合并",
   outputs=["apps/web/app/api/v1/admin/monitoring/sources/route.ts", "apps/web/app/api/v1/admin/monitoring/sources/[key]/route.ts", "apps/web/app/api/v1/admin/monitoring/sources/[key]/run/route.ts", "apps/web/app/api/v1/admin/monitoring/changes/route.ts", "apps/web/lib/monitoring/__tests__/admin-routes.spec.ts"],
   steps=["鉴权：requireAdminApi('admin:sync:read') 读、'admin:sync:write' 写（复用既有权限码，见 03-identity）", "run：SETNX lock:monitor:run:<key> TTL 300s；已锁返回 TOO_MANY_REQUESTS", "changes：page/pageSize/sourceKey/kind/since 过滤，按 detectedAt desc"],
   accept=["`pnpm --filter web exec vitest run lib/monitoring/__tests__/admin-routes.spec.ts` 全绿（含 401/403/20004/50012 用例）", "响应均可被对应 zod Response schema parse", "tsc exit 0"],
   verify="pnpm --filter web exec vitest run lib/monitoring/__tests__/admin-routes.spec.ts && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/app/api/v1/admin/monitoring/", "apps/web/lib/monitoring/__tests__/admin-routes.spec.ts"], deps=["058", "061"],
   block_cond="需要新增权限码 → 停止，提 ADR（Identity 契约冻结）", escalate="无", size="中", hours=6)

mk(id="064", slice="S10", name="后台 UI：「模型源监控」页（源分级卡片 + 健康/最后运行 + 变更流 + 手动运行，五态齐全）",
   owner="Agent-App", assignee="Hark(主Agent)", tier="opus", tier_reason="UI 设计与实现（用户指令：UI 由主 Agent 完成）；需新设计信息架构",
   req="REQ-M-009/011/013", goal="/admin/monitoring 展示源表（tier 徽章 S1/S2/A/B/C、kind、authRequired、enabled 开关、lastRunAt/lastStatus/lastCount）与变更流（4 类事件筛选、分页、证据链接），空/加载/错误/无权限/成功五态按 MONITORING_UX_STATES testid 实现",
   docs=[MD, "contracts/06-ux-states.contract.ts", MC, "docs/product/design/UI设计文档.md"], contracts=["MONITORING_UX_STATES", "AdminMonitoringSourceListResponse", "AdminMonitoringChangeListResponse"],
   pre_state="TASK-063 已合并", outputs=["apps/web/app/(admin)/admin/monitoring/page.tsx", "apps/web/components/admin/monitoring/SourceTable.tsx", "apps/web/components/admin/monitoring/ChangeFeed.tsx", "apps/web/components/admin/monitoring/TierBadge.tsx"],
   steps=["沿用后台既有表格/卡片组件与 Tailwind 4 token（不引新 UI 库）", "变更流事件卡：模型 ID、源、前后价格（USD/1M 原币，不做汇率换算，避免 U-15 依赖）、证据外链", "手动运行按钮：202 后轮询 lastRunAt（5s×12 上限）", "五态 testid：monitoring-empty/loading/error/forbidden/ready"],
   accept=["`pnpm --filter web exec tsc --noEmit` exit 0", "`pnpm --filter web lint` 0 error", "`next build` 路由表含 /admin/monitoring", "人工：1280/768 宽度截图存证，五态各一张（mock API）"],
   verify="pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && cd apps/web && npx next build",
   allow=["apps/web/app/(admin)/admin/monitoring/", "apps/web/components/admin/monitoring/"], deps=["063"], block_cond="契约字段不足以渲染 → 停止回报（不得在前端猜字段）", escalate="无", size="大", hours=10)

mk(id="065", slice="S10", name="E2E：后台监控页五态 + 手动运行后变更流出现新事件（fixture 源）",
   owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="E2E 脚本",
   req="REQ-M-009/013", goal="e2e/admin/monitoring.spec.ts 在测试库 + MONITOR_FIXTURE_DIR 下跑通：登录管理员→进入 /admin/monitoring→运行 openrouter→变更流出现 ≥1 条 listed 事件；未授权用户见 forbidden 态",
   docs=[MD], contracts=["MONITORING_UX_STATES"], pre_state="TASK-062、TASK-064 已合并；e2e 唯一配置（TASK-037）与 CI e2e job（TASK-006）已合并",
   outputs=["e2e/admin/monitoring.spec.ts（新建）"], steps=["复用 e2e/fixtures.ts 登录助手", "fixture 模式运行脚本而非外网", "断言五态 testid 至少 ready/forbidden/empty 三态"],
   accept=["`npx playwright test e2e/admin/monitoring.spec.ts` 通过（CI e2e job）", "--list 计数 +≥3"],
   verify="npx playwright test e2e/admin/monitoring.spec.ts --config playwright.config.ts",
   allow=["e2e/admin/monitoring.spec.ts"], deps=["062", "064", "037", "006"], block_cond="CI 无 PG 服务 → 标记 待其他员工完成（依赖 TASK-006）", escalate="无", size="中", hours=4)

mk(id="066", slice="S11", name="公开 API：GET /api/v1/models/{id}/offerings（该模型在各监控源的上架与原币价格，含来源与采集时间）",
   owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="只读查询路由，契约冻结",
   req="REQ-M-006/007/014", goal="按 AiModel.code ↔ observation.normalizedModelId 匹配，返回 {items:[{sourceKey,tier,isListed,priceInputUsdPer1M,priceOutputUsdPer1M,firstSeenAt,lastSeenAt,sourceUrl}]}；中转源（kind=relay）条目必须带 identityVerified=false 标志",
   docs=[MD, MC], contracts=["ModelOfferingsResponse"], pre_state="TASK-059 已合并",
   outputs=["apps/web/app/api/v1/models/[id]/offerings/route.ts", "apps/web/lib/monitoring/__tests__/offerings-route.spec.ts"],
   steps=["只返回 monitoring_sources.tos_status ∈ {allowed, attribution_required} 的源（pending 源仅后台可见，ADR-P007）；attribution_required 源填 attribution", "PUBLIC 鉴权；Redis 缓存 600s（键 cache:model-offerings:<id>，沿用 05-events 缓存标签规则）", "未知模型 → MODEL_NOT_FOUND 20001", "按 tier 排序 S1>S2>A>B>C"],
   accept=["vitest 路由单测全绿（含 20001、relay 标志用例）", "响应 parse 通过", "tsc exit 0"],
   verify="pnpm --filter web exec vitest run lib/monitoring/__tests__/offerings-route.spec.ts && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/app/api/v1/models/[id]/offerings/", "apps/web/lib/monitoring/__tests__/offerings-route.spec.ts"], deps=["059", "056"], block_cond="无", escalate="无", size="中", hours=4)

mk(id="067", slice="S11", name="前台 UI：模型详情页「在哪里可调用」区块（多源上架/价格对比/中转风险提示/来源署名）",
   owner="Agent-App", assignee="Hark(主Agent)", tier="opus", tier_reason="用户可见 UI 设计与实现（用户指令：UI 由主 Agent 完成）",
   req="REQ-M-006/007/014/015", goal="/models/[slug] 新增区块：表格列 源（tier 徽章）/上架状态/输入·输出原币价/最后采集时间/来源链接；relay 源显示「身份未验证」提示；五态齐全；数据来自 TASK-066",
   docs=[MD, "contracts/06-ux-states.contract.ts", "docs/product/design/UI设计文档.md"], contracts=["ModelOfferingsResponse", "MONITORING_UX_STATES"], pre_state="TASK-066 已合并",
   outputs=["apps/web/components/models/ModelOfferings.tsx（新建）", "apps/web/app/(site)/models/[slug]/page.tsx（挂载区块）"],
   steps=["价格以原币 USD/1M 显示并标注来源，不做汇率换算（U-15 未决前不得出现 ¥ 换算值）", "若数据含 Artificial Analysis 来源，区块底部显示署名链接（ADR-P007）", "testid：offerings-empty/loading/error/ready"],
   accept=["tsc exit 0；lint 0 error", "next build 通过", "人工：桌面/移动截图存证；relay 提示可见"],
   verify="pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && cd apps/web && npx next build",
   allow=["apps/web/components/models/ModelOfferings.tsx", "apps/web/app/(site)/models/[slug]/page.tsx"], deps=["066"], block_cond="无", escalate="设计与天梯模块口径冲突 → 升 opus", size="大", hours=8)

mk(id="068", slice="S11", name="上架同步：观测 → ProviderModelOffering（源↔平台实体映射，listedAt=firstSeenAt，isActive=isListed）",
   owner="Agent-Data", assignee="Hark(主Agent)", tier="opus", tier_reason="实体映射（ModelProvider vs APIStation）与模型身份对齐，错误会污染人工数据",
   req="REQ-M-005/006", goal="按 U-M5 裁决：方案A 映射到 ModelProvider.code、方案B 映射到 APIStation；只更新 sync 所有字段（listedAt/isActive/价格原币），不覆盖人工字段（defaultMultiplier/discount*），每次写入留 EvidenceChain",
   docs=[MD, "docs/product/design/功能设计文档.md 五、字段所有权矩阵"], contracts=["ProviderModelObservationSchema"], pre_state="U-M5 已裁决；TASK-059 已合并",
   outputs=["apps/web/lib/sync/writers/offering-sync.ts（新建）", "apps/web/lib/sync/writers/offering-sync.spec.ts（新建）"],
   steps=["映射表：monitoring_sources.mappedEntityType/mappedEntityId（M-002 已含字段）", "模型对齐：仅 normalizedModelId 精确命中 AiModel.code 才写；未命中进入 DiscoveryCandidate(candidateType='model') 待人工", "单测：人工字段不被覆盖、未命中不写 offering"],
   accept=["vitest 全绿（≥5 用例）", "tsc exit 0", "人工字段保持断言通过"],
   verify="pnpm --filter web exec vitest run lib/sync/writers/offering-sync.spec.ts && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/lib/sync/writers/offering-sync.ts", "apps/web/lib/sync/writers/offering-sync.spec.ts"], deps=["059"], block_cond="U-M5 未裁决 → 不执行（条件卡）", escalate="映射歧义 → 升 opus", size="大", hours=8, cond="U-M5")

mk(id="069", slice="S11", name="发现引擎汇率统一：pricing-extraction.ts 硬编码 7.2 → 读 system_configs pricing.fxUsdCny",
   owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="单文件常量替换 + 单测",
   req="REQ-F-02b（计价口径）/ REQ-M-007", goal="apps/web/lib/discovery/pricing-extraction.ts:217-243 四处 7.2 全部改为注入的 fx（来自 pricing.fxUsdCny，缺失时抛 GATEWAY_NO_ROUTE 语义的可识别错误并跳过写 PriceRule）",
   docs=["docs/任务规划V0.7.0/03_solution/decisions/ADR-P005-计价口径归一.md"], contracts=["FxConfigSchema"], pre_state="TASK-055 已合并（fx 种子）；U-15 已裁决",
   outputs=["apps/web/lib/discovery/pricing-extraction.ts", "apps/web/lib/discovery/__tests__/pricing-extraction-fx.spec.ts（新建）"],
   steps=["抽出 toMinorCny(value, unit, fx) 纯函数", "调用方读取 SystemConfig（复用既有 config 读取工具）", "单测：fx=5 与 fx=7.2 两组 + 缺失 fx"],
   accept=["`grep -n '7\\.2' apps/web/lib/discovery/pricing-extraction.ts` 无输出", "vitest 全绿", "tsc exit 0"],
   verify="! grep -n '7\\.2' apps/web/lib/discovery/pricing-extraction.ts && pnpm --filter web exec vitest run lib/discovery && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/lib/discovery/pricing-extraction.ts", "apps/web/lib/discovery/__tests__/pricing-extraction-fx.spec.ts"], deps=["055"], block_cond="U-15 未裁决 → 不执行（条件卡）", escalate="无", size="小", hours=3, cond="U-15")

mk(id="070", slice="S12", name="密钥源目录采集：SiliconFlow /v1/models、DeepSeek /models 等官方/托管目录（缺凭证时健康=credential_missing）",
   owner="Agent-API", assignee="Hark(主Agent)", tier="opus", tier_reason="凭证处理 + 多厂商接口差异，安全敏感",
   req="REQ-M-002/010/016", goal="lib/monitoring/keyed/ 实现 S1/S2/A 级 keyed collector（首批按 U-M1 清单），凭证仅从环境变量读取（MONITOR_KEY_<SOURCE>），日志与快照中不得出现凭证；缺凭证返回 MONITOR_SOURCE_CREDENTIAL_MISSING 而非异常",
   docs=[MD, "docs/任务规划V0.7.0/19_外部来源核验证据.md（SiliconFlow 无 key 实测 401）"], contracts=["MonitoringSourceSchema", "MONITORING_ERROR_CODES"], pre_state="U-M1 已裁决并提供凭证；TASK-060 已合并",
   outputs=["apps/web/lib/monitoring/keyed/"], steps=["每源 collector + fixture 单测（fixture 由持 key 者一次性录制并脱敏）", "secret-scan 规则（TASK-007）覆盖 MONITOR_KEY_ 前缀", "SiliconFlow 仅返回 id/object/owned_by（实测文档），价格不从该接口取"],
   accept=["vitest 全绿", "`grep -rn 'sk-' apps/web/lib/monitoring/keyed` 无输出", "缺 env 时 collector 返回 credential_missing（单测）"],
   verify="pnpm --filter web exec vitest run lib/monitoring/keyed && node scripts/guard/secret-scan.mjs",
   allow=["apps/web/lib/monitoring/keyed/"], deps=["060"], block_cond="U-M1 未裁决/未提供凭证 → 不执行（条件卡）", escalate="厂商 ToS 禁止自动化列举 → 停止并回报", size="大", hours=8, cond="U-M1")

mk(id="071", slice="S12", name="可用性与中转真实性探针：最小请求探测 → ReliabilityObservation + 身份信号（含 Claude thinking signature 检查）",
   owner="Agent-API", assignee="Hark(主Agent)", tier="opus", tier_reason="涉及真实付费调用、反伪造判定逻辑与误报风险，高难度",
   req="REQ-M-008/015/016", goal="lib/monitoring/probe/ 对 enabled 中转源按预算执行最小请求（max_tokens≤16）记录延迟/成功率写 ReliabilityObservation；对声称 Claude 的模型做 thinking signature 存在性检查，结果仅作「身份信号」，不得据此自动下架或 promote",
   docs=[MD, "docs/任务规划V0.7.0/19_外部来源核验证据.md（Veridrop 方法与 AGPL 许可）"], contracts=["AvailabilityProbeResultSchema"], pre_state="U-M3 已裁决（预算/是否允许真实调用）；TASK-070 已合并",
   outputs=["apps/web/lib/monitoring/probe/"], steps=["每源每日预算上限（env MONITOR_PROBE_DAILY_BUDGET_USD），超限即停", "不引入 Veridrop 代码（AGPL-3.0），仅参考公开方法自研", "结果写 ReliabilityObservation(entityType='station')"],
   accept=["vitest 全绿（mock fetch）", "预算超限用例断言不再发请求", "tsc exit 0"],
   verify="pnpm --filter web exec vitest run lib/monitoring/probe && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/lib/monitoring/probe/"], deps=["070"], block_cond="U-M3 未裁决 → 不执行（条件卡）", escalate="误报争议 → 升 opus", size="大", hours=10, cond="U-M3")

mk(id="072", slice="S12", name="Artificial Analysis Data API v2 适配器重写（/api/v2/language/models/free，x-api-key，署名字段）",
   owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="单适配器重写，文档已核验",
   req="REQ-M-002/015", goal="artificial-analysis.ts 改为调用 https://artificialanalysis.ai/api/v2/language/models/free（x-api-key），移除已 404 的 /api/leaderboard 主路径；每日请求 ≤ 免费额度 100/24h；产出数据带 attribution='Artificial Analysis' + sourceUrl",
   docs=["docs/任务规划V0.7.0/19_外部来源核验证据.md（AA 文档：Free 100 次/24h、需署名、再分发需联系）"], contracts=["无新增（沿用 RawModelData + attribution 字段）"],
   pre_state="U-M2 已裁决（申请 key 并接受条款）", outputs=["apps/web/lib/sync/adapters/artificial-analysis.ts", "apps/web/lib/sync/__tests__/artificial-analysis-v2.spec.ts（新建）"],
   steps=["分页 page=1..total_pages，遵守 X-RateLimit-Remaining", "缺 key 时回落到既有 OpenRouter benchmarks 代理路径并标注 source='openrouter-proxy'", "单测 fixture 取自官方文档示例"],
   accept=["vitest 全绿", "`grep -n 'api/leaderboard' apps/web/lib/sync/adapters/artificial-analysis.ts` 无输出", "tsc exit 0"],
   verify="pnpm --filter web exec vitest run lib/sync/__tests__/artificial-analysis-v2.spec.ts && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/lib/sync/adapters/artificial-analysis.ts", "apps/web/lib/sync/__tests__/artificial-analysis-v2.spec.ts"], deps=["056"], block_cond="U-M2 未裁决 → 不执行（条件卡）", escalate="条款不允许展示 → 停止回报", size="中", hours=4, cond="U-M2")

mk(id="073", slice="S11", name="llmtest 观测入时序：composite 分数/存活/通过计数写 ReliabilityObservation（不再只塞 description）",
   owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="既有映射扩展 + 单测",
   req="REQ-M-008", goal="每次 llmtest 采集把 score/isAlive/total_checks/pass_count/last_alive_at 写 ReliabilityObservation(entityType='station' 或 candidate 关联)，窗口=采集日；保留既有候选发现行为不变",
   docs=["apps/web/lib/discovery/llmtest.ts", "docs/任务规划V0.7.0/19_外部来源核验证据.md（composite 实测 51 条、rank 从 2 开始）"], contracts=["无新增"], pre_state="TASK-058 已合并",
   outputs=["apps/web/lib/discovery/llmtest.ts", "apps/web/lib/discovery/llmtest.spec.ts", "apps/web/lib/discovery/llmtest-observations.ts（新建）"],
   steps=["新增 mapLlmtestItemToObservation 纯函数", "llmtest.spec.ts 增 3 用例（缺字段/isAlive=false/重复采集）", "rank 缺 1 的现象记录为数据源特性，不做补齐"],
   accept=["`pnpm --filter web exec vitest run lib/discovery/llmtest.spec.ts` 全绿", "既有用例不变（用例数只增不减）", "tsc exit 0"],
   verify="pnpm --filter web exec vitest run lib/discovery/llmtest.spec.ts && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/lib/discovery/llmtest.ts", "apps/web/lib/discovery/llmtest.spec.ts", "apps/web/lib/discovery/llmtest-observations.ts"], deps=["058"], block_cond="无", escalate="无", size="中", hours=4)

COND_REASON.update({"U-M1": "keyed 源 API Key 提供与保管", "U-M2": "Artificial Analysis key 与条款", "U-M3": "中转探针真实调用预算", "U-M5": "provider 映射到 ModelProvider 还是 APIStation"})
SLICES["S10"] = ("模型源监控·步行骨架（公开源）", "后台可见：5 个公开源按分级注册 → 运行 OpenRouter/AIHubMix/Quanzil 目录采集 → 快照/观测入库 → 变更流显示「新上架/下架/调价」", "无 BLOCKING（全部公开源，无需 Key）；U-M4/U-M6 以默认假设推进")
SLICES["S11"] = ("模型多源上架与价格对比（前台可见）", "模型详情页显示该模型在哪些源可调用及原币价格；llmtest 观测入时序；（条件）观测同步到平台实体；（条件）发现引擎汇率统一", "U-M5（仅 TASK-068）/ U-15（仅 TASK-069）")
SLICES["S12"] = ("密钥源 + 中转真实性 + AA 数据（条件刀）", "持 Key 的官方/托管目录入监控；中转可用性与身份信号入时序；AA 免费数据带署名入库", "U-M1/U-M2/U-M3（BLOCKING）")

# ======================================================================
# V0.5.0（2026-10-14）：main@cd5b1a9，业务树仍 = 77c7952（第 4 次无代码 delta）。
# 依据：06_validation/evidence/EVD-BASELINE-V5/（门禁复跑）+ V0.4.0 反向审计（EVD-BASELINE-V5/v05-rtm-audit.md，FIX-01..28）
# ======================================================================
for _t in T:
    if not str(_t.get("v2", "")).startswith("V0.5.0"):
        _t["v2"] = "沿用（V0.5.0 重核：cd5b1a9 业务树=77c7952 无 delta）"
def v5(i, note, **kw):
    patch(i, v2="V0.5.0 修正：" + note, **kw)

# FIX-16 迁移计数
_g = get("058"); _g["accept"] = [a.replace("17/17", "18/18") for a in _g["accept"]]
v5("058", "FIX-16 空库重放口径 18/18（既有 16 + M-001 + M-002）", accept=_g["accept"] if any("18/18" in a for a in _g["accept"]) else _g["accept"] + ["空库 `prisma migrate deploy` 输出 18/18 applied"])
# FIX-17
_g = get("045"); v5("045", "FIX-17 允许路径删除不存在的 ProductIntroEditor.tsx", allow=[a for a in _g["allow"] if "ProductIntroEditor" not in a])
# FIX-18 + FIX-22（资金路径升 opus）
_g = get("028"); v5("028", "FIX-18 契约名改为 PromotionPrice*（prices.promotions）；FIX-22 资金路径升 opus",
   tier="opus", tier_reason="资金路径（优惠价直接影响扣费），按 10 号预算规则资金路径=opus",
   goal=_g["goal"].replace("admin.models.*", "PromotionPrice*（packages/shared/src/schemas/promotion.schema.ts）"),
   contracts=[c.replace("admin.models.*", "PromotionPriceCreateSchema / PromotionPriceSchema") for c in _g["contracts"]])
# FIX-19
_g = get("049"); v5("049", "FIX-19 去掉对 006 的依赖（只需 DATABASE_URL）；grep 验收改为「文件存在 ∧ grep exit=1」",
   deps=[d for d in _g["deps"] if d != "006"],
   accept=[a for a in _g["accept"] if "grep" not in a] + ["`test -f scripts/audit/price-unit-census.mjs` exit 0 且对其 grep 违规模式 exit=1（exit=2 视为失败）", "输出按 (priceCurrency, billingUnit, source) 三维分组计数"])
# FIX-20：契约 registry 先、seed 后
_g047, _g055 = get("047"), get("055")
v5("047", "FIX-20 与 055 调换：契约 registry 先", deps=[d for d in _g047["deps"] if d != "055"])
v5("055", "FIX-20 依赖 047；验收加「键存在于 ADMIN_CONFIG_REGISTRY」", deps=sorted(set(_g055["deps"] + ["047"])),
   accept=_g055["accept"] + ["新增 seed 键全部存在于 ADMIN_CONFIG_REGISTRY（反向校验，admin-config-seed-parity 只覆盖 registry→seed）"])
# FIX-21：UI 卡的测试收集位置
for _i in ("018", "023", "045", "064", "067"):
    _g = get(_i)
    v5(_i, "FIX-21 vitest include 仅 lib/**（vitest.config.ts:13），UI 验收以 e2e 为准",
       accept=_g["accept"] + ["UI 行为以 e2e 用例断言（`pnpm test:e2e -g` 对应用例全绿），不得以组件单测替代——vitest 不收集 components/**"])
# FIX-22 执行者调整
v5("006", "FIX-22 收回 Hark：CI 真库骨架在关键路径上，是 35 张卡的上游", assignee="Hark(主Agent)", tier="opus", tier_reason="真库 CI 是全部集成验收的上游，失败面大、不可逆度高")
v5("051", "FIX-22 收回 Hark：RTM 入库是需求口径终裁", assignee="Hark(主Agent)", tier="opus", tier_reason="需求追溯矩阵入库=需求口径裁决")
v5("057", "FIX-22 收回 Hark：改需求文档 §3.4.2", assignee="Hark(主Agent)", tier="opus", tier_reason="需求文档变更属需求口径")
v5("041", "FIX-22 156KB 台账拆分，haiku 档偏低 → sonnect", tier="sonnect", tier_reason="大文件结构化拆分 + 交叉引用维护，haiku 易丢引用")
v5("070", "FIX-22 中等难度适配器，外包", assignee="外部Agent", tier="sonnect", tier_reason="按既有 collector 框架（060）加 keyed 源，模式已定")
# FIX-02：066 改为扩展既有接口，由 Hark 先设计后实现
_g = get("066"); v5("066", "FIX-02 已有 /api/v1/models/[id]/stations 与详情页「提供商与折扣价」区块 → 改为扩展既有接口（兼容旧字段），由 Hark 设计并实现，避免重复建设",
   assignee="Hark(主Agent)", tier="opus", tier_reason="既有公开接口的兼容扩展（不得破坏旧字段），属契约兼容决策",
   name="扩展既有 GET /api/v1/models/[id]/stations：追加各监控源上架状态与原币价格（向后兼容，不新建 offerings 端点）",
   allow=["apps/web/app/api/v1/models/[id]/stations/", "apps/web/lib/monitoring/__tests__/offerings-route.spec.ts"],
   steps=["读取既有 route.ts:1-37 响应形状，新增字段只追加不改名", "数据来自 059 写入的 ProviderModelObservation 最新行", "单测覆盖：旧字段不变 / 新字段存在 / 无观测时为空数组"] )
_g = get("067"); v5("067", "FIX-02 改造既有「提供商与折扣价」区块（page.tsx:246-290），不另起区块", steps=["在 page.tsx:246-290 既有区块内扩展多源列，不新增并列区块"] + _g["steps"])
# FIX-14
_g = get("042"); v5("042", "FIX-14 scripts/db/backup.sh、restore.sh 已存在，改为在既有脚本上扩展逐表行数比对与演练记录", steps=["在 scripts/db/backup.sh、restore.sh 既有实现上扩展（restore.sh:56-59），不另写一套"] + _g["steps"], allow=sorted(set(_g["allow"] + ["scripts/db/**"])))
# REQ-F-063 并入 027
_g = get("027"); v5("027", "REQ-F-063：生效价随上游价格采集同步展示价", steps=_g["steps"] + ["采集写入新价后，生效价解析结果随之更新（前台展示价与采集同步，REQ-F-063）"])

# 新卡
insert_after("067", id="074", slice="S11", name="UI：模型详情页基准测试弹窗 + 历史测评示例（多模型回答并排）替换「即将上线」占位",
   owner="Agent-App", assignee="Hark(主Agent)", tier="opus", tier_reason="核心前台 UI 设计与实现（详情页是天梯主路径的落点）",
   req="REQ-F-010 / REQ-F-059 / REQ-L-013", sol="需求文档 §3.2；台账 #67",
   goal="详情页基准以弹窗呈现（点击基准名打开，含来源与核验状态），历史测评区块展示多模型回答并排示例，page.tsx:374 占位文案消失",
   docs=["docs/product/requirements/需求文档.md:44-46,180", "docs/product/design/界面交互文档.md", "apps/web/app/(site)/models/[slug]/page.tsx:342-374"],
   contracts=["既有 GET /api/v1/models/[id]、/api/v1/evaluations（只读，不改契约）"], pre_state="TASK-067 已合并（同文件串行）",
   outputs=["apps/web/components/models/BenchmarkDialog.tsx（新建）", "apps/web/components/models/EvaluationExamples.tsx（新建）", "apps/web/app/(site)/models/[slug]/page.tsx", "e2e/model-detail-benchmark.spec.ts 由 TASK-075 编写"],
   steps=["设计：弹窗结构（基准名/分数/来源/核验徽标/演示数据标识）与四态（加载/空/错误/成功）", "实现 BenchmarkDialog，复用 @aidean/ui Dialog", "EvaluationExamples 读取已公开的历史测评，空数据时显示空态而非「即将上线」", "移除 page.tsx:374 占位"],
   accept=["`grep -n '即将上线' 'apps/web/app/(site)/models/[slug]/page.tsx'` exit=1", "`pnpm --filter web exec tsc --noEmit` exit 0", "`pnpm --filter web lint` exit 0", "TASK-075 的 e2e 全绿（弹窗可开关、示例区块四态）"],
   verify="pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && ! grep -n '即将上线' 'apps/web/app/(site)/models/[slug]/page.tsx'",
   allow=["apps/web/components/models/BenchmarkDialog.tsx", "apps/web/components/models/EvaluationExamples.tsx", "apps/web/app/(site)/models/[slug]/page.tsx"],
   forbid=["packages/shared/**", "apps/web/app/api/**", "apps/web/prisma/**"], deps=["067"], block_cond="需新增 API 字段 → 停止，提契约变更", escalate="交互口径不明 → 升 fable 裁决", size="大", hours=10,
   v2="V0.5.0 新增（FIX-01）")
insert_after("074", id="075", slice="S11", name="e2e：模型详情页基准弹窗与测评示例", owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="按 074 验收写 e2e，模式既有",
   req="REQ-F-059", sol="同 074", goal="e2e 覆盖：打开/关闭基准弹窗、演示数据标识、测评示例空态与有数据态",
   docs=["docs/任务规划V0.7.0/05_execution/tasks/TASK-074.md"], contracts=["无"], pre_state="TASK-074、TASK-006 已合并",
   outputs=["e2e/model-detail-benchmark.spec.ts（新建）"], steps=["基于既有 e2e 登录/种子工具编写 4 个用例"], accept=["`pnpm test:e2e -g model-detail-benchmark` 全绿", "用例数 ≥4"],
   verify="pnpm test:e2e -g model-detail-benchmark", allow=["e2e/model-detail-benchmark.spec.ts"], forbid=["apps/**"], deps=["074", "006"], block_cond="074 未合并", escalate="无", size="小", hours=3, v2="V0.5.0 新增（FIX-01）")
insert_after("049", id="076", slice="S1", name="后端红线核验测试：字段所有权（sync 不覆盖人工字段）+ model_change_logs 全写入面 + 通用版等级固定序",
   owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="只读核验 + 单测补齐，不改业务逻辑", sol="功能设计文档 §五 D-2=C",
   req="REQ-F-054 / REQ-F-055 / REQ-F-062", goal="vitest 用例证明：sync 写入器只 SET sync 字段；人工与 sync 写操作均写 model_change_logs；通用版等级序 Opus>Sonnet>Fable>Haiku 与专业版默认映射 1/2/3/4",
   docs=["docs/product/design/功能设计文档.md:233-281", "docs/product/requirements/需求文档.md:66,90-92", "apps/web/lib/sync/writers/index.ts", "apps/web/lib/features/admin/model-change-log.ts"],
   contracts=["无新增"], pre_state="无", outputs=["apps/web/lib/features/admin/__tests__/field-ownership.spec.ts（新建）", "apps/web/lib/features/admin/__tests__/change-log-coverage.spec.ts（新建）", "apps/web/lib/features/gateway/__tests__/tier-order.spec.ts（新建）"],
   steps=["逐字段列出 sync 字段集合与人工字段集合（来自功能设计文档表）", "对 writers 做 mock prisma 断言 update data 键 ⊆ sync 字段", "枚举全部写入面（grep modelChangeLog.create），每个写入面一条断言", "发现缺陷 → 记录到证据并停止，不修业务代码（另立卡）"],
   accept=["`pnpm --filter web exec vitest run lib/features/admin/__tests__ lib/features/gateway/__tests__/tier-order.spec.ts` 全绿或失败用例已登记为缺陷", "证据含写入面清单（文件:行）", "tsc exit 0"],
   verify="pnpm --filter web exec vitest run lib/features/admin/__tests__ lib/features/gateway/__tests__/tier-order.spec.ts && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/lib/features/admin/__tests__/field-ownership.spec.ts", "apps/web/lib/features/admin/__tests__/change-log-coverage.spec.ts", "apps/web/lib/features/gateway/__tests__/tier-order.spec.ts"],
   forbid=["apps/web/lib/sync/writers/**", "apps/web/prisma/**"], deps=[], block_cond="测试失败即业务缺陷 → 停止并登记，不得改业务代码", escalate="发现资金/数据覆盖缺陷 → 升 opus", size="中", hours=5, v2="V0.5.0 新增（FIX-04/05/11）")
insert_after("076", id="077", slice="S0", name="OIDC 安全红线回归测试：PKCE 仅 S256 / refresh 重放撤整链 / host-only Cookie",
   owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="按接入指南写回归测试", sol="子平台SSO接入指南",
   req="REQ-F-056", goal="三条红线各有至少一个失败路径用例：plain 被拒、重放 refresh 后整链失效、Set-Cookie 不含 Domain=",
   docs=["docs/product/modules/子平台SSO接入指南.md:55,89,141,215-229", "apps/web/lib/features/auth/repository.ts:59,67"], contracts=["既有错误码（invalid_request / invalid_grant）"], pre_state="无",
   outputs=["apps/web/lib/features/auth/__tests__/oidc-redlines.spec.ts（新建）"], steps=["定位 authorize/token 处理函数", "plain → 400 invalid_request", "同一 refresh 用两次 → 第二次 invalid_grant 且同链 access 失效", "Cookie 断言无 Domain 属性"],
   accept=["`pnpm --filter web exec vitest run lib/features/auth/__tests__/oidc-redlines.spec.ts` 全绿或失败用例已登记为安全缺陷", "tsc exit 0"],
   verify="pnpm --filter web exec vitest run lib/features/auth/__tests__/oidc-redlines.spec.ts && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/lib/features/auth/__tests__/oidc-redlines.spec.ts"], forbid=["apps/web/lib/features/auth/*.ts（只读）"], deps=["001"], block_cond="红线不成立 → 停止并登记安全缺陷，交 Hark/opus", escalate="安全缺陷 → 升 opus", size="小", hours=4, v2="V0.5.0 新增（FIX-06）")
insert_after("023", id="078", slice="S3", name="UI 小修：天梯五维筛选「全部」全选/全不选 + 价格页充值档位改读 shared RECHARGE_TIERS",
   owner="Agent-App", assignee="Hark(主Agent)", tier="sonnect", tier_reason="两处前台 UI 小修，合并成刀避免 <2h 单刀；UI 归 Hark",
   req="REQ-F-058 / REQ-F-026", sol="需求文档 §七验收:179；billing.constants.ts:43-47",
   goal="每组筛选「全部」可全选与全不选（现仅「不限」清空）；/pricing 不再硬编码档位，与 shared 常量一致",
   docs=["docs/product/requirements/需求文档.md:179", "apps/web/components/ladder/LadderFilterBar.tsx:5,152", "apps/web/app/(site)/pricing/page.tsx:31", "packages/shared/src/constants/billing.constants.ts:43-47"],
   contracts=["RECHARGE_TIERS（只读引用）"], pre_state="TASK-023 已合并（同 Agent-App 串行）",
   outputs=["apps/web/components/ladder/LadderFilterBar.tsx", "apps/web/app/(site)/pricing/page.tsx", "e2e/ladder-filter-all.spec.ts 由 TASK-079 编写"],
   steps=["「全部」改为三态切换（全选/全不选），保持 URL 参数兼容", "pricing 页 import RECHARGE_TIERS 替换硬编码数组"],
   accept=["`grep -nE '\\[\\s*10\\s*,\\s*55' 'apps/web/app/(site)/pricing/page.tsx'` exit=1", "tsc/lint exit 0", "TASK-079 e2e 全绿"],
   verify="pnpm --filter web exec tsc --noEmit && pnpm --filter web lint",
   allow=["apps/web/components/ladder/LadderFilterBar.tsx", "apps/web/app/(site)/pricing/page.tsx"], forbid=["packages/shared/**"], deps=["023"], block_cond="无", escalate="交互口径不明 → 升 opus", size="小", hours=3, v2="V0.5.0 新增（FIX-08/15）")
insert_after("078", id="079", slice="S3", name="e2e：筛选「全部」全选/全不选 + 价格页档位一致", owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="e2e 编写",
   req="REQ-F-058 / REQ-F-026", sol="同 078", goal="e2e 断言两条行为", docs=["docs/任务规划V0.7.0/05_execution/tasks/TASK-078.md"], contracts=["无"], pre_state="TASK-078、TASK-006 已合并",
   outputs=["e2e/ladder-filter-all.spec.ts（新建）"], steps=["全选/全不选各一例；pricing 档位与 RECHARGE_TIERS 一致一例"], accept=["`pnpm test:e2e -g ladder-filter-all` 全绿"], verify="pnpm test:e2e -g ladder-filter-all",
   allow=["e2e/ladder-filter-all.spec.ts"], forbid=["apps/**"], deps=["078", "006"], block_cond="无", escalate="无", size="小", hours=2, v2="V0.5.0 新增")
insert_after("048", id="080", slice="S4", name="缓存命中 token 计价（priceCache / discountCache）接入网关扣费", owner="Agent-API", assignee="Hark(主Agent)", tier="opus", tier_reason="资金路径",
   req="REQ-F-060", sol="ADR-P005 计价口径归一；功能设计文档 D.4",
   goal="cachedTokens 按缓存价计费（无缓存价时按输入价），单测覆盖三种组合",
   docs=["docs/product/design/功能设计文档.md:322-324", "apps/web/lib/features/gateway/service.ts:681-704,712-860"], contracts=["EffectivePrice（026）"], pre_state="TASK-048 已合并",
   outputs=["apps/web/lib/features/gateway/service.ts", "apps/web/lib/features/gateway/__tests__/cache-billing.spec.ts（新建）"],
   steps=["预估与结算两处均纳入 cachedTokens", "缓存价缺失回退输入价并记录", "单测：有缓存价/无缓存价/cachedTokens=0"],
   accept=["vitest 全绿", "既有网关用例数不减", "tsc exit 0"], verify="pnpm --filter web exec vitest run lib/features/gateway && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/lib/features/gateway/service.ts", "apps/web/lib/features/gateway/__tests__/cache-billing.spec.ts"], forbid=["apps/web/prisma/**"], deps=["048"], block_cond="U-15 未裁决", escalate="需新增价格字段 → 升 fable", size="中", hours=6, cond="U-15", v2="V0.5.0 新增（FIX-09）")
insert_after("028", id="081", slice="S4", name="后台价格批量写入 POST /api/v1/admin/prices/batch-upsert（requestId 幂等）", owner="Agent-API", assignee="外部Agent", tier="sonnect", tier_reason="CRUD 扩展，幂等模式参照 models/batch",
   req="REQ-F-061", sol="功能设计文档 §209-211",
   goal="批量 upsert ≤500 行；同一 requestId 重放返回首次结果且不重复写；逐行写 audit_logs",
   docs=["docs/product/design/功能设计文档.md:209-211", "apps/web/app/api/v1/admin/models/batch/route.ts（参照）"], contracts=["PriceBatchUpsertSchema（由 TASK-082 落入 shared）"], pre_state="TASK-082 已合并",
   outputs=["apps/web/app/api/v1/admin/prices/batch-upsert/route.ts（新建）", "apps/web/lib/features/auth/__tests__/admin-prices-batch.spec.ts（新建）"],
   steps=["requestId 存幂等键（复用既有幂等机制，若无则停止提 ADR）", "事务内逐行 upsert + writeAudit", "单测：成功/重放/超限/越权"],
   accept=["vitest 全绿", "tsc exit 0", "非 admin 调用返回 403"], verify="pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-prices-batch.spec.ts && pnpm --filter web exec tsc --noEmit",
   allow=["apps/web/app/api/v1/admin/prices/batch-upsert/", "apps/web/lib/features/auth/__tests__/admin-prices-batch.spec.ts"], forbid=["packages/shared/**", "apps/web/prisma/**"], deps=["082", "028"], block_cond="无既有幂等存储 → 停止提 ADR", escalate="需新表 → 升 opus", size="中", hours=5, v2="V0.5.0 新增（FIX-10）")
insert_after("026", id="082", slice="S4", name="契约：PriceBatchUpsertSchema（rows≤500 + requestId）", owner="Agent-Contract", assignee="Hark(主Agent)", tier="opus", tier_reason="契约唯一源",
   req="REQ-F-061", sol="ADR-P001 契约唯一源", goal="packages/shared 导出 PriceBatchUpsertSchema 与响应 DTO", docs=["docs/product/design/功能设计文档.md:209-211"], contracts=["PriceSchema（既有）"], pre_state="TASK-001 已合并",
   outputs=["packages/shared/src/schemas/price-batch.schema.ts（新建）", "packages/shared/src/index.ts"], steps=["复用 PriceSchema 行定义", "requestId=uuid", "导出"],
   accept=["`pnpm --filter @aidean/shared exec tsc --noEmit` exit 0", "`pnpm --filter @aidean/shared test` 全绿"], verify="pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test",
   allow=["packages/shared/src/schemas/price-batch.schema.ts", "packages/shared/src/index.ts"], forbid=["apps/**"], deps=["001"], block_cond="无", escalate="无", size="小", hours=2, v2="V0.5.0 新增（FIX-10）")
insert_after("042", id="083", slice="S8", name="上线前 seed 演示数据人工审核门禁（清单生成 + 审核记录校验）", owner="Agent-Guard", assignee="外部Agent", tier="sonnect", tier_reason="脚本 + 清单，无业务决策",
   req="REQ-F-053", sol="需求文档:69", goal="脚本列出 seed 中全部 verifiedStatus=1 行并要求 docs 审核记录逐条覆盖，缺一即 exit 1",
   docs=["docs/product/requirements/需求文档.md:69", "apps/web/prisma/seed.ts:531"], contracts=["无"], pre_state="U-3 已裁决（进入上线准备）",
   outputs=["scripts/release/check-seed-review.mjs（新建）"], steps=["解析 seed.ts 收集行键", "比对审核记录文件（路径由 U-3 裁决时确定，默认 docs/plans/上线前seed审核.md）", "CI 中仅在 release 分支启用"],
   accept=["审核记录缺失时 `node scripts/release/check-seed-review.mjs` exit 1", "全覆盖时 exit 0"], verify="node scripts/release/check-seed-review.mjs; echo exit=$?",
   allow=["scripts/release/check-seed-review.mjs"], forbid=["apps/**"], deps=["042"], block_cond="U-3 未裁决", escalate="无", size="小", hours=3, cond="U-3", v2="V0.5.0 新增（FIX-03）")
insert_after("079", id="084", slice="S6", name="核验：天梯页无页脚 + 台账 #19 admin 配置治理收口状态", owner="Agent-Guard", assignee="外部Agent", tier="haiku", tier_reason="取证型 e2e 断言 + 台账核对",
   req="REQ-NF-012 / REQ-L-014", sol="需求文档:41；未完成事项目录.md:46", goal="e2e 断言 /models 与 /providers 无 footer；输出 #19 收口证据或缺口清单",
   docs=["docs/product/requirements/需求文档.md:41", "docs/plans/未完成事项目录.md:46"], contracts=["无"], pre_state="TASK-006 已合并",
   outputs=["e2e/ladder-no-footer.spec.ts（新建）"], steps=["两页各断言 footer 不存在", "#19 逐项对照代码，结果写证据"], accept=["`pnpm test:e2e -g ladder-no-footer` 全绿或失败已登记", "证据含 #19 逐项结论"],
   verify="pnpm test:e2e -g ladder-no-footer", allow=["e2e/ladder-no-footer.spec.ts"], forbid=["apps/**"], deps=["006"], block_cond="无", escalate="无", size="小", hours=2, v2="V0.5.0 新增（FIX-12）")

# =====================================================================================
# V0.7.0 层（2026-10-17）：基线 nevermeetagain/Aidean main@ffa158c（业务树仍 = 77c7952，`git diff --stat 77c7952 ffa158c -- . ':!docs'` 为空）
# 新事实：V0.6.0（作者 CodingHeader 提交）声称 S0/S1 已在 aideanew/Aidean@huaweicloud 实施；该仓私有，本环境 404，不可核验 → 「证据不足」
# =====================================================================================
HDR = "> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）"
COND_REASON["B-0"] = "代码主线归一（镜像 main vs aideanew/huaweicloud）"
OWNERS["Agent-Docs"]["except"] = [P1 + "/", "docs/任务规划V0.2.0/", "docs/任务规划V0.3.0/", "docs/任务规划V0.4.0/", "docs/任务规划V0.5.0/contracts/", "docs/任务规划V0.5.0/database/", "docs/任务规划V0.6.0/", P + "/"]
OWNERS["Agent-Contract"]["own"].append("docs/任务规划V0.5.0/contracts/")
OWNERS["Agent-Data"]["own"].append("docs/任务规划V0.5.0/database/")

def _fix_paths(v):
    if isinstance(v, str):
        v = v.replace(P + "/contracts", "docs/任务规划V0.5.0/contracts").replace(P + "/database", "docs/任务规划V0.5.0/database")
        for _n in ("19_外部来源核验证据.md", "03b_监控需求增量.md", "05_数据模型基线.md"):
            v = v.replace(P + "/" + _n, "docs/任务规划V0.4.0/" + _n)  # 单一来源：V0.4.0 正字原件（V0.5.0 为字节一致的 mojibake 副本）
        return v
    if isinstance(v, list):
        return [_fix_paths(x) for x in v]
    return v
for _t in T:
    for _k in list(_t):
        _t[_k] = _fix_paths(_t[_k])
COMMON_FORBID = [_fix_paths(x) for x in COMMON_FORBID]
COMMON_FORBID[2] = "docs/任务规划V0.1.0/** … docs/任务规划V0.4.0/** · docs/任务规划V0.6.0/**（历代规划只读；V0.5.0 仅 TASK-087 可改文件名）"

MIRROR_FACTS = ("镜像核验（ffa158c）：迁移目录无 20261014000000_*（末条 20261012082315_rbac_role_permission_user_role）；"
                "schema.prisma:480 仍为 @@unique([modelId, isCurrent])；scripts/contract/、scripts/guard/ 不存在；ci.yml 无 lint 步骤；"
                "app/api/v1/system/ 仅 health、navigation（无 ready）")
OTHER_LINE = ["001", "002", "003", "004", "005", "006", "007", "008", "009", "050", "077", "010", "011", "012", "013", "076"]
for _i in OTHER_LINE:
    _t = get(_i)
    _t["st7"] = "他线声称完成·证据不足"
    _t["v7"] = (f"V0.6.0 声称已在 aideanew/Aidean@huaweicloud 落地（存档证据 docs/任务规划V0.5.0/06_validation/evidence/EVD-{_i}/）；{MIRROR_FACTS}。"
                "处置：TASK-086 于主线归一后逐卡跑本卡「验证命令」→ PASS 关闭 / FAIL 回到本卡执行；方案A（镜像为真源）下按本卡原样执行")
    _t["deps"] = list(_t["deps"]) + ([] if _t["deps"] else [])
for _t in T:
    if _t["id"] not in OTHER_LINE:
        _t["st7"] = "条件·待裁决" if _t.get("cond") else "未开工"
        _t["v7"] = ("沿用 V0.5.0 卡面；镜像业务树与 V0.5.0 规划基线同为 77c7952，卡面前提不变"
                    + ("；条件卡，待 " + _t["cond"] + " 裁决" if _t.get("cond") else "")
                    + "；启动前置：TASK-085（主线归一）合并——否则在错误代码线上开发将与他线冲突")

# S0 根节点（无依赖卡）统一挂在 085 之后：主线不归一，任何实现卡都可能落在被废弃的代码线上
for _t in T:
    if not _t["deps"] and _t["id"] not in ("085",):
        _t["deps"] = ["085"]

T.insert(0, dict(id="085", slice="S0", name="主线归一：工作代码线与 nevermeetagain/Aidean main 双端一致（B-0 裁决落地）",
   owner="Agent-Guard", assignee="Hark(主Agent)", tier="opus", tier_reason="不可逆的仓库历史操作，影响全部后续卡的基线",
   req="REQ-L-015（双端一致）", sol="ADR-P008 主线归一与镜像同步",
   goal="B-0 裁决后，nevermeetagain/Aidean main 包含工作代码线全部业务提交（方案B）或书面宣告镜像为唯一真源并归档他线（方案A），`git ls-remote` 两端 HEAD 关系可复核",
   docs=["docs/任务规划V0.7.0/23_主线二元分裂与归一方案.md", "docs/任务规划V0.6.0/19_执行过程记录.md §10", "docs/任务规划V0.7.0/03_solution/decisions/ADR-P008-主线归一与镜像同步.md"],
   contracts=["无（仓库拓扑）"], pre_state="用户已裁决 B-0（方案A/B）；方案B 另需：持有 aideanew/Aidean 读权限与 nevermeetagain/Aidean 写权限的同一执行环境",
   outputs=["无业务文件变更（仅 git 引用）", "docs/任务规划V0.7.0/06_validation/evidence/EVD-085/topology.txt"],
   steps=["记录两端快照：`git ls-remote https://github.com/nevermeetagain/Aidean.git refs/heads/main` 与 aideanew/Aidean `refs/heads/huaweicloud` 的 sha，写入 EVD-085/topology.txt",
          "判定血缘：在 huaweicloud 工作副本 `git fetch mirror && git merge-base --is-ancestor mirror/main HEAD; echo $?`（V0.6.0 自述两条历史互不包含 → 预期 1，故不能直接快进推送）",
          "方案B（快照同步，沿用 77c7952 的 mirror snapshot 惯例）：在镜像 main 的工作副本中，用 huaweicloud 树替换除 docs/任务规划V0.1.0–V0.4.0、V0.7.0 之外的全部路径（`git read-tree`/`git checkout <huaweicloud-sha> -- .` 后恢复上述目录；排除 .example/history/AideanSynapse），提交 `chore: mirror snapshot <huaweicloud-sha>`，普通快进推送",
          "方案A（镜像为唯一真源）：在 aideanew 侧打 tag `archive/huaweicloud-<YYYYMMDD>`，书面登记后续只在镜像 main 开发；S0/S1 卡按原卡执行",
          "推送后复核：`ls apps/web/prisma/migrations | tail -2` 与 `git diff --stat <huaweicloud-sha> origin/main -- . ':!docs/任务规划V0.1.0' ':!docs/任务规划V0.2.0' ':!docs/任务规划V0.3.0' ':!docs/任务规划V0.4.0' ':!docs/任务规划V0.7.0'`"],
   accept=["`git merge-base --is-ancestor ffa158c origin/main` exit 0（镜像历史未被改写）", "方案B：上述 diff --stat 为空（镜像树 = 工作线树 + 镜像独有规划目录）",
           "方案B：apps/web/prisma/migrations/20261014000000_model_prices_partial_current_unique/ 存在", "方案A：EVD-085 含用户裁决原文与 archive tag 名", "全程无 --force"],
   verify="git fetch origin && git merge-base --is-ancestor ffa158c origin/main; echo ff=$?; ls apps/web/prisma/migrations | tail -2; git log --oneline -1 origin/main",
   allow=[], forbid=["apps/**", "packages/**", "（任何 --force 推送）"], deps=[],
   block_cond="B-0 未裁决；或非快进（存在分叉）→ 停止回报，不得强推", escalate="出现分叉需三方合并 → 升 fable（全局性冲突）", size="小", hours=2, cond=None,
   v2="V0.7.0 新增（B-0）", st7="待裁决 B-0", v7="V0.7.0 新增：镜像与工作线分裂是本轮最大事实缺口"))

def _add(after, **kw):
    kw.setdefault("cond", None); kw.setdefault("v2", "V0.7.0 新增")
    insert_after(after, **kw)

_add("085", id="086", slice="S0", name="他线 S0/S1 落地独立复核：16 张卡逐卡跑验证命令并裁决 PASS/FAIL/UNKNOWN",
   owner="Agent-Guard", assignee="Hark(主Agent)", tier="opus", tier_reason="独立验证者角色（防自证循环：执行者为他线 Agent，判定者须不同）",
   req="REQ-L-015 / §9.3 防自证", sol="ADR-P008",
   goal="对 TASK-001…013/050/076/077 在归一后的 main 上逐卡执行卡内「验证命令」，输出 16 行 PASS/FAIL/UNKNOWN 表，并据此更新 task-index 状态",
   docs=["docs/任务规划V0.7.0/05_execution/task-index.md", "docs/任务规划V0.5.0/06_validation/evidence/（他线证据，仅作对照）"], contracts=["无（只读对照 docs/任务规划V0.5.0/contracts）"],
   pre_state="TASK-085 已完成（方案B）；方案A 下本卡自动关闭为 N/A",
   outputs=["docs/任务规划V0.7.0/06_validation/evidence/EVD-086/verdicts.md"],
   steps=["`pnpm install --frozen-lockfile`；记录 node/pnpm 版本", "逐卡执行验证命令（需 PG 的卡用 docker postgres:16，DATABASE_URL 仅写入环境变量）", "每卡只记 PASS/FAIL/UNKNOWN + 命令退出码 + 输出文件名", "汇总回写 task-index「V0.7.0 状态」列（交 TASK-088 落文档）"],
   accept=["verdicts.md 恰 16 行，每行含退出码与证据文件", "无 PASS 行缺证据文件", "FAIL/UNKNOWN 卡已重新标为「未开工/阻塞」"],
   verify="test $(grep -cE '^\\| TASK-(00[1-9]|01[0-3]|050|076|077) ' docs/任务规划V0.7.0/06_validation/evidence/EVD-086/verdicts.md) -eq 16; echo rows_ok=$?",
   allow=[], forbid=["apps/**", "packages/**", "scripts/**"], deps=["085"],
   block_cond="085 未完成；或执行环境缺 PG16/Docker → 记 UNKNOWN 不得写 PASS", escalate="≥3 张 FAIL → 升 fable 重估 S0/S1 范围", size="中", hours=6,
   st7="待 085", v7="V0.7.0 新增：把「员工声明」转为「可复现证据」的唯一入口")

_add("086", id="087", slice="S7", name="V0.5.0 规划树文件名 mojibake 修复（24 个双编码文件名 git mv 为正字 + 引用修正）",
   owner="Agent-Docs", assignee="外部Agent", tier="haiku", tier_reason="机械重命名，无领域决策",
   req="REQ-L-016（文档文件名可读、相对链接可解析）", sol="V0.7.0 02_事实基线 §2.4 D7-04",
   goal="docs/任务规划V0.5.0 下所有文件名可被 UTF-8 正确显示，且 V0.5.0 内相对链接 0 悬空",
   docs=["docs/任务规划V0.7.0/02_事实基线.md §2.4", "docs/任务规划V0.7.0/06_validation/evidence/EVD-BASELINE-V7/mojibake-map.txt"], contracts=["无"],
   pre_state="TASK-085 已完成（避免与 aideanew 侧同树改名冲突）",
   outputs=["docs/任务规划V0.5.0/（仅文件名，不改 contracts/ 与 database/）"],
   steps=["按 mojibake-map.txt 逐条 `git mv`（不可逆解码的 13 个按内容首行标题人工定名）", "删除与 V0.4.0 内容字节一致的重复 03_solution 文件前先确认引用", "运行链接检查脚本（`node scripts/check-docs-rule.mjs`）"],
   accept=["`git ls-files docs/任务规划V0.5.0 | grep -cP '[鍔娣瑙浜鏁鍨渚鎵椋钀鑷宸澶閲绔绗闇浠]'` 输出 0", "docs-rule、docs-facts exit 0", "contracts/、database/ diff 为空"],
   verify="git ls-files docs/任务规划V0.5.0 | grep -cP '[鍔娣瑙浜鏁鍨渚鎵椋钀鑷宸澶閲绔绗闇浠]'; node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs",
   allow=["docs/任务规划V0.5.0/"], forbid=["docs/任务规划V0.5.0/contracts/**", "docs/任务规划V0.5.0/database/**"], deps=["085"],
   block_cond="aideanew 侧 CI 以 mojibake 路径硬引用任何文件 → 停止回报", escalate="无", size="小", hours=2,
   st7="未开工", v7="V0.7.0 新增")

_add("087", id="088", slice="S7", name="治理登记：目录结构文档登记 V0.7.0 树 + task-index 状态回写 + docs/执行过程.md 归档拆分",
   owner="Agent-Docs", assignee="外部Agent", tier="haiku", tier_reason="索引/登记更新",
   req="AGENTS.md 铁律 6（目录变更必登记）/ REQ-L-015", sol="目录结构文档 v3.18 惯例",
   goal="目录结构文档补记 EVD-086 结论；依据 EVD-086 回写 V0.7.0 task-index 状态；docs/执行过程.md 移入 docs/archive/ 并修正引用",
   docs=["docs/governance/目录结构文档.md", "docs/任务规划V0.7.0/06_validation/evidence/EVD-086/verdicts.md"], contracts=["无"],
   pre_state="TASK-086 已完成（或方案A 下 N/A）",
   outputs=["docs/governance/目录结构文档.md", "docs/文档索引.md", "docs/archive/执行过程.md（git mv）"],
   steps=["核对目录结构文档已登记 V0.7.0 树（V0.7.0 规划提交已按铁律 6 登记 v3.19），版本号 +1 补记 EVD-086 结论", "按 verdicts.md 更新 V0.7.0 task-index（仅状态列）", "git mv docs/执行过程.md docs/archive/ 并 grep 修正引用"],
   accept=["`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` exit 0", "`test ! -f docs/执行过程.md` exit 0", "目录结构文档含字符串「任务规划V0.7.0」"],
   verify="node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs && test ! -f docs/执行过程.md && grep -q '任务规划V0.7.0' docs/governance/目录结构文档.md; echo exit=$?",
   allow=["docs/governance/目录结构文档.md", "docs/文档索引.md", "docs/archive/执行过程.md", "docs/执行过程.md"], forbid=["apps/**", "packages/**"], deps=["086"],
   block_cond="EVD-004 等证据以硬路径引用 docs/执行过程.md 且无法改指 → 保留原位只登记", escalate="无", size="小", hours=2,
   st7="未开工", v7="V0.7.0 新增")

SLICES["S0"] = ("步行骨架与契约守卫（含 V0.7.0 主线归一前置）", "主线归一（085）→ 他线复核（086）→ 契约唯一源 + 就绪探针 + 鉴权写闭环 e2e + CI 真库重放 + 守卫 + CI 补 lint/ui 测试", "B-0（BLOCKING：主线归一）；P-2 仅影响条件卡 TASK-008")

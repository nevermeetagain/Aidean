# > 版本: v0.2 | 更新: 2026-10-14 | 变更: V0.2.0 任务数据单一源——V0.1.0 基底 46 卡逐卡复核 + 8 张新卡（047–054）+ 条件卡标注（cond）
# -*- coding: utf-8 -*-
# 渲染：python3 gen.py（生成任务卡/索引/DAG/所有权/成本/阶段/追溯矩阵，并做机械校验）
import copy, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import base_v010 as B

P = "docs/任务规划V0.2.0"
P1 = "docs/任务规划V0.1.0"
HDR = "> 版本: v0.2 | 更新: 2026-10-14 | 变更: 任务规划V0.2.0（基于 main@59e83dd 复核；未实现需求核查/统一规划体系）"

OWNERS = copy.deepcopy(B.OWNERS)
OWNERS["Agent-Docs"]["except"] = [P1 + "/", P + "/"]

COMMON_FORBID = [
    ".example/history/**（铁律4 历史只读）",
    f"{P}/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）",
    f"{P1}/**（上一版规划只读）",
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

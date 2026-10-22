# EVD-B11-02 · 偏差与未验证项

> 版本: v1.0 | 更新: 2026-10-22 | 变更: 建立本卡偏差记录（seed.ts 改动行数、幂等边界、e2e 首跑失败根因、node_modules 空壳事故、配比调整依据）

本文件是 `07_原子任务卡全集.md` B11-02 卡面要求与最终实现的差异清单。卡面验收 4 条全部达成，
但以下事项与卡面文字或直觉预期存在偏差，逐条列证。

---

## 一、`seed.ts` 实为 2 行改动，非「只加一行引入」的字面读法

- 卡面原文：「放在独立模块 `apps/web/prisma/seed/pricing-tiers.ts`，由 `seed.ts` 只加一行引入」。
- 实际改动（共 2 行，均在 `apps/web/prisma/seed.ts`）：
  1. L5 区块新增 `import { applyPricingTiers } from './seed/pricing-tiers'`；
  2. `monitoringSources` upsert 之后新增 `await applyPricingTiers(prisma)`。
- 偏差理由：只 import 不调用等于未接线（DEF-011-01 的教训正是「有脚本无入口」）。卡面「只加一行引入」
  的约束意图是**禁止把分层逻辑写进 seed.ts 主流程**，该意图已满足——`seed.ts` 内不含任何分层规则、
  价格数值、币种或汇率计算。
- 若后续评审要求严格到「调用也必须在模块内自注册」，需改 seed 框架，属越界，本卡不做。

## 二、幂等的边界：行集合确定，`effectiveFrom` 随时间变

- 已确定：行数、各模型价、币种、单位、`originalCurrency`、`exchangeRate`、`notes`、促销窗口
  `[from, until)`、`isCurrent` 分布。第 3/4 次 seed 输出逐字一致。
- 不确定：`effectiveFrom` 取执行时刻 `now`。这是语义必需——新价必须自写入时刻起生效，才能被
  `/pricing`（`effectiveFrom <= now`）与 `resolveEffectivePrice` 选中；写死一个历史时刻会使「重建当日
  之后的促销/调价验证」失真。
- 后果：跨天重跑会改该列的值，但**不改变任何可观测读数**（120 窗口、免费/付费/促销计数、原币计数均不变）。
  若验收方按「整行 byte 级一致」判幂等，本条即不满足，需裁决。

## 三、e2e 首跑失败（exit=1）的根因是取证环境，非 seed

- 现象：`pnpm test:e2e -g "promotion|pricing"` → 1 failed / 1 did not run / 2 passed；
  失败点 `e2e/tests/promotion-billing.spec.ts:172`，响应体
  `{"code":30003,"message":"网关全部候选失败: 上游 404: Not Found"}`，期望 200 实得 400。
- 判读过程（两步排除）：
  1. 返回 **400 而非 402**（余额不足），证明「归一价 0 → 免费、跳过余额校验」的 U-23 分支已放行；
     失败发生在放行之后的上游调用段。
  2. 该 spec 用 `MODEL_CODE = "claude-3-7-sonnet"`（curated 模型，`seed.ts modelsData`），
     与 `demo-model-*` 演示行无交集；且 `beforeAll` 自建促销窗口、自清理 `notes` 前缀行。
     → 与价格分层 seed 无因果。
- 真因：`apps/web/app/api/v1/mock-upstream/[...path]/route.ts:27` 要求 `AIDEAN_ENABLE_MOCK_UPSTREAM=1`，
  否则直接 404；本次取证用的 dev server 启动时未带该变量，Mock 站（`http://localhost:3000/api/v1/mock-upstream`）
  因此不可用，网关降级链全部失败。
- 处置：**未改任何 e2e 文件**（符合卡面「优先回退 seed 配比；只有确认断言依赖『全免费』错误前提才改 e2e」），
  改为带变量重启 dev server 后复跑 → 4 passed。复跑前另做独立探针确认 mock 路由返回 200。
- 残留约定：任何跑 e2e 的 dev server 必须带 `AIDEAN_ENABLE_MOCK_UPSTREAM=1`；本卡把该条写进
  `verify.txt` 环境行，供后续卡沿用。

## 四、`node_modules` 空壳事故（环境面，本卡第 2 次复现，非代码缺陷）

- 现象：`node_modules/.pnpm/next@15.0.0_.../node_modules/next` 目录存在但 **条目数 0**（`package.json`
  与 `dist/pages/_app.js` 均不存在），`next dev` 崩于 `Cannot find module 'next/dist/pages/_app'`。
- 与既有台账的关系：本现象是仓内已建档、至少五次复现的同类环境病（《开发环境搭建》v1.4 §五、
  `EVD-B11-01/deviation.md` §五「pnpm 包目录被清空」，受损面曾达 52/818 包）。诱因记为
  「`node_modules` 被外部复制/压缩/清理后硬链接失效」，触发者**待确认**。
- 本卡处置（共 3 次 install 记录，按时间序）：
  1. 首次发现 → `pnpm install --frozen-lockfile --prefer-offline` → **exit=1**，postinstall
     `prisma generate` 期间 `pnpm add @prisma/client@6.19.3` 失败，连带 `@prisma/client` 变空壳；
  2. 按台账既有修复口径 → `pnpm install --frozen-lockfile --force --prefer-offline
     --config.confirm-modules-purge=false` → exit=0（`reused 818, downloaded 0, added 818`，
     `Generated Prisma Client (v6.19.3)`）；
  3. 本卡收尾阶段再次复现同一空壳（next 包条目数 0，同一条报错），同一条命令复跑 → exit=0，
     `next` 包恢复为 6724 个文件（`dist/pages/_app.js` 存在），本轮取证全部在修复后重跑。
- 对证据的影响：第 1 次修复后取得的 tsc/vitest 读数曾出现于修复前的依赖树；**本文件所载 tsc/vitest/e2e
  读数全部为第 3 次修复后的重跑结果**，不引用旧帧。
- `pnpm-lock.yaml` 状态：`git status` 显示为 M，但 `git diff -- pnpm-lock.yaml` **无任何内容差异**
  （仅 `LF will be replaced by CRLF` 的行尾警告）→ 三次 install 均未引入依赖变更，未越出白名单。

## 五、分层配比的两次调整（结果是 120 窗口决定的，不是先验拍定）

- v1：`FREE_TIER_MAX=20`、`CNY_TIER_MAX=60`（即 CNY 付费层 40 个）→ 120 窗口读数
  `free=47, usdPaid=11, cnyPaid=62`。USD 付费样本仅 11 条，接近「看不见」。
- 成因：`/pricing` 以**归一后** `priceInput asc` 排序。CNY 行（per_1k → 归一 ×1000）数值普遍小于 USD 行，
  叠加 curated 22 条 CNY 有价行，USD 层被整体挤出窗口。
- v2（定稿）：`CNY_TIER_MAX=40`（CNY 付费层 20 个）→ `free=47, usdPaid=31, cnyPaid=42`。
  两类付费样本与两类促销样本（折扣 / 限时免费）均稳定落在 120 行内。
- 该常量语义为「序号上界（含）」，注释已就地写明 `021–040 共 20 个`，避免把 40 误读为 40 个模型。

## 六、`originalCurrency` 当前无读侧消费方（本卡只做契约维度对齐）

- 全仓检索：`originalCurrency` 仅出现在 `schema.prisma`、迁移 SQL、数据库基线文档与本次新增的
  seed 模块中，**无任何读取方**。
- 读侧真实口径：`lib/features/pricing/effective-price.ts` 的 `normalizePriceRow` 取
  `sourceCurrency = billingCurrency`；`/pricing` 的「官方 $0.050」注记亦来自 `billingCurrency` 与
  `sourceType`，与 `originalCurrency` 无关。
- 因此本卡交付的是**契约字段的维度齐备**（`currency / unit / fxRate / fxDate` 四元组可查），
  不承诺 UI 上出现「原币 CNY、记账 USD」的专门标注。若后续要求前台显式展示跨币种来源，
  属读侧改造（不在本卡白名单）。

## 七、未验证项（一律标「待确认」，不得读作通过）

1. **生产构建路径未跑**：本卡不触碰生产代码（仅 seed 与规划文档），`next build` 未执行；
   生产侧「seed 与生产路径分开」的口径由 B11-07 承担，本卡不做合流验证。
2. **跨天幂等未实测**：未把系统时间推到次日验证 `effectiveFrom` 变化后的可观测等价性；
   上文 §二 的结论来自代码推演（该列不参与任何排序或过滤比较，仅作 `<= now` 门槛）。
3. **curated 27 条零价行的来源未复核**：`free=47` 中 20 条来自本模块、27 条来自 `seed.ts` 既有数据；
   后者是否应保持全零不在本卡范围（B11-02 只负责演示模型侧分层）。
4. **`next` 包空壳的触发者未定位**：三次 install 均修好当下状态，但未找到清空者；
   与 `EVD-B11-01` §六 的结论一致，只能给「已排除项」，不能给根因。
5. **`pnpm store status` 未跑**：本轮未按 `scripts/check-gates.ps1` 的 `store-check` 单项复核 store 层
   一致性；若后续门禁要求，需补跑 `pnpm gates`。

## 八、复现方式

本目录随附两份探针副本（`.scratch/` 被 `.gitignore:49` 排除，不入版控）：

- `probe-db.mjs`：DB 侧计数 + `/pricing` 120 行窗口模拟（等价查询，不启动 web 进程）。
- `probe-runtime.mjs`：运行态 SSR 抓取（`cf-ipcountry: CN / US`），统计 pending / 原币注记 / 促销徽标
  / 划线价与逐行文本样本。

运行前提：`apps/web/.env` 或 `.env.local` 的 `DATABASE_URL` 指向已完成 `pnpm --filter web db:seed`
与 `pnpm crawl:fx` 的库；运行态探针另需 `:3000` 上带 `AIDEAN_ENABLE_MOCK_UPSTREAM=1` 的 dev server。

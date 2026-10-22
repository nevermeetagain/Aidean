B11-07 偏差与未验证项（deviation）
版本: v0.11.0-b11-07 | 更新: 2026-10-22 | 变更: 初始条目（快照首跑 + 供给覆盖 + 入口接线）

──────────────────────────────────────────────
§一【需裁决】验收③的字面口径与「不伪造合规状态」冲突

事实：
1. 卡面验收③原文：「至少 20 个模型的详情页 `offerings-*` 由 `offerings-empty` 变为 `offerings-ready/有行`」。
   `offerings-*` 是 `components/models/ModelOfferings.tsx` 的 data-testid 前缀，该组件读
   `GET /api/v1/models/[id]/offerings`，数据源是 `provider_model_observations`（多源上架观测），
   **不是** `provider_model_offering`（人工维护的「平台挂载与折扣价」）。
2. 本次交付让 `provider_model_offering` 覆盖 25 个演示模型（openrouter:20 + siliconflow:5），
   详情页「平台挂载与折扣价」区块已出现行（RUNTIME 证据见 verify.txt 验收③A）。
3. 观测侧 API 仍返回 `items=0`，两重根因：
   ① 五源 `tosStatus='pending'`。seed.ts L1217 明确契约：「pending=未核验，仅后台可见、禁止对外展示」，
      由 U-M6 裁决后人工改；`lib/monitoring/offerings.ts` 按 `PUBLIC_TOS_STATUSES={allowed,attribution_required}` 过滤。
   ② 观测 `normalizedModelId` 与 `aiModel.modelCode` 去重命中 12 个（gpt-4o/gpt-4o-mini/o1/o3-mini/phi-4/
      qwen-plus/qwen-max/minimax-01/bge-m3/text-embedding-3-large/-small/bge-reranker-v2-m3），
      与 demo-model-041…060 **零交集**——演示模型没有任何上游观测可展示。

为什么不自行消除：
- 把 tosStatus 改成 allowed 等于代替法务/运营作出「已核验」结论，属于伪造合规状态；
  且 seed.ts 注释与 U-M6 裁决保留意见均要求后台人工改，重跑 seed 都不覆盖该字段。
- 给 demo 模型伪造上游观测（写 observations）会污染真实采集链路，违反「生产路径不写假数据」。

请裁决（二选一或另定）：
A. 接受「人工挂载侧有行」作为验收③的实质达标，把卡面措辞改为指向 `provider_model_offering`（推荐：
   卡面意图是「详情页不再恒空」，该意图已达成；观测口径是 TASK-067 的能力，不属于 B11-07 的 seed 范围）。
B. 由人工完成 U-M6 裁决并在后台把 openrouter/quanzil 的 tosStatus 置为 allowed/attribution_required，
   届时观测侧对上述 12 个 curated 模型 ready；demo 模型仍无观测（需另立「演示模型映射上游」卡）。
无论哪种，均不改变本次已交付的 25 个模型 offerings 事实。

──────────────────────────────────────────────
§二 monitor_catalogs 缺 DATABASE_URL 的兜底（新增 19 行）

改动前取证：
- `scripts/crawl/monitor_catalogs.ts` L246 `if (!process.env.DATABASE_URL) throw ...`；脚本无 dotenv 加载。
- `fx_daily.ts` 同样无 dotenv，靠 Prisma Client 自身加载 `.env`；但 monitor 在动态 import Prisma 之前
  就硬检查变量，因此 `pnpm --filter web crawl:monitor`（cwd=apps/web）在干净会话必然失败。
- 调度路径（`script-executor.ts` spawn tsx，继承 web 进程 env）本就有 DATABASE_URL，不受影响；
  `scheduledScriptsData` 目前只有 crawl_models/crawl_llmtest/fx_daily 三条，未注册 monitor。

改动：
```ts
function hydrateDatabaseUrlFromEnvFile(): void {
  if (process.env.DATABASE_URL) return;                       // 只补空缺，不覆盖已注入值
  const candidates = [resolve(cwd, ".env"), resolve(cwd, "apps/web/.env")];
  // 正则只取 DATABASE_URL 一行，不解析其他键、不执行 dotenv 语义
}
```
与 e2e `promotion-billing.spec.ts` 的 `databaseUrl()` 同口径（同样是读 .env 的这一行）。
验证：干净会话 `PRE_DBURL_EMPTY=True` → dry-run 单源 exit 0（verify.txt「入口」节）。

剩余风险：该函数不做 `export DATABASE_URL=...` / 引号嵌套等 dotenv 全语法解析；若 .env 使用
`export` 前缀会读不到（当前 apps/web/.env 为裸 `KEY=value`，实测通过）。

──────────────────────────────────────────────
§三 offerings-coverage 的 aligned=5 每轮重现（不是不幂等）

现象：每次 `db:seed` 都输出 `aligned=5`，而非首跑 5、再跑 0。
根因：`seed.ts` 6.y（L1176-1210）每轮先按固定公式 `priceInput = 10 + i*2` upsert siliconflow 示例
offering（update 含 priceInput/priceOutput），随后 `applyPricingTiers` 改 ModelPrice，最后
`applyOfferingCoverage` 对齐价格 → 每轮都产生 5 次「重置→对齐」。
判定：**最终态幂等**——seed 结束后探针 `priceMismatches=0`、`distinctModels=25`、25 行价格与
ModelPrice 逐值相等；连续两次 seed 后读数一致。中间态的重置不影响任何验收读数。
未改 6.y 的原因：seed.ts 白名单口径是「引入行」，改 6.y 属扩大改动面；且 6.y 是既有多卡共享代码，
改价格公式可能影响其它卡的证据。已在模块头注释写明该行为。

──────────────────────────────────────────────
§四 真实上架链路（TASK-068）的两处断点（本次未接线，仅证据）

1. 源→提供商映射为空：五源 `mappedEntityType=null / mappedEntityId=null` → `resolveSourceProvider`
   返回 null → `syncOfferingsForSource` 返回 `status='unmapped'`，不写 offering、不写 candidate。
   这是 U-24=A 要求的人工配置（uuid 列只存平台实体 id），不能由 seed 猜。
2. 即便完成映射，本次观测与 demo 模型零交集，只会给 12 个 curated 模型写 offering；
   演示模型的 offerings 仍只能来自 seed（即本模块）。

结论：`discoveryCandidates=0` 是「未接线」而非「无候选」——观测 1024 条中有 1000+ 条未命中模型，
一旦映射就会批量落候选，需人工审。已在 verify.txt 记 `directHit` 口径（12 个去重模型 / 25 条观测）。

──────────────────────────────────────────────
§五 aihubmix 不可达的类别

`fetch failed`（Node fetch 网络层错误），非 HTTP 4xx/5xx，也非 credential_missing。
五源 `authRequired=false`（V0.4.0 外部来源核验结论：本批 5 源无凭证可访问），故无「缺凭证」类别。
未做重试/超时调优（采集器既有 30s 超时）；单源失败不影响他源，exit 0 为「部分成功」语义。
EVD 按实况记 network 类；`lastError` 截断 2000 字符由既有 markSource 处理。

──────────────────────────────────────────────
§六 未验证项（一律「待确认」）

1. 观测侧 `offerings-ready`：需 U-M6 裁决 tosStatus 后复验（§一）。
2. admin 变更流的「查看证据 →」链接目标页：本次只验证列表与分页行，未点击进入证据详情。
3. `/admin/monitoring` 的「手动运行」按钮：未点击（会触发真实采集，属写操作）；调度路径未验证。
4. 生产/CI 环境的 crawl:monitor：仅本地 dev 库验证；容器内 cwd/权限未验证。
5. 采集器对 quanzil/openrouter 的 rawBytes 上限（CATALOG_MAX_BYTES）与截断告警：本次两条数据均未触顶。
6. 未跑 e2e 全量（本卡无 UI/读侧改动；详情页已用 HTTP 抓取核验，非 Playwright 断言）。
7. `ProviderModelOffering.effectiveFrom` 在 6.y 的 siliconflow 行仍是 2025-01-01（人工所有字段，未覆盖），
   与本模块新建行的 2026-10-22 日界不同——属字段所有权约定，非偏差，记录备查。

──────────────────────────────────────────────
§七 复现方式

```powershell
cd <repo root>
# 1) 采集首跑（写库；干净会话会自动读 apps/web/.env）
pnpm --filter web crawl:monitor --source all          # 期望 2 ok / 1 failed(aihubmix)
# 2) 供给覆盖 + 价格同源
pnpm --filter web db:seed                             # 期望 [offerings-coverage] ... aligned=5 distinctModels=25
# 3) DB 计数
node .scratch/b1107-probe.mjs > .scratch/b1107-final.txt
# 4) 运行态
node .scratch/b1107-runtime.mjs demo-model-041 demo-model-060
pnpm exec playwright test --project=admin-setup       # 会话过期时先重建
node .scratch/b1107-admin.mjs
# 5) 观测侧现状（预期 items=0，见 §一）
node .scratch/b1107-obs-api.mjs
```

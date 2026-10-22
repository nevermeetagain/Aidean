// /pricing —— 价格中心（Task 2.4 价格三段骨架 + pricing 读侧接线，方案 A 单文件）。
// 三锚区块：#gateway-pricing 网关 Token 单价 / #recharge-tiers 余额充值档位 / #product-tiers 产品权益价格。
// 读侧契约（B-N9）：Server Component 直读 system_configs 的 pricing.* 两键（复用 GET /admin/configs
// 「缺行回退默认值」投影口径），经 parsePricingConfig 强类型化后渲染；任何异常/缺行回退 seed 真源默认（¥2 / CNY）。
// 2026-09-23 补齐：原「网关 Token 单价」表为硬编码占位骨架（全 ————），现改为读 model_prices（isCurrent）
// TASK-029（2026-10-19）：改读生效价（窗口内限时优惠优先），优惠行显示徽标 + 原价划线（契约⑥前台价格徽标）
// 真实上游官方单价，单位为每百万 Tokens。
// TASK-053（U-15 / ADR-P005 v0.3）：主价列按访问者展示币种（中国大陆 IP → ¥，其他 → $，TASK-102 x-display-currency）
// 显示 EffectivePrice 的归一价（priceInput/priceOutput，已按当日汇率快照换算为 currency / 每百万 Token）；
// 源币种 ≠ 展示币种时以次级文字并列「官方 原币原价 / M」（sourceCurrency/sourcePriceInput），不隐藏原价；
// 不可归一（缺当日汇率等，toEffectivePriceDto → null）显示「价格待核」，绝不显示 0 或未换算的原值。
import { PagePlaceholder } from "../../../components/common/PagePlaceholder";
import { prisma } from "../../../lib/db/prisma";
import { getRequestDisplayCurrency } from "../../../lib/currency/server";
import { getDailyFx } from "../../../lib/features/pricing/fx";
import { needsFx, pickEffectivePrice, toEffectivePriceDto } from "../../../lib/features/pricing/effective-price";
import { PriceTag, PromoBadge, formatPriceValue } from "../../../components/common/PriceTag";
import {
  CURRENCY_SYMBOLS,
  type EffectivePrice,
  type SupportedCurrency,
  PRICING_CONFIG_KEYS,
  RECHARGE_TIERS,
  formatEvalPrice,
  parsePricingConfig,
} from "@aidean/shared";

// 缓存策略：TASK-053 起主价按请求的展示币种（读请求头）渲染，页面必须按请求动态生成——
// 若沿用 ISR（原 revalidate=300），首个访问者的币种会被缓存给所有地区，违反 U-15。
// 价格本身仍是当日快照（同一天全站同一汇率），后台 pricing.* 保存的 revalidatePath("/pricing") 保持无害。
export const dynamic = "force-dynamic";

type BadgeTone = "success" | "secondary" | "muted";

const BADGE_CLS: Record<BadgeTone, string> = {
  success: "bg-emerald-100 text-emerald-700",
  secondary: "bg-[var(--muted)] text-foreground",
  muted: "border border-[var(--border)] bg-transparent text-slate-500",
};

/** 网关单价表列（2026-09-23：移除「计费倍率」——markupRate/tokenMultiplier 属 per-API 站点
 *  station_billing_rules 配置，非模型级属性，混进模型单价表会误导；改由模型详情/控制台呈现）*/
const GATEWAY_COLUMNS = ["模型", "厂商", "输入单价", "输出单价"] as const;

/** 单页最多渲染的价目行数（防渲染膨胀；当前在售 78 条模型价格，全量落在上限内） */
const PRICE_ROW_LIMIT = 120;

interface GatewayPriceRow {
  key: string;
  name: string;
  slug: string;
  vendor: string;
  /** 归一后的生效价 DTO（currency=展示币种 / 每百万 Token）；null = 不可归一 → 「价格待核」 */
  price: EffectivePrice | null;
}

interface GatewayPrices {
  rows: GatewayPriceRow[];
  /** 本页实际使用的当日汇率（无跨币种行时为 null） */
  fx: { date: string; usdCny: string; stale: boolean } | null;
}

/**
 * 网关单价：当前价（isCurrent、非 PROMOTION、PER_TOKEN）+ 同批模型窗口内的限时优惠 → pickEffectivePrice 收敛为生效价，
 * 再经 toEffectivePriceDto（与 resolveEffectivePrice/网关同一归一函数）换算到展示币种。固定查询数，不随模型数 N+1；
 * 汇率整页只取一次（getDailyFx，同一汇率日全站同一值）。
 * review-029 S5：优惠查询失败只降级为当前价表（不整体走空态）。
 */
async function loadGatewayPrices(currency: SupportedCurrency, at: Date = new Date()): Promise<GatewayPrices> {
  try {
    const currentSelect = {
      modelId: true,
      priceInput: true,
      priceOutput: true,
      priceCache: true,
      billingCurrency: true,
      billingUnit: true,
      isCurrent: true,
      sourceType: true,
      effectiveFrom: true,
      effectiveUntil: true,
      model: { select: { nameDisplay: true, slug: true, vendor: { select: { name: true } } } },
    } as const;
    const promoSelect = {
      modelId: true,
      priceInput: true,
      priceOutput: true,
      priceCache: true,
      billingCurrency: true,
      billingUnit: true,
      isCurrent: true,
      sourceType: true,
      effectiveFrom: true,
      effectiveUntil: true,
    } as const;

    // 窗口内优惠的模型必须上表（否则「按输入价取前 N 条」会把优惠模型挤出，徽标无处展示）；失败 → 按无优惠降级
    let activePromoModelIds: string[] = [];
    try {
      activePromoModelIds = (
        await prisma.modelPrice.findMany({
          where: { sourceType: "PROMOTION", effectiveFrom: { lte: at }, effectiveUntil: { gt: at } },
          select: { modelId: true },
          distinct: ["modelId"],
        })
      ).map((r) => r.modelId);
    } catch (error) {
      console.error("[pricing] 优惠模型查询失败，降级为当前价表：", error);
    }
    const promoCurrent = activePromoModelIds.length
      ? await prisma.modelPrice.findMany({
          where: { isCurrent: true, billingMode: "PER_TOKEN", sourceType: { not: "PROMOTION" }, modelId: { in: activePromoModelIds } },
          select: currentSelect,
        })
      : [];
    const topCurrent = await prisma.modelPrice.findMany({
      where: { isCurrent: true, billingMode: "PER_TOKEN", sourceType: { not: "PROMOTION" }, modelId: { notIn: activePromoModelIds } },
      select: currentSelect,
      orderBy: [{ priceInput: "asc" }, { priceOutput: "asc" }],
      take: Math.max(0, PRICE_ROW_LIMIT - promoCurrent.length),
    });
    const current = [...promoCurrent, ...topCurrent];
    if (current.length === 0) return { rows: [], fx: null };

    let promos: Array<{ modelId: string } & Record<string, unknown>> = [];
    if (activePromoModelIds.length) {
      try {
        promos = await prisma.modelPrice.findMany({
          where: {
            modelId: { in: current.map((r) => r.modelId) },
            sourceType: "PROMOTION",
            effectiveFrom: { lte: at },
            effectiveUntil: { gt: at },
          },
          select: promoSelect,
        });
      } catch (error) {
        console.error("[pricing] 优惠价查询失败，降级为当前价表：", error);
        promos = [];
      }
    }
    const promosByModel = new Map<string, typeof promos>();
    for (const p of promos) promosByModel.set(p.modelId, [...(promosByModel.get(p.modelId) ?? []), p]);

    const picks = current.map((r) => {
      const candidates = [r, ...(promosByModel.get(r.modelId) ?? [])] as Parameters<typeof pickEffectivePrice>[0];
      return { r, picked: pickEffectivePrice(candidates, at) ?? { effective: r, base: null, isPromotion: false } };
    });
    const involved = picks.flatMap(({ picked }) => (picked.base ? [picked.effective, picked.base] : [picked.effective]));
    // 汇率读取失败按缺汇率处理（跨币种行 fail-closed 为「价格待核」，同币种行不受影响）
    const daily = needsFx(involved, currency) ? await getDailyFx(at).catch(() => null) : null;

    const rows: GatewayPriceRow[] = picks.map(({ r, picked }) => ({
      key: `${r.model.slug}:${r.billingCurrency}`,
      name: r.model.nameDisplay,
      slug: r.model.slug,
      vendor: r.model.vendor?.name ?? "—",
      price: toEffectivePriceDto(r.modelId, picked, currency, daily),
    }));
    // 优惠中的模型置顶（运营可见性），其余按展示币种归一价升序；价格待核行沉底
    const key = (x: GatewayPriceRow) => (x.price ? Number(x.price.priceInput) : Number.POSITIVE_INFINITY);
    rows.sort(
      (a, b) =>
        Number(b.price?.isPromotion ?? false) - Number(a.price?.isPromotion ?? false) ||
        key(a) - key(b) ||
        (a.price && b.price ? Number(a.price.priceOutput) - Number(b.price.priceOutput) : 0),
    );
    return { rows, fx: daily ? { date: daily.date, usdCny: daily.usdCny, stale: daily.stale } : null };
  } catch {
    // 读库异常不阻首屏：表格转为「数据整理中」空态，不编造价格
    return { rows: [], fx: null };
  }
}

/** 次级注记：源币种 ≠ 展示币种时并列官方原币原价（不隐藏原价） */
function SourcePriceNote({ price, which }: { price: EffectivePrice; which: "input" | "output" }) {
  if (!price.sourceCurrency || price.sourceCurrency === price.currency) return null;
  const raw = which === "input" ? price.sourcePriceInput : price.sourcePriceOutput;
  // 原价为 0（免费）时主价已显示「免费」，不再重复注记
  if (raw === null || raw === undefined || Number(raw) === 0) return null;
  const unit = price.sourceUnit && price.sourceUnit !== "per_million_tokens" && price.sourceUnit !== "per_1m_tokens" ? SOURCE_UNIT_LABEL[price.sourceUnit] ?? `/${price.sourceUnit}` : "/M";
  return (
    <span data-testid="price-source-note" className="block text-[11px] text-slate-500">
      官方 {formatPriceValue(raw, price.sourceCurrency)} {unit}
    </span>
  );
}

const SOURCE_UNIT_LABEL: Record<string, string> = { per_1k_tokens: "/K", per_token: "/Token" };

/** 价格待核（不可归一：缺当日汇率 / 未知币种或单位）——绝不显示 0 */
function PricePending() {
  return (
    <span data-testid="price-pending" className="text-xs text-amber-700" title="当日汇率快照缺失或价格无法归一，待核实后展示">
      价格待核
    </span>
  );
}

/** 单价单元（表格列与移动端卡片共用）：生效价 + 优惠原价划线 + 源币种注记；不可归一显示「价格待核」 */
function PriceCell({
  price,
  which,
  displayCurrency,
  align,
}: {
  price: EffectivePrice | null;
  which: "input" | "output";
  displayCurrency: SupportedCurrency;
  align: "start" | "end";
}) {
  if (!price) return <PricePending />;
  return (
    <>
      <PriceTag
        value={which === "input" ? price.priceInput : price.priceOutput}
        currency={price.currency ?? displayCurrency}
        isPromotion={price.isPromotion}
        basePrice={which === "input" ? price.basePriceInput : price.basePriceOutput}
        showBadge={false}
        align={align}
      />
      <SourcePriceNote price={price} which={which} />
    </>
  );
}

/** 读 system_configs 的 pricing.* 两键（与 GET /admin/configs 同口径：缺行/异常回退默认） */
async function loadPricingConfig() {
  try {
    const rows = await prisma.systemConfig.findMany({
      where: { configKey: { in: [...Object.values(PRICING_CONFIG_KEYS)] } },
      select: { configKey: true, configValue: true },
    });
    const byKey = new Map(rows.map((r) => [r.configKey, r.configValue]));
    return parsePricingConfig({
      evalPerModel: byKey.get(PRICING_CONFIG_KEYS.evalPerModel),
      currency: byKey.get(PRICING_CONFIG_KEYS.currency),
    });
  } catch {
    // 读库任何异常不阻首屏：回退 seed 真源默认（2 元 / CNY）
    return parsePricingConfig();
  }
}

export default async function PricingPage() {
  const displayCurrency = await getRequestDisplayCurrency();
  const [pricing, gateway] = await Promise.all([loadPricingConfig(), loadGatewayPrices(displayCurrency)]);
  const gatewayPrices = gateway.rows;
  const symbol = CURRENCY_SYMBOLS[pricing.currency];
  const displaySymbol = CURRENCY_SYMBOLS[displayCurrency];
  return (
    <PagePlaceholder
      title="价格"
      description="网关 Token 单价、余额充值档位与产品权益价格在此一页看全；展示价与各平台官方价一致，平台不做隐性加价。"
    >
      <div className="space-y-16">
        {/* 一、网关 Token 单价 */}
        <section id="gateway-pricing">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold text-foreground">网关 Token 单价</h2>
            <p className="text-xs text-slate-500 md:text-sm">展示价与各平台官方价一致</p>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            下表为当前在售模型的上游官方单价，统一按 <span data-testid="display-currency">{displaySymbol} / 百万 Tokens</span>{" "}
            展示（按访问地区：中国大陆显示人民币，其他地区显示美元）；源币种不同的行并列官方原币原价。按官方单价与实际
            Token 用量计费，按账户余额币种结算，明细在用量页可查。
          </p>

          {gatewayPrices.length > 0 ? (
            <>
              {/* UX-05：手机（<768）卡片式——每条一张卡：模型名/厂商 + 输入/输出两价并列，首屏即见价格，无需横滑 */}
              <ul
                data-testid="gateway-price-cards"
                aria-label="网关 Token 单价"
                className="mt-6 max-h-[70vh] divide-y divide-[var(--border)] overflow-y-auto rounded-lg border border-[var(--border)] md:hidden"
              >
                {gatewayPrices.map((row) => {
                  const p = row.price;
                  const free = !!p && Number(p.priceInput) <= 0 && Number(p.priceOutput) <= 0;
                  return (
                    <li key={row.key} data-testid="gateway-price-card" className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <a href={`/models/${row.slug}`} className="text-sm font-medium text-foreground transition-colors hover:text-primary">
                          {row.name}
                        </a>
                        {p?.isPromotion ? <PromoBadge free={free} endsAt={p.promotionEndsAt} /> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{row.vendor}</p>
                      <dl className="mt-2 grid grid-cols-2 gap-3 text-sm text-slate-600">
                        {(["input", "output"] as const).map((which) => (
                          <div key={which} className="min-w-0">
                            <dt className="text-xs text-slate-500">{which === "input" ? "输入单价" : "输出单价"}</dt>
                            <dd className="mt-0.5">
                              <PriceCell price={p} which={which} displayCurrency={displayCurrency} align="start" />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6 hidden max-h-[560px] overflow-auto rounded-lg border border-[var(--border)] md:block">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)] text-left">
                      {GATEWAY_COLUMNS.map((col) => (
                        <th
                          key={col}
                          scope="col"
                          className={
                            col === "模型" || col === "厂商"
                              ? "h-10 bg-[var(--muted)] px-4 font-medium text-slate-500"
                              : "h-10 bg-[var(--muted)] px-4 text-right font-medium text-slate-500"
                          }
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gatewayPrices.map((row) => {
                      const p = row.price;
                      const free = !!p && Number(p.priceInput) <= 0 && Number(p.priceOutput) <= 0;
                      return (
                        <tr key={row.key} data-testid="gateway-price-row" className="border-b border-[var(--border)] last:border-0">
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            <div className="flex flex-wrap items-center gap-2">
                              <a href={`/models/${row.slug}`} className="transition-colors hover:text-primary">
                                {row.name}
                              </a>
                              {p?.isPromotion ? <PromoBadge free={free} endsAt={p.promotionEndsAt} /> : null}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{row.vendor}</td>
                          {(["input", "output"] as const).map((which) => (
                            <td key={which} className="px-4 py-2.5 text-right text-slate-600">
                              <PriceCell price={p} which={which} displayCurrency={displayCurrency} align="end" />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                共 {gatewayPrices.length} 条在售单价；主价为 {displaySymbol} / 百万 Tokens，平台不加价。
                {gateway.fx ? (
                  <span data-testid="fx-note">
                    {" "}跨币种按当日汇率 1 USD = {gateway.fx.usdCny} CNY（{gateway.fx.date}
                    {gateway.fx.stale ? "，当日快照未到，沿用最近一日" : ""}，每日一次）换算。
                  </span>
                ) : null}
              </p>
            </>
          ) : (
            <p className="mt-6 rounded-lg border border-dashed border-[var(--border)] px-6 py-10 text-center text-sm text-slate-500">
              单价数据整理中，请以模型详情页与控制台实时展示为准。
            </p>
          )}

          <p className="mt-3 text-sm text-slate-500">
            付费测评单价：<span className="font-semibold text-foreground">{formatEvalPrice(pricing.evalPerModel, pricing.currency)}</span> / 模型 / 次
          </p>
        </section>

        {/* 二、余额充值档位 */}
        <section id="recharge-tiers">
          <h2 className="text-xl font-bold text-foreground">余额充值档位</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            一次充值，全网关通用；充值到账为通用余额，可用于所有模型与云服务调用。
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            <span aria-hidden="true">⚠</span>
            当前仅支持兑换码充值，在线支付入口暂未开放
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {RECHARGE_TIERS.map((tier) => {
              const amount = Number(tier.amountMinor) / 100;
              return (
                <li
                  key={tier.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 text-center shadow-sm transition-shadow hover:shadow-md"
                >
                  <p className="text-xs text-slate-400">{tier.label}档位</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-primary">
                    {symbol}
                    {amount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">到账同等余额</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 三、产品权益价格 */}
        <section id="product-tiers">
          <h2 className="text-xl font-bold text-foreground">产品权益价格</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            产品订阅与权益分级独立于网关余额计费，各产品价格框架如下。
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">独立知识百科（AideanWiki）</h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLS.success}`}
                >
                  已上线
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                知识库个人版免费可用；团队版权益与定价明细整理中，发布后将支持按知识库数量与解析量分档。
              </p>
            </article>

            <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">信源引擎机器人（AideanBot）</h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLS.secondary}`}
                >
                  开发中
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                普通用户仅文字版解析；图文 / 视频 / 音频解析需 Pro 及以上套餐解锁。
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-500">
                <li>· 基础版（文字版解析）价格待定</li>
                <li>· Pro 及以上套餐解锁图文 / 视频 / 音频多模态解析</li>
              </ul>
            </article>
          </div>
        </section>
      </div>
    </PagePlaceholder>
  );
}

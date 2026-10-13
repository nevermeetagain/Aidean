// /pricing —— 价格中心（Task 2.4 价格三段骨架 + pricing 读侧接线，方案 A 单文件）。
// 三锚区块：#gateway-pricing 网关 Token 单价 / #recharge-tiers 余额充值档位 / #product-tiers 产品权益价格。
// 读侧契约（B-N9）：Server Component 直读 system_configs 的 pricing.* 两键（复用 GET /admin/configs
// 「缺行回退默认值」投影口径），经 parsePricingConfig 强类型化后渲染；任何异常/缺行回退 seed 真源默认（¥2 / CNY）。
// 2026-09-23 补齐：原「网关 Token 单价」表为硬编码占位骨架（全 ————），现改为读 model_prices（isCurrent）
// 真实上游官方单价；单价按行内 billing_currency 标注符号（CNY→¥ / USD→$），单位为每百万 Tokens。
import { PagePlaceholder } from "../../../components/common/PagePlaceholder";
import { prisma } from "../../../lib/db/prisma";
import {
  CURRENCY_SYMBOLS,
  PRICING_CONFIG_KEYS,
  formatEvalPrice,
  parsePricingConfig,
  type PricingCurrency,
} from "@aidean/shared";

// 缓存策略（2026-09-23 性能改造）：原 force-dynamic 每次进入都完整 SSR 且无法被 Link 预取。
// 改 ISR 后需配套后台保存失效——pricing.* 两键保存已补 revalidatePath("/pricing")
// （见 app/api/v1/admin/configs/route.ts）。
export const revalidate = 300;

type BadgeTone = "success" | "secondary" | "muted";

const BADGE_CLS: Record<BadgeTone, string> = {
  success: "bg-emerald-100 text-emerald-700",
  secondary: "bg-[var(--muted)] text-foreground",
  muted: "border border-[var(--border)] bg-transparent text-slate-500",
};

/** 充值五档金额（元）；货币符号由 pricing.currency 读侧决定，不硬编码 ¥ */
const RECHARGE_TIER_AMOUNTS = [10, 55, 115, 600, 2500] as const;

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
  priceInput: number;
  priceOutput: number;
  currency: string;
}

/** 上游官方单价：取 model_prices 当前价（isCurrent），仅按 Token 计费（PER_TOKEN）的行 */
async function loadGatewayPrices(): Promise<GatewayPriceRow[]> {
  try {
    const rows = await prisma.modelPrice.findMany({
      where: { isCurrent: true, billingMode: "PER_TOKEN" },
      select: {
        priceInput: true,
        priceOutput: true,
        billingCurrency: true,
        model: { select: { nameDisplay: true, slug: true, vendor: { select: { name: true } } } },
      },
      orderBy: [{ priceInput: "asc" }, { priceOutput: "asc" }],
      take: PRICE_ROW_LIMIT,
    });
    return rows.map((r) => ({
      key: `${r.model.slug}:${r.billingCurrency}`,
      name: r.model.nameDisplay,
      slug: r.model.slug,
      vendor: r.model.vendor?.name ?? "—",
      priceInput: Number(r.priceInput),
      priceOutput: Number(r.priceOutput),
      currency: r.billingCurrency,
    }));
  } catch {
    // 读库异常不阻首屏：表格转为「数据整理中」空态，不编造价格
    return [];
  }
}

/** 单价展示：0 显示「免费」，否则按量级取 2~4 位小数并前置行内币种符号（非换算） */
function formatUnitPrice(value: number, currency: string): string {
  if (!Number.isFinite(value) || value <= 0) return "免费";
  const symbol = CURRENCY_SYMBOLS[currency as PricingCurrency] ?? "";
  const digits = value >= 1 ? 2 : value >= 0.01 ? 3 : 4;
  return `${symbol}${value.toFixed(digits)}`;
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
  const [pricing, gatewayPrices] = await Promise.all([loadPricingConfig(), loadGatewayPrices()]);
  const symbol = CURRENCY_SYMBOLS[pricing.currency];
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
            下表为当前在售模型的上游官方单价（每百万 Tokens，币种随行内标注）；实际扣费由单价、加价率与 Token
            倍率共同决定，明细在用量页可查。
          </p>

          {gatewayPrices.length > 0 ? (
            <>
              <div className="mt-6 max-h-[560px] overflow-auto rounded-lg border border-[var(--border)]">
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
                    {gatewayPrices.map((row) => (
                      <tr key={row.key} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          <a href={`/models/${row.slug}`} className="transition-colors hover:text-primary">
                            {row.name}
                          </a>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{row.vendor}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                          {formatUnitPrice(row.priceInput, row.currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                          {formatUnitPrice(row.priceOutput, row.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                共 {gatewayPrices.length} 条在售单价；币种符号取自上游原始计价币种，平台不做换算、不加价。
                加价率与 Token 倍率按 API 站点单独配置，见模型详情页与控制台。
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
            {RECHARGE_TIER_AMOUNTS.map((amount) => (
              <li
                key={amount}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 text-center shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="text-xs text-slate-400">充值档位</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-primary">
                  {symbol}
                  {amount}
                </p>
                <p className="mt-1 text-xs text-slate-500">到账同等余额</p>
              </li>
            ))}
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

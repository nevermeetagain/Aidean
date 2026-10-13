// /providers —— 模型服务提供商（数据驱动版）。
import { Fragment } from "react";
// 展示平台级模型聚合商及其模型挂载信息：充值比例、标价、可用倍率、折扣价。
// 内容口径：只陈述站内已有事实，不虚构上游合作关系。
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Gauge, KeyRound, ShieldCheck } from "lucide-react";

import { PagePlaceholder } from "../../../components/common/PagePlaceholder";
import { prisma } from "../../../lib/db/prisma";
import {
  calcDiscountPrice,
  formatListedPrice,
  formatDiscountRange,
  millionToK,
  formatPrice,
  type PriceUnit,
} from "@aidean/shared";

export const metadata: Metadata = {
  title: "模型服务提供商 · Aidean",
  description: "通过 Aidean 统一网关调用多家模型：一个入口管理密钥、配置与用量，价格透明可见。",
};

// 缓存策略（导航性能修复）：本页无任何请求态 API（不读 searchParams/cookies/headers），
// 原 force-dynamic 使 <Link> 无法预取、每次点击进入都完整 SSR + 未缓存的重查询（实测生产导航 ~379ms）。
// 与同级页（about/partners/products/pricing）统一改为 ISR revalidate=300：可被预取（~63ms）、
// 后台改数据走 revalidatePath 刷新。
export const revalidate = 300;

const CAPABILITIES = [
  {
    icon: BarChart3,
    title: "先看排行，再选模型",
    text: "模型性能天梯图汇总各模型的实测综合分与分项表现，卡片越靠上综合分越高；配合筛选、排序与阵营视图，快速圈定候选。",
    href: "/models",
    linkLabel: "查看天梯图",
  },
  {
    icon: KeyRound,
    title: "一套密钥，统一调用",
    text: "在控制台创建平台密钥后即可通过本站网关调用已配置的模型，无需逐家申请与维护多套凭证；自有上游密钥也可分区管理。",
    href: "/user/console?tab=platformKeys",
    linkLabel: "管理平台密钥",
  },
  {
    icon: Gauge,
    title: "配置优先级，自动切换",
    text: "通用版按档位绑定模型，专业版按 1~99 维护具体模型优先级；上游异常或额度不足时按已配置的顺序自动切换，对话不中断。",
    href: "/user/console",
    linkLabel: "打开控制台",
  },
  {
    icon: ShieldCheck,
    title: "计费透明，额度可见",
    text: "控制台与对话计费明细展示上游官方单价与实际 Token 数；免费额度的剩余量与刷新周期在控制台随时可查。",
    href: "/pricing",
    linkLabel: "查看价格页",
  },
] as const;

const STEPS = [
  { title: "注册并登录", text: "创建 Aidean 账号，登录后从右上角进入个人控制台。", href: "/login", linkLabel: "去登录" },
  { title: "配置模型", text: "在「模型配置」选择通用版档位绑定或专业版优先级列表，平台会自动附带系统定义的免费模型兜底。", href: "/user/console?tab=config", linkLabel: "配置模型" },
  { title: "验证调用", text: "在「调用测试台」发起一次简短请求，确认模型、密钥与额度状态后再接入你自己的应用。", href: "/user/console?tab=playground", linkLabel: "打开测试台" },
];

/** 格式化折扣价为 K Tokens 显示 */
function fmtK(priceM: number | null): string {
  if (priceM === null || !Number.isFinite(priceM)) return "—";
  return `¥${formatPrice(millionToK(priceM), 6)}`;
}

/** 格式化折扣价为 M Tokens 显示 */
function fmtM(priceM: number | null): string {
  if (priceM === null || !Number.isFinite(priceM)) return "—";
  return `¥${formatPrice(priceM, 4)}`;
}

/** 格式化折扣价区间为 K Tokens 显示 */
function fmtKRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "—";
  if (min !== null && max !== null && min === max) return fmtK(min);
  return `${fmtK(min)}~${fmtK(max)}`;
}

/** 格式化折扣价区间为 M Tokens 显示 */
function fmtMRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "—";
  if (min !== null && max !== null && min === max) return fmtM(min);
  return `${fmtM(min)}~${fmtM(max)}`;
}

/** 加载启用提供商及其挂载模型（供 ProvidersPage 调用，便于统一 try/catch 降级）。 */
function loadProviders() {
  return prisma.modelProvider.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    include: {
      offerings: {
        where: { isActive: true },
        include: {
          model: {
            select: {
              id: true,
              modelCode: true,
              nameDisplay: true,
              slug: true,
              vendor: { select: { name: true, code: true } },
            },
          },
        },
        orderBy: [{ listedAt: "desc" }],
      },
    },
  });
}

export default async function ProvidersPage() {
  // 查询所有启用的模型提供商及其模型挂载。
  // 降级兜底（构建健壮性）：本页为 ISR（revalidate=300），Next 会在构建期预渲染；
  // Docker builder 阶段仅有占位 DATABASE_URL（见 Dockerfile 第 50-52 行），构建期无真实 DB。
  // 与 models/news 同构：取数失败（连接不可用等）时降级为空列表，页面仅渲染静态能力介绍，
  // 既不阻断构建，也在运行期 DB 抖动时保住 200 而非 500；后台数据恢复后由 revalidate 自动刷新。
  let providers: Awaited<ReturnType<typeof loadProviders>> = [];
  try {
    providers = await loadProviders();
  } catch (err) {
    console.warn("[providers] SSR 取数失败，降级空提供商列表：", err instanceof Error ? err.message : err);
  }

  return (
    <PagePlaceholder
      title="模型服务提供商"
      description="一个入口，调用多家模型：Aidean 统一网关把「选模型、管密钥、控优先级、看用量」收敛到一个控制台，不必在多个服务商之间反复切换，价格与用量全部透明可见。"
    >
      {/* ==================== 平台能力 ==================== */}
      <section aria-labelledby="providers-capabilities" className="mb-14">
        <h2 id="providers-capabilities" className="mb-6 text-xl font-semibold tracking-tight">平台能力</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {CAPABILITIES.map(({ icon: Icon, title, text, href, linkLabel }) => (
            <article key={title} className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2.5 flex-1 text-sm leading-7 text-muted-foreground">{text}</p>
              <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                {linkLabel} <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ==================== 提供商与价格表 ==================== */}
      {providers.length > 0 && (
        <section aria-labelledby="providers-list" className="mb-14">
          <h2 id="providers-list" className="mb-6 text-xl font-semibold tracking-tight">已接入提供商</h2>
          <div className="space-y-8">
            {providers.map((provider) => {
              const ratio = Number(provider.rechargeRatio);
              const currency = provider.priceCurrency;
              const rechargeCurrency = provider.rechargeCurrency;
              const curSymbol = currency === "USD" ? "$" : currency === "CNY" ? "¥" : currency;
              return (
                <div key={provider.id} className="rounded-2xl border border-border bg-card p-6 sm:p-7">
                  {/* 提供商头部 */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{provider.name}</h3>
                      {provider.nameCn && (
                        <p className="text-sm text-muted-foreground">{provider.nameCn}</p>
                      )}
                      {provider.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{provider.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        充值比例：1 {rechargeCurrency} = {provider.rechargeRatio.toString()} {currency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        标价币种：{currency} · 挂载模型：{provider.offerings.length} 个
                      </p>
                    </div>
                  </div>

                  {/* 价格表 */}
                  {provider.offerings.length > 0 ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">模型</th>
                            <th className="py-2 pr-3 font-medium">厂商</th>
                            <th className="py-2 pr-3 font-medium">上线时间</th>
                            <th className="py-2 pr-3 font-medium">倍率</th>
                            <th className="py-2 pr-3 font-medium">维度</th>
                            <th className="py-2 pr-3 font-medium">标价</th>
                            <th className="py-2 pr-3 font-medium">折扣价 / K Tokens</th>
                            <th className="py-2 pr-3 font-medium">折扣价 / M Tokens</th>
                          </tr>
                        </thead>
                        <tbody>
                          {provider.offerings.map((o) => {
                            const unit = (o.priceUnit as PriceUnit) ?? "per_million_tokens";
                            const mult = Number(o.defaultMultiplier);
                            const unitLabel = unit === "per_1k_tokens" ? "K" : "M";

                            // 计算输入折扣价
                            const inputMin = o.discountInputMin
                              ? Number(o.discountInputMin)
                              : o.priceInput
                                ? calcDiscountPrice(Number(o.priceInput), unit, ratio, mult)
                                : null;
                            const inputMax = o.discountInputMax
                              ? Number(o.discountInputMax)
                              : inputMin;

                            // 计算输出折扣价
                            const outputMin = o.discountOutputMin
                              ? Number(o.discountOutputMin)
                              : o.priceOutput
                                ? calcDiscountPrice(Number(o.priceOutput), unit, ratio, mult)
                                : null;
                            const outputMax = o.discountOutputMax
                              ? Number(o.discountOutputMax)
                              : outputMin;

                            // 计算缓存折扣价
                            const cacheMin = o.discountCacheMin
                              ? Number(o.discountCacheMin)
                              : o.priceCache
                                ? calcDiscountPrice(Number(o.priceCache), unit, ratio, mult)
                                : null;
                            const cacheMax = o.discountCacheMax
                              ? Number(o.discountCacheMax)
                              : cacheMin;

                            // 标价显示
                            const listedInput = o.priceInput
                              ? formatListedPrice(Number(o.priceInput), curSymbol, unit)
                              : "未公开";
                            const listedOutput = o.priceOutput
                              ? formatListedPrice(Number(o.priceOutput), curSymbol, unit)
                              : "未公开";
                            const listedCache = o.priceCache
                              ? formatListedPrice(Number(o.priceCache), curSymbol, unit)
                              : "未公开";

                            // 判断缓存行是否有数据
                            const hasCache = o.priceCache !== null || o.discountCacheMin !== null;

                            const rowSpan = hasCache ? 3 : 2;

                            return (
                              <Fragment key={o.id}>
                                <tr className="border-b">
                                  <td className="py-2 pr-3 font-mono text-xs" rowSpan={rowSpan}>
                                    <Link href={`/models/${o.model.slug}`} className="text-primary hover:underline">
                                      {o.model.nameDisplay}
                                    </Link>
                                    <p className="text-xs text-muted-foreground">{o.model.modelCode}</p>
                                  </td>
                                  <td className="py-2 pr-3 text-xs" rowSpan={rowSpan}>{o.model.vendor.name}</td>
                                  <td className="py-2 pr-3 text-xs" rowSpan={rowSpan}>
                                    {o.listedAt ? new Date(o.listedAt).toISOString().slice(0, 10) : "—"}
                                  </td>
                                  <td className="py-2 pr-3 font-mono text-xs" rowSpan={rowSpan}>{o.defaultMultiplier.toString()}</td>
                                  <td className="py-2 pr-3 text-xs">输入</td>
                                  <td className="py-2 pr-3 font-mono text-xs">{listedInput}</td>
                                  <td className="py-2 pr-3 font-mono text-xs text-primary">{fmtKRange(inputMin, inputMax)}</td>
                                  <td className="py-2 pr-3 font-mono text-xs text-primary">{fmtMRange(inputMin, inputMax)}</td>
                                </tr>
                                <tr className="border-b">
                                  <td className="py-2 pr-3 text-xs">输出</td>
                                  <td className="py-2 pr-3 font-mono text-xs">{listedOutput}</td>
                                  <td className="py-2 pr-3 font-mono text-xs text-primary">{fmtKRange(outputMin, outputMax)}</td>
                                  <td className="py-2 pr-3 font-mono text-xs text-primary">{fmtMRange(outputMin, outputMax)}</td>
                                </tr>
                                {hasCache && (
                                  <tr className="border-b">
                                    <td className="py-2 pr-3 text-xs">缓存命中</td>
                                    <td className="py-2 pr-3 font-mono text-xs">{listedCache}</td>
                                    <td className="py-2 pr-3 font-mono text-xs text-primary">{fmtKRange(cacheMin, cacheMax)}</td>
                                    <td className="py-2 pr-3 font-mono text-xs text-primary">{fmtMRange(cacheMin, cacheMax)}</td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">暂无挂载模型</p>
                  )}

                  {/* 换算说明 */}
                  <div className="mt-4 rounded-lg bg-muted/30 p-4 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">换算说明</p>
                    <p className="mt-1">
                      标价单位为 {curSymbol}/{provider.offerings[0]?.priceUnit === "per_1k_tokens" ? "K Tokens" : "M Tokens"}，
                      充值比例 1 {rechargeCurrency} = {provider.rechargeRatio.toString()} {currency}。
                      K Tokens 与 M Tokens 折扣价满足 1 M Tokens = 1000 K Tokens。
                    </p>
                    <p className="mt-1">
                      折扣价计算公式：折扣价(元/M Tokens) = 标价({currency}/M Tokens) ÷ (充值比例 × 倍率)。
                      倍率默认 1.0，可在后台按模型调整。
                    </p>
                    <p className="mt-1">
                      示例：标价 {curSymbol}10/{provider.offerings[0]?.priceUnit === "per_1k_tokens" ? "K" : "M"} Tokens，充值比例 {ratio}，倍率 1.0
                      {provider.offerings[0]?.priceUnit === "per_1k_tokens"
                        ? ` → 折扣价 = 10 × 1000 ÷ ${ratio} = ${Math.round(10000 / ratio)} 元/M Tokens = ¥${formatPrice(millionToK(10000 / ratio), 6)}/K Tokens`
                        : ` → 折扣价 = 10 ÷ ${ratio} = ${formatPrice(10 / ratio, 4)} 元/M Tokens = ¥${formatPrice(10 / ratio / 1000, 6)}/K Tokens`}
                      。
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ==================== 三步开始 ==================== */}
      <section aria-labelledby="providers-steps" className="mb-14">
        <h2 id="providers-steps" className="mb-6 text-xl font-semibold tracking-tight">三步开始调用</h2>
        <ol className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative rounded-2xl border border-border bg-card p-6">
              <p className="font-mono text-xs text-primary">STEP {index + 1}</p>
              <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
              <p className="mt-2.5 text-sm leading-7 text-muted-foreground">{step.text}</p>
              <Link href={step.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                {step.linkLabel} <ArrowRight size={14} />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ==================== 计费方式 ==================== */}
      <section aria-labelledby="providers-billing" className="mb-14 rounded-2xl border border-border bg-card p-7 sm:p-9">
        <h2 id="providers-billing" className="text-xl font-semibold tracking-tight">计费方式</h2>
        <ul className="mt-5 space-y-3.5 text-sm leading-7 text-muted-foreground">
          <li className="flex gap-3">
            <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            按实际用量计费：控制台与对话明细展示上游官方单价与实际 Token 数，用多少算多少。
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            免费额度按周期刷新，剩余量在控制台「免费额度」板块实时可查。
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            余额不足且未配置私有模型时，自动切换免费模型并在响应内轻提示，不弹窗、不中断对话。
          </li>
        </ul>
        <p className="mt-5 text-xs text-muted-foreground">具体价格以价格页与模型详情页实时展示为准。</p>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-7 sm:flex-row sm:items-center sm:p-9">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">现在就开始</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">登录控制台，几分钟完成配置并完成第一次调用验证。</p>
        </div>
        <Link href="/user/console" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
          进入控制台 <ArrowRight size={15} />
        </Link>
      </section>
    </PagePlaceholder>
  );
}

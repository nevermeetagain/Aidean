// /models/[slug] —— 模型详情页（Task L.5.1 / M-PERF B1+B2 重构）。
// Server 按 slug 直查 ai_models（复用 repository.findModelByIdentifier，与 /api/v1/models/[id] 同源）；
// 未收录/取数失败降级内联空态卡（不调 notFound() 以保持布局壳），文案「该模型暂未收录」。
// B2：ISR 化（TASK-097 起 revalidate=300，原 3600）（页面级缓存，revalidate 周期内命中免现算）——
//   空 generateStaticParams 在 build 期只登记不取数，CI 无 DB 不阻断；
//   原注释所称「build 期查库失败」由 loadModel 的 try/catch 降级兜底（沿用列表页范式）。
// B1：loadModel 经 React cache() 包装——generateMetadata 与 page 同请求共享一次查询。
import { cache, Suspense, use } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RevealOnScroll } from "../../../../components/home/RevealOnScroll";
import { DetailToc } from "../../../../components/models/DetailToc";
import { CompareAddButton } from "../../../../components/site/CompareAddButton";
import { FavoriteButton } from "../../../../components/site/FavoriteButton";
import { prisma } from "../../../../lib/db/prisma";
import { ladderRepository } from "../../../../lib/features/ladder/repository";
import { resolveEffectivePrice } from "../../../../lib/features/pricing/effective-price";
import { PriceTag } from "../../../../components/common/PriceTag";
import { ModelOfferings } from "../../../../components/models/ModelOfferings";
import { BenchmarkList, type BenchmarkView } from "../../../../components/models/BenchmarkDialog";
import { EvaluationExamples, EvaluationExamplesSkeleton, type EvaluationExample } from "../../../../components/models/EvaluationExamples";

/** 页面缓存窗口（秒）：模型价格/评分按天级更新，3600s 新鲜度可接受 */
export const revalidate = 300; // TASK-097：优惠起止无写事件触发，页缓存上限压到 5 分钟（Redis 已按价格边界对齐）

/** dynamic 路由按需渲染：不预生成任何 slug（build 期零查库） */
export const generateStaticParams = async () => [];

const TOC_ITEMS = [
  { id: "intro", label: "基本介绍" },
  { id: "params", label: "参数信息" },
  { id: "providers", label: "在哪里可调用" },
  { id: "bench", label: "基准测试" },
  { id: "samples", label: "测评示例" },
] as const;

/** B1：React cache() 同请求去重——generateMetadata 与 page 各调一次，实际仅落一条 Prisma 查询 */
const loadModel = cache(async (slug: string) => {
  try {
    return await ladderRepository.findModelByIdentifier(prisma, slug);
  } catch (error) {
    // DB 不可用时降级为「暂未收录」空态，页面保持可出
    console.error(`[models/${slug}] 详情取数失败，降级空态：`, error);
    return null;
  }
});

/** TASK-029：生效价 DTO（含优惠标记/原价/截止）；解析失败 → null，页面回落 prices[0] 且不显示徽标（契约⑥ error 态） */
async function loadEffectivePrice(modelId: string) {
  try {
    return await resolveEffectivePrice(modelId);
  } catch (error) {
    console.error(`[models] 生效价解析失败，回落当前价：`, error);
    return null;
  }
}

/**
 * TASK-074：包含本模型的公开测评示例（isPaid=false、已完成、未删除），最近 3 条；查询失败 → error 态（不阻断详情页）。
 * 与 /api/v1/evaluations/demo 同一「公开示例」口径（isPaid=false），仅追加「含本模型」过滤。
 */
async function loadExamples(modelId: string): Promise<EvaluationExample[] | null> {
  try {
    const rows = await prisma.evaluation.findMany({
      where: { isPaid: false, deletedAt: null, status: 2, evaluationModels: { some: { modelId } } },
      orderBy: { completedAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        prompt: true,
        completedAt: true,
        winnerModelId: true,
        evaluationModels: {
          orderBy: { createdAt: "asc" },
          select: {
            modelId: true,
            response: true,
            latencyMs: true,
            tokensTotal: true,
            score: true,
            model: { select: { nameDisplay: true, slug: true } },
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      prompt: r.prompt,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      winnerModelId: r.winnerModelId,
      answers: r.evaluationModels.map((m) => ({
        modelId: m.modelId,
        modelName: m.model.nameDisplay,
        modelSlug: m.model.slug,
        response: m.response,
        latencyMs: m.latencyMs,
        tokensTotal: m.tokensTotal,
        score: m.score,
      })),
    }));
  } catch (error) {
    console.error(`[models] 测评示例取数失败：`, error);
    return null;
  }
}

async function ExamplesSection({ modelId }: { modelId: string }) {
  const examples = await loadExamples(modelId);
  return <EvaluationExamples examples={examples ?? []} currentModelId={modelId} error={examples === null} />;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const model = await loadModel(slug);
  if (!model) {
    return { title: "该模型暂未收录 · Aidean" };
  }
  return {
    title: `${model.nameDisplay} · Aidean`,
    description: `${model.nameDisplay} 模型详情：基本介绍、参数信息、基准测试与测评示例。`,
  };
}

/* ---------- 展示辅助 ---------- */

const BADGE_CLS =
  "inline-flex items-center rounded-full border border-[var(--border)] bg-muted px-2.5 py-0.5 text-xs text-slate-600";

const PROTOCOL_LABELS: Record<string, string> = {
  OPENAI: "OpenAI 兼容",
  ANTHROPIC: "Anthropic",
  NATIVE: "原生 HTTP",
};

const SOURCE_LABELS: Record<string, string> = {
  OFFICIAL: "官方",
  ACTUAL: "实测",
  REVIEW: "评测",
  SELF: "自测",
  THIRD_PARTY: "第三方",
};

function fmtTokens(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toLocaleString("zh-CN");
}

/** Benchmark.scores JSON → [指标名, 展示值] 列表；非对象形态容忍为空表 */
function scoreEntries(raw: unknown): Array<[string, string]> {
  if (raw === null || typeof raw !== "object") return [];
  return Object.entries(raw as Record<string, unknown>).map(([key, value]) => [
    key,
    typeof value === "number" ? value.toFixed(1) : String(value),
  ]);
}

interface ParamCell {
  label: string;
  value: string;
}

/* ---------- 页面 ---------- */

export default async function ModelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const model = await loadModel(slug);

  // 空态：模型未收录或取数降级 —— 内联卡 + 返回天梯图按钮
  if (!model) {
    return (
      <main className="px-4 py-14 md:px-6">
        <nav aria-label="面包屑" className="mb-8 text-sm text-slate-500">
          <Link href="/" className="transition-colors hover:text-primary">
            首页
          </Link>
          <span aria-hidden="true"> / </span>
          <Link href="/models" className="transition-colors hover:text-primary">
            模型
          </Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">详情</span>
        </nav>

        <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-8 py-12 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-700">该模型暂未收录</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            你访问的模型不在当前天梯数据集中，可返回榜单查看已收录模型。
          </p>
          <Link
            href="/models"
            className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回天梯图
          </Link>
        </div>
      </main>
    );
  }

  const price = model.prices[0];
  const effective = price ? await loadEffectivePrice(model.id) : null;
  const priceCurrency = price?.billingCurrency ?? "CNY";
  // 单位随价格行 billingUnit 展示（原硬编码「¥/M Tokens」与 per_1k_tokens 存量行不符；统一 ¥/M 归一属 TASK-053/U-15）
  const UNIT_LABEL: Record<string, string> = { per_1k_tokens: "/K Tokens", per_1m_tokens: "/M Tokens", per_million_tokens: "/M Tokens" };
  const priceUnit = price?.billingUnit ? (UNIT_LABEL[price.billingUnit] ?? `/${price.billingUnit}`) : undefined;
  // 「限时免费」须输入与输出同为 0（与 /pricing、后台口径一致，review-029 M1）
  const promoFree = !!effective?.isPromotion && Number(effective.priceInput) === 0 && Number(effective.priceOutput) === 0;
  const score = model.scores[0];
  // TASK-074：基准 → 可序列化视图（弹窗组件为客户端组件）
  const benchViews: BenchmarkView[] = model.benchmarks.map((b) => ({
    id: b.id,
    name: b.benchmarkType, // 基准名用 benchmarkType（如 MMLU）；sourceName 是数据来源，弹窗内单列
    subType: b.benchmarkSubType ?? null,
    sourceLabel: SOURCE_LABELS[String(b.sourceType)] ?? String(b.sourceType),
    sourceName: b.sourceName ?? null,
    sourceUrl: b.sourceUrl ?? null,
    sourceVersion: b.sourceVersion ?? null,
    totalScore: Number(b.totalScore),
    percentile: b.scorePercentile !== null && b.scorePercentile !== undefined ? Number(b.scorePercentile) : null,
    testDate: b.testDate ? b.testDate.toISOString() : null,
    sampleCount: b.sampleCount ?? null,
    verified: Number(b.verifiedStatus) === 1,
    scores: scoreEntries(b.scores),
  }));
  const protocolLabel = PROTOCOL_LABELS[String(model.protocol)] ?? String(model.protocol);

  const paramCells: ParamCell[] = [
    { label: "参数量", value: model.parameterCount ?? "—" },
    { label: "上下文长度", value: fmtTokens(model.contextLength) },
    { label: "最大输出", value: fmtTokens(model.maxOutputTokens) },
    { label: "协议", value: protocolLabel },
    { label: "发布时间", value: model.publishedAt?.toISOString().slice(0, 10) ?? "—" },
  ];

  return (
    <main className="px-4 py-14 md:px-6">
      <nav aria-label="面包屑" className="mb-8 text-sm text-slate-500">
        <Link href="/" className="transition-colors hover:text-primary">
          首页
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href="/models" className="transition-colors hover:text-primary">
          模型
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{model.nameDisplay}</span>
      </nav>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        {/* 左侧 sticky 锚点目录 */}
        <aside className="lg:w-44 lg:flex-shrink-0">
          <div className="lg:sticky lg:top-24">
            <DetailToc items={TOC_ITEMS} />
          </div>
        </aside>

        {/* 右侧内容四节 */}
        <div className="min-w-0 flex-1 space-y-12">
          {/* intro 基本介绍 */}
          <RevealOnScroll>
            <section id="intro" aria-labelledby="intro-title" className="scroll-mt-24">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="intro-title" className="text-xl font-bold text-foreground">
                  基本介绍
                </h2>
                <div className="flex items-center gap-2">
                  <FavoriteButton refType="MODEL" refId={model.id} name={model.nameDisplay} size="md" />
                  <CompareAddButton
                    modelId={model.id}
                    nameDisplay={model.nameDisplay}
                    slug={model.slug}
                    size="md"
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">modelCode：{model.modelCode}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(score ? [{ key: "composite", label: `综合分 ${Number(score.compositeScore).toFixed(1)}` }] : [])
                  .concat(
                    model.isOpenSource
                      ? { key: "oss", label: "开源" }
                      : { key: "closed", label: "闭源" }
                  )
                  .concat({ key: "protocol", label: protocolLabel })
                  .concat(model.tags.map((tag: string) => ({ key: tag, label: tag })))
                  .map((badge) => (
                    <span key={badge.key} className={BADGE_CLS}>
                      {badge.label}
                    </span>
                  ))}
              </div>
              {model.nameCn ? (
                <p className="mt-4 text-sm leading-relaxed text-slate-500">
                  中文名称：{model.nameCn} · 厂商：{model.vendor.name}
                </p>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-slate-500">
                  厂商：{model.vendor.name}
                </p>
              )}
            </section>
          </RevealOnScroll>

          {/* params 参数信息 */}
          <RevealOnScroll>
            <section id="params" aria-labelledby="params-title" className="scroll-mt-24">
              <h2 id="params-title" className="text-xl font-bold text-foreground">
                参数信息
              </h2>
              <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {paramCells.map((cell) => (
                  <div
                    key={cell.label}
                    className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  >
                    <dt className="text-slate-500">{cell.label}</dt>
                    <dd className="font-medium text-slate-700">{cell.value}</dd>
                  </div>
                ))}
              </dl>
              <div data-testid="model-price-block" className="mt-4 space-y-1.5 text-xs text-slate-500">
                {effective?.isPromotion ? (
                  <p className="text-[11px] text-slate-400">以下为当前生效价，原价划线展示；优惠到期后自动恢复原价。</p>
                ) : null}
                <p className="flex flex-wrap items-baseline gap-1.5">
                  <span>输入价格：</span>
                  {price ? (
                    <PriceTag
                      value={effective?.priceInput ?? String(price.priceInput)}
                      currency={priceCurrency}
                      unit={priceUnit}
                      isPromotion={effective?.isPromotion ?? false}
                      basePrice={effective?.basePriceInput ?? null}
                      promotionEndsAt={effective?.promotionEndsAt ?? null}
                      free={promoFree}
                    />
                  ) : (
                    "未公开"
                  )}
                </p>
                <p className="flex flex-wrap items-baseline gap-1.5">
                  <span>输出价格：</span>
                  {price ? (
                    <PriceTag
                      value={effective?.priceOutput ?? String(price.priceOutput)}
                      currency={priceCurrency}
                      unit={priceUnit}
                      isPromotion={effective?.isPromotion ?? false}
                      basePrice={effective?.basePriceOutput ?? null}
                      showBadge={false}
                    />
                  ) : (
                    "未公开"
                  )}
                </p>
                <p className="flex flex-wrap items-baseline gap-1.5">
                  <span>缓存价格：</span>
                  {price && price.priceCache !== null ? (
                    <PriceTag value={effective?.priceCache ?? String(price.priceCache)} currency={priceCurrency} unit={priceUnit} />
                  ) : (
                    "未公开"
                  )}
                </p>
              </div>
            </section>
          </RevealOnScroll>

          {/* 在哪里可调用（TASK-067）：平台挂载与折扣价（人工维护的 ProviderModelOffering）+ 多源上架观测（模型源监控） */}
          <RevealOnScroll>
            <section id="providers" aria-labelledby="providers-title" className="scroll-mt-24">
              <h2 id="providers-title" className="text-xl font-bold text-foreground">
                在哪里可调用
              </h2>
              {model.offerings && model.offerings.length > 0 ? (
                <>
                <h3 className="mt-4 text-sm font-semibold text-slate-600">平台挂载与折扣价</h3>
                <div className="mt-3 space-y-4">
                  {model.offerings.map((o) => {
                    const ratio = Number(o.provider.rechargeRatio);
                    const mult = Number(o.defaultMultiplier);
                    const inputListed = o.priceInput ? Number(o.priceInput) : null;
                    const outputListed = o.priceOutput ? Number(o.priceOutput) : null;
                    const inputDiscount = inputListed !== null
                      ? (inputListed / (ratio * mult)).toFixed(4)
                      : null;
                    const outputDiscount = outputListed !== null
                      ? (outputListed / (ratio * mult)).toFixed(4)
                      : null;
                    return (
                      <div key={o.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-slate-700">{o.provider.name}</span>
                            {o.provider.nameCn && (
                              <span className="ml-2 text-sm text-slate-500">{o.provider.nameCn}</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            上线时间：{o.listedAt ? new Date(o.listedAt).toISOString().slice(0, 10) : "—"}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-slate-500">标价（{o.provider.priceCurrency}/M Tokens）</p>
                            <p className="mt-1 font-mono">
                              输入：{inputListed !== null ? `${o.provider.priceCurrency === "USD" ? "$" : o.provider.priceCurrency}${inputListed}` : "未公开"}
                              {" · "}
                              输出：{outputListed !== null ? `${o.provider.priceCurrency === "USD" ? "$" : o.provider.priceCurrency}${outputListed}` : "未公开"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">
                              折扣价（{o.provider.rechargeCurrency}/M Tokens）· 倍率 {o.defaultMultiplier.toString()}
                            </p>
                            <p className="mt-1 font-mono text-primary">
                              输入：{inputDiscount !== null ? `${inputDiscount} 元` : "—"}
                              {" · "}
                              输出：{outputDiscount !== null ? `${outputDiscount} 元` : "—"}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          充值比例：1 {o.provider.rechargeCurrency} = {o.provider.rechargeRatio.toString()} {o.provider.priceCurrency}
                          {" · "}折扣价 = 标价 ÷ (充值比例 × 倍率)
                        </p>
                      </div>
                    );
                  })}
                </div>
                </>
              ) : null}
              <h3 id="offerings" className="mt-6 scroll-mt-24 text-sm font-semibold text-slate-600">多源上架观测</h3>
              <div className="mt-3">
                <ModelOfferings modelId={model.id} />
              </div>
            </section>
          </RevealOnScroll>

          {/* bench 基准测试 */}
          <RevealOnScroll>
            <section id="bench" aria-labelledby="bench-title" className="scroll-mt-24">
              <h2 id="bench-title" className="text-xl font-bold text-foreground">
                基准测试
              </h2>
              <p className="mt-1 text-xs text-slate-400">点击基准名查看分项指标、来源与核验状态。</p>
              <BenchmarkList items={benchViews} />
            </section>
          </RevealOnScroll>

          {/* samples 测评示例 */}
          <RevealOnScroll>
            <section id="samples" aria-labelledby="samples-title" className="scroll-mt-24">
              <h2 id="samples-title" className="text-xl font-bold text-foreground">
                测评示例
              </h2>
              <p className="mt-1 text-xs text-slate-400">同一道题多个模型的真实回答并排对比（来自公开测评示例）。</p>
              <Suspense fallback={<EvaluationExamplesSkeleton />}>
                <ExamplesSection modelId={model.id} />
              </Suspense>
            </section>
          </RevealOnScroll>
        </div>
      </div>
    </main>
  );
}

"use client";

/**
 * 天梯榜客户端装配层（Task L.4.2 / v1.9 无限滚动改版）：
 * Server 页面注入 initialData（首页数据），本组件组合
 * 筛选/排序/版本切换/双视图与 URL 同步。
 *
 * 请求纪律：
 * - 视图切换（table/chart）零网络请求——仅切换同一 rankingData 的呈现；
 * - 筛选/排序变更 → fetchQuery 变化 → 去重（与上次一致则跳过）+ 防抖 250ms
 *   后请求 /api/v1/ladder（offset=0&limit=页大小），AbortController 使新一轮取消旧一轮（最新胜出）；
 * - 挂载首跑登记 SSR 查询串基线，与 SSR 一致时不重复拉取；
 * - v1.9 无限滚动：矩阵视图滚动近底部触发 loadMore（同查询 offset=已载条数），追加去重后并档；
 *   返回条数小于页大小即判定穷尽（hasMore=false，矩阵底部「到底了」）。
 * - v1.9 工具栏收纳：国内/国外阵营开关自矩阵图头移入排序行，与排序下拉同行对齐。
 * - v2.0 工具栏三行制（v2.3 回退左右位）：行1=筛选栏（左）｜版本切换（右）；
 *   行2=排序+分度值+阵营开关（左）｜视图切换（右）；行3=标题（自矩阵图头上移）+数据更新时间。
 *   横向左右位置延续改版前版式。分度值为纯呈现层受控状态
 *   （SSR 默认值兜底），切换只改矩阵档位密度，零网络请求。
 * - v2.5 元信息行（仅传 subtitle 的页面，现为 /models）：页头副题与数据更新时间合并为
 *   工具栏上方一行（副题左 · 时间/pending 右，对齐页头 max-w-6xl 容器），行3 不再呈现；
 *   stations 未传 subtitle，行3 维持原样（其页头「数据说明」卡注明时间以工具栏为准）。
 */
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LayoutGrid, Trophy } from "lucide-react";
import { useLadderStore, applyTagLens } from "../../stores/ladderStore";
import type { LadderPageType } from "../../stores/ladderStore";
import { ladderFetchQuery } from "../../stores/ladderStore";
import { useLadderQuerySync } from "../../hooks/useLadderQuerySync";
import { LADDER_PAGE_SIZE } from "../../lib/features/ladder/types";
import type { LadderRankingData } from "../../lib/features/ladder/types";
import { LadderFilterBar } from "./LadderFilterBar";
import { LadderSortBar } from "./LadderSortBar";
import { VersionSwitcher } from "./VersionSwitcher";
import { GranularitySelector } from "./GranularitySelector";
import { LadderMatrixBoard } from "./LadderMatrixBoard";
import type { TierThresholds } from "../../lib/features/ladder/config";
import { LadderBarChart } from "./LadderBarChart";

/** URL 同步桥：useSearchParams 要求 Suspense 边界，隔离静态 bailout 面 */
function QuerySyncBridge({ pageType }: { pageType: LadderPageType }) {
  useLadderQuerySync(pageType);
  return null;
}

interface LadderBoardProps {
  pageType: LadderPageType;
  /** SSR 初始排行（首页数据，同源唯一数据源；R-83 T3 起为顶带 band=0 结果） */
  initialData: LadderRankingData;
  /** 性能轴颗粒度（v1.9，后台可配，SSR 读取注入） */
  granularity: number;
  /** 性能区段阈值（v2.0，后台可配，SSR 读取注入） */
  tierThresholds?: TierThresholds;
  /** R-83 T4：默认展示的热门开发商列数（后台可配，SSR 读取注入） */
  hotVendorCount?: number;
  /** v2.5 页头副题（如 /models）：传入则与数据更新时间合并为工具栏上方元信息行，并省去工具栏行3 */
  subtitle?: string;
  /** v2.6 英雄卡插槽（徽标+H1，服务端渲染节点）：与副题/更新时间合并为一体化背景卡片 */
  hero?: ReactNode;
}

interface EnvelopeShape {
  code?: number;
  message?: string;
  data?: unknown;
}

export function LadderBoard({ pageType, initialData, granularity, tierThresholds, hotVendorCount, subtitle, hero }: LadderBoardProps) {
  const [rankingData, setRankingData] = useState(initialData);
  /**
   * 上拉加载状态（R-83 T3 分数带分窗）：SSR 注入顶带（band=0），hasMore 由响应
   * band 元数据驱动（带下限 > 0 即还有更低的带）；旧形状（无 band）回退条数判定。
   */
  const [hasMore, setHasMore] = useState(
    initialData.band ? initialData.band.hasMore : initialData.entries.length >= LADDER_PAGE_SIZE
  );
  /** 下一待拉带序号：顶带加载完成后从 1 开始 */
  const [nextBandIndex, setNextBandIndex] = useState(initialData.band ? initialData.band.index + 1 : 0);
  const [loadingMore, setLoadingMore] = useState(false);
  /** 分度值（v2.0）：SSR 后台配置兜底的呈现层受控状态，切换零请求 */
  const [axisGranularity, setAxisGranularity] = useState(granularity);

  const filters = useLadderStore((s) => s.filters);
  const sort = useLadderStore((s) => s.sort);
  const customFormula = useLadderStore((s) => s.customFormula);
  const view = useLadderStore((s) => s.view);
  const pending = useLadderStore((s) => s.pending);
  const lastError = useLadderStore((s) => s.lastError);
  const showIntl = useLadderStore((s) => s.showIntl);
  const showDom = useLadderStore((s) => s.showDom);
  const toggleCamp = useLadderStore((s) => s.toggleCamp);
  const setView = useLadderStore((s) => s.setView);
  const setPending = useLadderStore((s) => s.setPending);
  const setError = useLadderStore((s) => s.setError);

  // 数据相关查询串（不含 viewMode：切视图零请求）
  const fetchQuery = useMemo(
    () => ladderFetchQuery(pageType, { filters, sort, customFormula }),
    [pageType, filters, sort, customFormula]
  );

  // 标签伪标签透镜（v1.8）：纯客户端重排，由 filters.tags 推导（最新/冷门；热门/未选=服务端序）
  const visibleEntries = useMemo(
    () => applyTagLens(rankingData.entries, filters.tags),
    [rankingData.entries, filters.tags]
  );

  // 阵营开关可见性（v1.9 移入排序行）：仅 models 且数据双侧皆有厂商时呈现
  const campControls = useMemo(
    () =>
      pageType === "models" &&
      visibleEntries.some((e) => e.vendorCountry === "CN") &&
      visibleEntries.some((e) => e.vendorCountry !== "CN"),
    [pageType, visibleEntries]
  );

  const seenRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** loadMore 防串台序号：查询串变更后，旧查询的在途追加一律弃置 */
  const loadMoreSeqRef = useRef(0);
  /** R-83 T3：loadMore 同步互斥位（React 批处理下 loadingMore state 滞后一拍，同 tick 双触发会重复拉同一带） */
  const loadingMoreRef = useRef(false);
  /** R-83 T3：在途 loadMore 的中止器——查询变更时中止，防旧带响应晚到把新鲜状态打成「到底了」 */
  const loadMoreAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // 首跑登记基线：挂载时 store 即 SSR 形态，无需重复取数
    if (seenRef.current === null) {
      seenRef.current = fetchQuery;
      return;
    }
    if (fetchQuery === seenRef.current) return;
    seenRef.current = fetchQuery;
    // 查询变更：作废在途 loadMore 并回到首页窗口；
    // 同步复位 loadingMore（在途请求的 finally 因序号不匹配会跳过复位，不复位即永久卡「加载中…」）；
    // 中止在途 band 请求（其响应携带的 hasMore 元数据若晚到，会把重置后的状态错误打成「到底了」）
    loadMoreSeqRef.current += 1;
    loadingMoreRef.current = false;
    loadMoreAbortRef.current?.abort();
    setLoadingMore(false);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(() => {
      setPending(true);
      // 查询变更后回到顶带（band=0）；穷尽判定优先取响应 band 元数据
      fetch(`/api/v1/ladder?${fetchQuery}&band=0`, { signal: controller.signal })
        .then(async (res) => (await res.json()) as EnvelopeShape)
        .then((envelope) => {
          if (controller.signal.aborted) return;
          const data = envelope.data as LadderRankingData | null;
          if (envelope.code === 0 && data && Array.isArray(data.entries)) {
            setRankingData(data);
            setHasMore(data.band ? data.band.hasMore : data.entries.length >= LADDER_PAGE_SIZE);
            setNextBandIndex(data.band ? data.band.index + 1 : 0);
            setError(null);
          } else {
            setError(envelope.message ?? "榜单请求失败");
          }
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : "榜单请求失败");
        })
        .finally(() => {
          if (!controller.signal.aborted) setPending(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchQuery, setError, setPending]);

  /**
   * 上拉加载更多（R-83 T3 分数带分窗）：滚动触带底 → 拉取下一带（band=nextBandIndex），
   * 返回项按 modelId 去重后并档；穷尽判定取响应 band 元数据（旧形状回退条数判定）。
   */
  function loadMore() {
    if (loadingMoreRef.current || loadingMore || !hasMore) return;
    const queryAtCall = fetchQuery;
    const seqAtCall = loadMoreSeqRef.current;
    const bandAtCall = nextBandIndex;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;
    fetch(`/api/v1/ladder?${queryAtCall}&band=${bandAtCall}`, { signal: controller.signal })
      .then(async (res) => (await res.json()) as EnvelopeShape)
      .then((envelope) => {
        if (controller.signal.aborted || seqAtCall !== loadMoreSeqRef.current || queryAtCall !== fetchQuery) return;
        const data = envelope.data as LadderRankingData | null;
        if (envelope.code === 0 && data && Array.isArray(data.entries)) {
          const known = new Set(rankingData.entries.map((e) => e.modelId));
          const fresh = data.entries.filter((e) => !known.has(e.modelId));
          setRankingData((prev) => ({
            ...prev,
            entries: [...prev.entries, ...fresh],
            updatedAt: data.updatedAt,
            // v2.6：band 元数据随并档前进（底部分带状态指示的数据源）；响应缺 band 时保留旧值
            band: data.band ?? prev.band,
          }));
          // 穷尽判定：band 元数据优先（带下限 > 0 即还有更低的带）；
          // 旧形状回退「有新增且条数满页」口径（防零新增空转续拉）
          if (data.band) {
            setHasMore(data.band.hasMore);
            setNextBandIndex(data.band.index + 1);
          } else {
            setHasMore(fresh.length > 0 && data.entries.length >= LADDER_PAGE_SIZE);
          }
          setError(null);
        } else {
          setError(envelope.message ?? "榜单请求失败");
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || seqAtCall !== loadMoreSeqRef.current) return;
        setError(err instanceof Error ? err.message : "榜单请求失败");
      })
      .finally(() => {
        if (seqAtCall === loadMoreSeqRef.current) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      });
  }

  const markDirty = () => {
    // 立即视觉反馈位；真实拉取由上方 effect 去重编排
    setPending(true);
  };

  // 数据更新时间（pending 时显「更新中…」）：元信息行与工具栏行3共用
  const updatedNode = pending ? (
    <span data-testid="ladder-pending" className="animate-pulse font-medium text-primary">
      更新中…
    </span>
  ) : (
    <>数据更新于 {new Date(rankingData.updatedAt).toLocaleString("zh-CN", { hour12: false })}</>
  );

  // v2.6 底部分带状态文案（band 元数据驱动）：lo/hi=下一待拉带的分数区间
  const band = rankingData.band;
  const loadingBandLabel = band
    ? `正在加载 ${Math.max(0, 100 - (nextBandIndex + 1) * band.height)}–${100 - nextBandIndex * band.height} 分带…`
    : undefined;
  const bandHint = band
    ? `已加载至 ${100 - nextBandIndex * band.height} 分 · 继续下滑加载 ${Math.max(0, 100 - (nextBandIndex + 1) * band.height)}–${100 - nextBandIndex * band.height} 分带`
    : undefined;

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <QuerySyncBridge pageType={pageType} />
      </Suspense>

      {/* v2.8 英雄横幅（页头说明区）：背景**全宽通栏**（-mx 逃逸 main 左右内边距，色带拉直拉通到页面两缘），
          内容居中于 max-w-6xl；hero（徽标+H1，服务端渲染插槽）+ 副题居中 + 数据更新时间贴内容区右缘。
          未传 subtitle 的页面（stations）不渲染，行3 维持原样 */}
      {subtitle ? (
        <div className="relative -mx-4 overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50/80 to-sky-50/50 md:-mx-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/[0.08] to-transparent"
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 pb-3 pt-8 text-center md:px-6">
            {hero}
            <p className="mt-1.5 text-sm leading-7 text-muted-foreground">{subtitle}</p>
            <div className="mt-1 flex justify-end">
              <span className="whitespace-nowrap text-xs text-slate-500" data-testid="ladder-updated-meta">
                {updatedNode}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 工具栏吸顶（v1.7）：滚动天梯图时筛选/排序/视图切换常驻；负外边距让背景全宽铺满 */}
      <div className="sticky top-[64px] z-20 -mx-4 border-b border-slate-200/70 bg-white/85 px-4 pb-3.5 pt-3.5 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl md:-mx-6 md:px-6">
        {/* 行1（v2.3 回退）：筛选栏（左）｜专业版/应用版（右）——横向位置延续原版式 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LadderFilterBar onQueryChange={markDirty} />
          <VersionSwitcher onChange={markDirty} />
        </div>

        {/* 行2（v2.3 回退）：排序 + 分度值 + 阵营开关（左）｜天梯图/柱状图切换（右）——横向位置延续原版式 */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <LadderSortBar onQueryChange={markDirty} />
            <GranularitySelector value={axisGranularity} defaultValue={granularity} onChange={setAxisGranularity} />
            {campControls ? (
              <div className="flex items-center gap-2" role="group" aria-label="阵营显示开关">
                <button
                  type="button"
                  aria-pressed={showIntl}
                  title={showIntl ? "取消勾选隐藏国外系列（仅显示国内时性能轴居左）" : "勾选显示国外系列（居性能轴左侧）"}
                  onClick={() => toggleCamp("intl")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-slate-100 ${
                    showIntl ? "font-medium text-slate-700" : "text-slate-400"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-[4px] ${showIntl ? "bg-sky-500 shadow-[0_0_0_2px_rgba(14,165,233,0.2)]" : "border border-slate-300 bg-white"}`}
                  />
                  国外（左）
                </button>
                <button
                  type="button"
                  aria-pressed={showDom}
                  title={showDom ? "取消勾选隐藏国内系列（仅显示国外时性能轴居右）" : "勾选显示国内系列（居性能轴右侧）"}
                  onClick={() => toggleCamp("dom")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-slate-100 ${
                    showDom ? "font-medium text-slate-700" : "text-slate-400"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-[4px] ${showDom ? "bg-rose-500 shadow-[0_0_0_2px_rgba(244,63,94,0.2)]" : "border border-slate-300 bg-white"}`}
                  />
                  国内（右）
                </button>
              </div>
            ) : null}
          </div>
          <div
            role="group"
            aria-label="视图切换"
            className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              aria-pressed={view === "table"}
              title="天梯矩阵图视图（左国外 · 右国内）"
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm transition-colors ${
                view === "table" ? "bg-primary text-[var(--primary-foreground)]" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Trophy className="h-4 w-4" aria-hidden="true" />
              天梯图
            </button>
            <button
              type="button"
              aria-pressed={view === "chart"}
              title="柱状图视图（零请求同源渲染）"
              onClick={() => setView("chart")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm transition-colors ${
                view === "chart" ? "bg-primary text-[var(--primary-foreground)]" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              柱状图
            </button>
          </div>
        </div>

        {/* 行3 stations-only：数据更新时间（v2.5 起 models 传入 subtitle 后，更新时间上移至元信息行，此处仅 stations 保留） */}
        {subtitle ? null : (
          <div className="mt-3 flex flex-col items-center gap-1.5 text-xs text-slate-500">
            <span className="whitespace-nowrap">{updatedNode}</span>
          </div>
        )}
      </div>

      {lastError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">
          {lastError}
        </p>
      ) : null}

      {view === "table" ? (
        <LadderMatrixBoard
          entries={visibleEntries}
          pageType={pageType}
          granularity={axisGranularity}
          tierThresholds={tierThresholds}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          hotVendorCount={hotVendorCount}
          loadingBandLabel={loadingBandLabel}
          bandHint={bandHint}
          // v2.7 渐进轴底：已载下界（band.gte）——轴随分带加载向下生长，触底判定锚定已载末行
          axisFloor={rankingData.band?.gte ?? 0}
        />
      ) : (
        <LadderBarChart entries={visibleEntries} pageType={pageType} />
      )}
    </div>
  );
}

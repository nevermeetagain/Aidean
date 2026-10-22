"use client";

/**
 * 天梯矩阵图（快科技 CPU 天梯图式改版，替代排行表 LadderRankingTable）：
 * - 橙色渐变性能轴（上=高性能）承载综合分刻度，两侧为产品系列列；
 * - models 榜：左=国外厂商、右=国内厂商（vendors.country === "CN" 判定），
 *   列=产品系列（ChatGPT/Claude/GLM/Qwen…，由模型名规则推导，兜底厂商名）；
 * - 列排序（v1.9 厂商优先级贴轴）：vendors.priority 数值越小优先级越高，离性能轴越近，
 *   同优先级按列内最高综合分降序；双侧时国内最强贴轴、国外最强贴轴（镜像），单侧时高低优先级交替对称铺开；
 * - stations 榜：无国别字段 → 退化为对称布局（每站一列，按优先级交替分列轴两侧）；
 * - 卡片按综合分落入固定颗粒档（v1.9：档高=颗粒值，默认 0.1，如 98.9 与 98.8 相邻档；
 *   v2.0 默认值=后台配置经分度值下拉透出，用户可即时改档），
 *   综合分越高越靠上；rank 恒为综合分名次（服务端 competition ranking，同分并列，与排序解耦）；
 * - 卡片为语义化 <Link>（slug 优先回退 id），title 承载完整参数详情（说明口径不变）；
 * - 列头吸顶（容器限高纵向滚动不丢列名）；
 * - v1.7：grid 弹性布局，列宽 flex 自适应容器宽度，不支持横向滚动；
 * - v1.8：卡片两行制（行1=模型名，行2=名次徽章+综合分·说明）；阵营开关仅呈现层显隐；
 * - v1.9：下拉自动加载（容器滚动近底部触发 onLoadMore），数据穷尽处显示「到底了」提醒；
 * - v2.0：性能轴每档一枚刻度全部标注性能值；标题行上移至 LadderBoard（与数据更新时间同行）；
 * - v2.7 渐进轴（管理者口径「没翻到最后一行就不该触底」+ 成功案例模式：哨兵锚定已载末行、容器随加载增长）：
 *   轴量程 = 已载分数区间 [band.gte, 100]（buildLayout axisFloorScore），随分带向下生长（80→60→…→0）；
 *   触底判定「距容器底 <240px」由此锚定已载末行；**停底自动续载链已删除**——新带加载后轴向下生长，
 *   用户必然离开底缘，再滚动才触发下一带（严格「下滑加载」，杜绝人未到末行先触底的静默级联）。
 * - v2.1：定距档口径（分度值 = 相邻两行性能差值）——分度值下拉（LadderBoard 行2，排序右方）切换即时重排。
 * - UX-06（2026-10-22）：列宽下限 MIN_COL_W=128px——默认按视口宽度（纯 CSS 断点，SSR 即正确、零布局跳动）
 *   只显示贴轴的前 N 列，保证卡片名称 ≥10 字符可见（原 1440 下卡宽 ~85px 仅露 3 字符、390 下出现 16px 窄卡）；
 *   「展开全部」后列宽保持 ≥128px 并允许横向滚动。
 * - UX-07（2026-10-22）：轴顶 = 已载最高综合分向上取整（computeAxisTop，见 matrix-layout），首屏即见首张卡。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLadderStore } from "../../stores/ladderStore";
import type { LadderPageType } from "../../stores/ladderStore";
import { CompareAddButton } from "../site/CompareAddButton";
import { FavoriteButton } from "../site/FavoriteButton";
import { LADDER_SHOWCASE_AUTO_SCROLL, type LadderRankEntry } from "../../lib/features/ladder/types";
import { getTier, type TierThresholds, type PerformanceTier } from "../../lib/features/ladder/config";
import { ROW_H, buildLayout, computeAxisTop } from "../../lib/features/ladder/matrix-layout";
import type { MatrixColumn, MatrixLayout, ScoreTick } from "../../lib/features/ladder/matrix-layout";

/** 卡片高度 */
const CARD_H = 44;
/** 中央性能轴宽 */
const AXIS_W = 64;
/** UX-06 列宽下限（px）：卡片名称 12px 字号下 ≥10 字符可见 */
const MIN_COL_W = 128;
/**
 * UX-06 按视口宽度的列显隐（纯 CSS 断点，SSR 首帧即正确）：下标 i = 该侧列序（与热门收敛 slice 同序，靠前者优先保留）。
 * 双侧：每侧容量 ≈ floor((视口 − 页边距 − 轴宽) / 2 / 128)：<640=1、sm=2、lg=3、xl=4、1440=5、1720=6、1980=7。
 * 单侧（只看一个阵营时）：容量 ≈ floor((视口 − 页边距 − 轴宽) / 128)。
 * 超出表长的列默认隐藏（"hidden"），仅「展开全部」后显示。字面量供 Tailwind 扫描，勿拼接。
 */
const COL_VIS_TWO_SIDES = [
  "flex",
  "hidden sm:flex",
  "hidden lg:flex",
  "hidden xl:flex",
  "hidden min-[1440px]:flex",
  "hidden min-[1720px]:flex",
  "hidden min-[1980px]:flex",
] as const;
const COL_VIS_ONE_SIDE = [
  "flex",
  "flex",
  "hidden sm:flex",
  "hidden sm:flex",
  "hidden md:flex",
  "hidden lg:flex",
  "hidden lg:flex",
  "hidden xl:flex",
  "hidden xl:flex",
  "hidden min-[1440px]:flex",
  "hidden 2xl:flex",
  "hidden min-[1720px]:flex",
] as const;
function colVisibility(index: number, sides: 1 | 2, expanded: boolean): string {
  if (expanded) return "flex";
  const table = sides === 2 ? COL_VIS_TWO_SIDES : COL_VIS_ONE_SIDE;
  return table[index] ?? "hidden";
}
/** 近底部触发加载的提前量（px）——v2.7 渐进轴下即「距已载末行」的提前量 */
const LOAD_MORE_THRESHOLD = 240;
/** L2-4：自动循环滚动的最小条目数——低于此值不启动自动滚动 */
const MIN_ENTRIES_FOR_AUTOSCROLL = 10;
/** L2-4：自动滚动速度（px/frame，约 30px/s @60fps） */
const AUTOSCROLL_SPEED = 0.5;
/** R-83 T3 刻度窗口化：视口上下各多渲染的缓冲行数（轴刻度 1001 枚 → 仅渲染可见 ± 缓冲） */
const TICK_BUFFER_ROWS = 20;
/** 刻度窗口化的首屏兜底行数（视口测量完成前按一屏估算，防 SSR/首帧渲染全量刻度） */
const TICK_FIRST_PAINT_ROWS = 24;

/** 性能区段视觉口径（R-53 / TP-4.1）：高性能绿 / 中等黄 / 低性能灰 */
const TIER_RING: Record<PerformanceTier, string> = {
  high: "ring-2 ring-emerald-400/60",
  mid: "ring-1 ring-amber-300/50",
  low: "ring-1 ring-slate-200",
};
const TIER_DOT: Record<PerformanceTier, string> = {
  high: "bg-emerald-400",
  mid: "bg-amber-300",
  low: "bg-slate-300",
};

/** 刻度格式：0 恒显 "0"；整数值省小数（100 而非 100.0）；颗粒 >=1 取整；>=0.1 保留 1 位；更细保留 2 位 */
const fmtTick = (value: number, granularity: number): string => {
  if (value <= 0) return "0";
  if (Number.isInteger(value)) return String(value);
  if (granularity >= 1) return String(Math.round(value));
  if (granularity >= 0.1) return value.toFixed(1);
  return value.toFixed(2);
};

/** 价格（¥/M Tokens）：去尾零；未公开 — */
const fmtPrice = (value: number | null): string =>
  value === null ? "—" : `¥${value.toFixed(2).replace(/\.00$/, "")}`;

/** 上下文长度：K/M 缩写 */
const fmtCtx = (value: number | null): string => {
  if (value === null) return "—";
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
};

type ColumnTone = "intl" | "dom" | "all";

const TONE_STRIP: Record<ColumnTone, string> = {
  intl: "bg-sky-500",
  dom: "bg-rose-500",
  all: "bg-primary",
};

/** 轴顶色条口径：both=双侧渐变（左右阵营并存），单侧阵营=该阵营纯色，无阵营数据=主色 */
type AxisTone = ColumnTone | "both";
const AXIS_STRIP: Record<AxisTone, string> = {
  ...TONE_STRIP,
  both: "bg-gradient-to-r from-sky-500 to-rose-500",
};

/** 轴位（v1.8）：center=双勾/双不勾居中；left=仅国内（轴居左）；right=仅国外（轴居右） */
type AxisPosition = "center" | "left" | "right";

const GRID_COLS: Record<AxisPosition, string> = {
  center: "grid-cols-[1fr_auto_1fr]",
  left: "grid-cols-[auto_1fr]",
  right: "grid-cols-[1fr_auto]",
};

/** rank 徽章：1 号实底强调，2/3 浅底，其余中性 */
function rankChipCls(rank: number): string {
  const base =
    "inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-[5px] px-0.5 text-[10px] font-bold leading-4 tabular-nums";
  if (rank === 1) return `${base} bg-primary text-[var(--primary-foreground)] shadow-sm`;
  if (rank <= 3) return `${base} bg-primary/10 text-primary`;
  return `${base} bg-slate-100 text-slate-500`;
}

function cardMeta(entry: LadderRankEntry, pageType: LadderPageType): string {
  const parts: string[] = [`综合 ${fmtTick(entry.score.composite, 0.1)}`];
  if (pageType === "models") {
    if (entry.price.priceInput !== null || entry.price.priceOutput !== null) {
      parts.push(`${fmtPrice(entry.price.priceInput)} / ${fmtPrice(entry.price.priceOutput)} 每M`);
    }
  } else {
    if (entry.avgLatency !== null) parts.push(`${Math.round(entry.avgLatency)}ms`);
    if (entry.uptime !== null) parts.push(`${entry.uptime.toFixed(1)}%`);
  }
  return parts.join(" · ");
}

function cardTitle(entry: LadderRankEntry, pageType: LadderPageType): string {
  const lines = [
    `${entry.modelName} · ${entry.vendorName}`,
    `综合分 ${fmtTick(entry.score.composite, 0.1)}（第 ${entry.rank} 名）`,
  ];
  if (pageType === "models") {
    lines.push(`输入/输出价：${fmtPrice(entry.price.priceInput)} / ${fmtPrice(entry.price.priceOutput)} 每百万 Tokens`);
    lines.push(`上下文：${fmtCtx(entry.contextLength)}`);
  } else {
    lines.push(`响应速度：${entry.avgLatency === null ? "—" : `${Math.round(entry.avgLatency)}ms`}`);
    lines.push(`在线率：${entry.uptime === null ? "—" : `${entry.uptime.toFixed(1)}%`}`);
  }
  return lines.join("\n");
}

/**
 * v1.8 两行制卡片：行1=模型名，行2=名次徽章+综合分·说明（cardMeta 口径不变，名次为
 * 服务端 competition ranking 并列名次——同分并列同一名次）。
 *
 * WP-FE01 死链修复：stations 榜的「一行」是 API 站点而非模型，其标识为站台 id，
 * 不存在站点详情页——原实现一律链向 `/models/{slug ?? modelId}` 会落到「该模型暂未收录」死链。
 * 故 stations 榜卡片改为非导航呈现（保留完整 title 与品牌色条），models 榜维持 Link。
 */
function MatrixCard({ entry, row, pageType, tierThresholds }: { entry: LadderRankEntry; row: number; pageType: LadderPageType; tierThresholds: TierThresholds }) {
  const tier = getTier(entry.score.composite, tierThresholds);
  const baseCls =
    `absolute inset-x-1 flex items-center gap-1.5 overflow-hidden rounded-[10px] border border-slate-200/90 bg-white pl-1.5 pr-2 shadow-[var(--shadow-sm)] ${TIER_RING[tier]}`;
  const inner = (
    <>
      <span
        aria-hidden="true"
        className="h-6 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: entry.vendorBrandColor || "#94a3b8" }}
      />
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${TIER_DOT[tier]}`} title={`性能区段: ${tier === "high" ? "高性能" : tier === "mid" ? "中等" : "低性能"}`} />
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <span className="truncate text-xs font-semibold leading-4 text-slate-800">{entry.modelName}</span>
        <span className="flex min-w-0 items-center gap-1">
          <span className={rankChipCls(entry.rank)}>{entry.rank}</span>
          <span className="truncate text-[10px] leading-3 tabular-nums text-slate-500">
            {cardMeta(entry, pageType)}
          </span>
        </span>
      </span>
    </>
  );

  if (pageType === "stations") {
    // 非交互卡片：保留可见文本（站名/名次/综合分·延迟），title 承载完整参数详情
    return (
      <div
        title={cardTitle(entry, pageType)}
        className={baseCls}
        style={{ top: row * ROW_H + (ROW_H - CARD_H) / 2, height: CARD_H }}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/models/${entry.slug ?? entry.modelId}`}
      title={cardTitle(entry, pageType)}
      className={`group ${baseCls} transition duration-150 hover:-translate-y-px hover:border-primary/50 hover:shadow-[var(--shadow-md)]`}
      style={{ top: row * ROW_H + (ROW_H - CARD_H) / 2, height: CARD_H }}
    >
      <span
        aria-hidden="true"
        className="h-6 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: entry.vendorBrandColor || "#94a3b8" }}
      />
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <span className="truncate text-xs font-semibold leading-4 text-slate-800 transition-colors group-hover:text-primary">
          {entry.modelName}
        </span>
        <span className="flex min-w-0 items-center gap-1">
          <span className={rankChipCls(entry.rank)}>{entry.rank}</span>
          <span className="truncate text-[10px] leading-3 tabular-nums text-slate-500">
            {cardMeta(entry, pageType)}
          </span>
        </span>
      </span>
    </Link>
  );
}

/** 卡片「+对比」悬浮按钮（EVAL-01）：浮于卡片右上角，点击加入/移出对比篮 */
function CompareAddButtonWrap({ entry, row }: { entry: LadderRankEntry; row: number }) {
  return (
    <div
      className="absolute z-10 flex items-start justify-end p-1"
      style={{ top: row * ROW_H + (ROW_H - CARD_H) / 2, right: 0, height: CARD_H, width: 28 }}
    >
      <CompareAddButton
        modelId={entry.modelId}
        nameDisplay={entry.modelName}
        slug={entry.slug}
        size="sm"
      />
    </div>
  );
}

/**
 * 卡片「收藏」浮钮（TASK-023）：与「+对比」并列浮于卡片右上角（对比按钮左侧），
 * 悬浮不遮分数/名次（分数在卡片左下，浮钮恒在右上）。refType 依 pageType 归一：
 *   models 榜=MODEL（refId=AiModel.id）；stations 榜=API_STATION（refId=APIStation.id）。
 * favorites.enabled 关闭时 FavoriteButton 自身返回 null（受控面）。
 */
function FavoriteButtonWrap({ entry, row, pageType }: { entry: LadderRankEntry; row: number; pageType: LadderPageType }) {
  return (
    <div
      className="absolute z-10 flex items-start justify-end p-1"
      style={{ top: row * ROW_H + (ROW_H - CARD_H) / 2, right: 28, height: CARD_H, width: 26 }}
    >
      <FavoriteButton
        refType={pageType === "stations" ? "API_STATION" : "MODEL"}
        refId={entry.modelId}
        name={entry.modelName}
        size="sm"
      />
    </div>
  );
}

/** 档位网格线背景：每 ROW_H 一条 1px 淡线 */
const GRID_STYLE: React.CSSProperties = {
  backgroundImage: `repeating-linear-gradient(to bottom, rgba(148,163,184,0.16) 0px, rgba(148,163,184,0.16) 1px, transparent 1px, transparent ${ROW_H}px)`,
};

function MatrixColumnTrack({
  col,
  height,
  tone,
  pageType,
  tierThresholds,
  visibility,
  expanded,
}: {
  col: MatrixColumn;
  height: number;
  tone: ColumnTone;
  pageType: LadderPageType;
  tierThresholds: TierThresholds;
  /** UX-06 显隐类（含 display，见 colVisibility） */
  visibility: string;
  /** 展开全部：列宽 ≥ MIN_COL_W，容器横向滚动 */
  expanded: boolean;
}) {
  return (
    <div
      data-matrix-col=""
      className={`${visibility} flex-1 basis-0 flex-col border-r border-slate-200 last:border-r-0`}
      style={{ minWidth: expanded ? MIN_COL_W : 0 }}
    >
      <div className="sticky top-0 z-10 bg-white">
        <div className={`h-1 w-full ${TONE_STRIP[tone]}`} aria-hidden="true" />
        <div className="flex h-11 flex-col justify-center border-b border-slate-200 bg-white/95 px-1">
          <div className="truncate text-center text-xs font-semibold text-slate-700" title={`${col.series} · ${col.vendorName}`}>
            {col.series}
          </div>
          <div className="truncate text-center text-[10px] leading-4 text-slate-400">{col.vendorName}</div>
        </div>
      </div>
      <div className="relative grow" style={{ height, ...GRID_STYLE }}>
        {col.cells.map(({ entry, row }) => (
          <div key={entry.modelId} className="group/compare relative">
            <MatrixCard entry={entry} row={row} pageType={pageType} tierThresholds={tierThresholds} />
            <FavoriteButtonWrap entry={entry} row={row} pageType={pageType} />
            <CompareAddButtonWrap entry={entry} row={row} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AxisTrack({
  height,
  ticks,
  granularity,
  tone,
  visibleRows,
}: {
  height: number;
  ticks: ScoreTick[];
  granularity: number;
  tone: AxisTone;
  /** R-83 T3 刻度窗口化：仅渲染 [from,to] 行区间内的刻度（绝对定位 + 总高占位，位置恒定） */
  visibleRows: { from: number; to: number };
}) {
  const visible = useMemo(
    () => ticks.filter(({ row }) => row >= visibleRows.from && row <= visibleRows.to),
    [ticks, visibleRows.from, visibleRows.to]
  );
  return (
    <div className="flex shrink-0 flex-col" style={{ width: AXIS_W }} aria-hidden="true">
      <div className="sticky top-0 z-10 bg-white">
        <div className={`h-1 w-full ${AXIS_STRIP[tone]}`} />
        <div className="flex h-11 items-end justify-center border-b border-slate-200 bg-white/95">
          <span className="mb-1 block h-0 w-0 border-x-[7px] border-b-[10px] border-x-transparent border-b-amber-400" />
        </div>
      </div>
      <div className="relative grow" style={{ height, ...GRID_STYLE }}>
        <div className="absolute inset-y-1 left-1/2 w-9 -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-400 via-amber-200 to-slate-200 shadow-[0_0_20px_rgba(245,158,11,0.18)]" />
        <span className="absolute left-1/2 top-4 -translate-x-1/2 text-xs font-bold tracking-[0.28em] text-slate-100 [writing-mode:vertical-rl] drop-shadow-[0_1px_1px_rgba(15,23,42,0.28)]">
          高性能
        </span>
        {visible.map(({ row, score }, index) => {
          // 顶格（row 0）标签列线下方对齐避免吸顶裁切；底缘 0 刻度整标签置于底缘线上方，完整可见
          const isBottomEdge = score === 0 && index === visible.length - 1;
          return (
            <span
              key={row}
              className={`absolute left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap rounded border border-slate-200 bg-white px-1 text-[10px] leading-4 tabular-nums text-slate-600 shadow-sm ${
                row === 0 ? "" : isBottomEdge ? "translate-y-full" : "-translate-y-1/2"
              }`}
              style={{ top: row * ROW_H }}
            >
              {fmtTick(score, granularity)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

interface LadderMatrixBoardProps {
  entries: LadderRankEntry[];
  pageType: LadderPageType;
  /** 性能轴颗粒度（v1.9，后台可配，默认 0.1）：轴刻度/分隔档的固定分割值 */
  granularity: number;
  /** 性能区段阈值（R-53 / TP-4.1，后台可配，默认 high≥80 mid≥60） */
  tierThresholds?: TierThresholds;
  /** 无限滚动（v1.9）：hasMore=false 时滚动到底显示「到底了」提醒 */
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore?: () => void;
  /** v2.6 加载态分带文案（如「正在加载 60–80 分带…」，LadderBoard 由 band 元数据计算；缺省回退通用文案） */
  loadingBandLabel?: string;
  /** v2.6 待载提示分带文案（如「已加载至 80 分 · 下滑继续加载 60–80 分带」） */
  bandHint?: string;
  /** v2.7 渐进轴底（分数）：轴只铺已载区间 [axisFloor, 100]，随分带加载向下生长；缺省 0=全量程 */
  axisFloor?: number;
  /** R-83 T4：默认展示的热门开发商列数（后台可配；缺省/0=不限，全部展示） */
  hotVendorCount?: number;
}

export function LadderMatrixBoard({ entries, pageType, granularity, tierThresholds, hasMore, loadingMore, onLoadMore, hotVendorCount, loadingBandLabel, bandHint, axisFloor }: LadderMatrixBoardProps) {
  // UX-07：轴顶 = 已载最高综合分向上取整（分带自顶向下加载，首带即含最高分，续载后不变）
  const axisTop = useMemo(() => computeAxisTop(entries, granularity), [entries, granularity]);
  const layout = useMemo(
    () => buildLayout(entries, pageType === "models", granularity, axisFloor ?? 0, axisTop),
    [entries, pageType, granularity, axisFloor, axisTop]
  );
  const showIntl = useLadderStore((s) => s.showIntl);
  const tiers = tierThresholds ?? { high: 80, mid: 60 };
  const showDom = useLadderStore((s) => s.showDom);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ---- R-83 T3 刻度窗口化：跟踪滚动位置，仅渲染可见 ± 缓冲的轴刻度 ----
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const scrollFrameRef = useRef<number | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.clientHeight > 0) setViewportH(el.clientHeight);
  }, []);
  const viewFrom = Math.max(0, Math.floor(scrollTop / ROW_H) - TICK_BUFFER_ROWS);
  const viewTo = Math.ceil((scrollTop + (viewportH || TICK_FIRST_PAINT_ROWS * ROW_H)) / ROW_H) + TICK_BUFFER_ROWS;

  // ---- L2-4 自动循环滚动（R-83 T3 解耦）：总开关默认关（LADDER_SHOWCASE_AUTO_SCROLL=false）----
  // 如需橱窗展示（展会大屏）把 types.ts 中常量置 true；动效运行期间绝不触发 onLoadMore
  //（见 handleScroll 守卫；v2.7 起自动续载链已删，动效×加载无叠加路径），杜绝无人值守无界累积。
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const rafRef = useRef<number | null>(null);
  const shouldAutoScroll =
    LADDER_SHOWCASE_AUTO_SCROLL && entries.length >= MIN_ENTRIES_FOR_AUTOSCROLL && !autoScrollPaused;

  /** v1.9 上拉加载：容器滚动近底部（提前量 240px）触发追加取数；展示动效运行期间守卫跳过 */
  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    // 刻度窗口化：rAF 节流记录滚动位置（高频事件下避免渲染风暴）
    if (scrollFrameRef.current === null) {
      const snapedEl = el;
      scrollFrameRef.current = requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        setScrollTop(snapedEl.scrollTop);
        if (snapedEl.clientHeight > 0 && snapedEl.clientHeight !== viewportH) setViewportH(snapedEl.clientHeight);
      });
    }
    if (!hasMore || loadingMore || !onLoadMore) return;
    if (shouldAutoScroll) return; // 展示动效永不触发加载
    if (el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD) {
      onLoadMore();
    }
  }

  // v2.7：v2.0「停底自动续载链」已随渐进轴删除——全量程恒定 scrollHeight 是该链存在的前提
  //（轴不生长才需要「数据到达后复检离底」防停摆）；渐进轴下每带加载使轴向下生长 ~一屏以上，
  // 用户必然离开底缘，再次滚动才触发下一带——严格「下滑加载」，且从机制上杜绝
  // 「人未到末行先触底」的静默级联（成功案例模式：哨兵=已载末行，容器随加载增长）。
  // 展示动效（LADDER_SHOWCASE_AUTO_SCROLL）期间 handleScroll 守卫跳过的口径不变。

  useEffect(() => {
    if (!shouldAutoScroll) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const tick = () => {
      // 到底（或内容不足一屏）→ 回到顶部循环
      if (el.scrollHeight - el.clientHeight <= 0 || el.scrollTop >= el.scrollHeight - el.clientHeight - 1) {
        el.scrollTop = 0;
      } else {
        el.scrollTop += AUTOSCROLL_SPEED;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [shouldAutoScroll]);

  // ---- R-83 T4 热门开发商列收敛（usestate 在前满足 hooks 规则；派生计算在 layout 空检之后）----
  const [showAllVendors, setShowAllVendors] = useState(false);
  // UX-06：挂载后统计被宽度断点隐藏的列数（仅用于提示条文案/按钮，不参与布局 → 无 CLS）
  const [widthHidden, setWidthHidden] = useState<number | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const count = () => {
      const cols = el.querySelectorAll<HTMLElement>("[data-matrix-col]");
      let hidden = 0;
      cols.forEach((c) => {
        if (window.getComputedStyle(c).display === "none") hidden += 1;
      });
      setWidthHidden(hidden);
    };
    count();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(count);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout, showAllVendors, showIntl, showDom, hotVendorCount]);

  if (!entries.length || !layout) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        暂无数据
      </div>
    );
  }

  const totalVendors = layout.left.length + layout.right.length;
  const vendorLimit = hotVendorCount && hotVendorCount > 0 ? hotVendorCount : 0;
  const collapsing = vendorLimit > 0 && !showAllVendors && totalVendors > vendorLimit;
  const perSide = Math.max(1, Math.ceil(vendorLimit / 2));
  const leftCols = collapsing ? layout.left.slice(0, perSide) : layout.left;
  const rightCols = collapsing ? layout.right.slice(0, perSide) : layout.right;
  const expanded = showAllVendors;

  // 阵营开关仅对 models 双侧数据生效（stations/单阵营数据恒对称布局，不受开关影响）；
  // 开关只做呈现层显隐——布局高度与轴刻度仍按全量数据推导，切换不跳变、量尺恒定。
  const campControls = pageType === "models" && layout.split;
  const axisPos: AxisPosition = !campControls
    ? "center"
    : !showIntl && showDom
      ? "left"
      : showIntl && !showDom
        ? "right"
        : "center";
  const showLeft = !campControls || showIntl;
  const showRight = !campControls || showDom;
  // UX-06：可见侧数决定每侧容量（单侧时容量翻倍）
  const visibleSides: 1 | 2 = showLeft && showRight && leftCols.length > 0 && rightCols.length > 0 ? 2 : 1;
  // 可能被宽度断点隐藏：任一可见侧列数超过最窄屏容量（双侧 1 / 单侧 2）——SSR 即确定，提示条高度恒定
  const mayHideByWidth = !expanded && Math.max(showLeft ? leftCols.length : 0, showRight ? rightCols.length : 0) > (visibleSides === 2 ? 1 : 2);
  const renderedCount = (showLeft ? leftCols.length : 0) + (showRight ? rightCols.length : 0);
  const shownCount = Math.max(0, renderedCount - (widthHidden ?? 0));
  // 是否有可展开的列：挂载前按 SSR 推断（mayHideByWidth），挂载后按实测隐藏列数
  const canExpand = expanded || collapsing || (widthHidden === null ? mayHideByWidth : widthHidden > 0);
  const showBar = collapsing || mayHideByWidth || expanded || (vendorLimit > 0 && totalVendors > vendorLimit);
  const axisTone: AxisTone = !campControls
    ? layout.split
      ? "both"
      : "all"
    : showLeft && showRight
      ? "both"
      : showLeft
        ? "intl"
        : showRight
          ? "dom"
          : "both";

  const axisEl = (
    <AxisTrack
      height={layout.height}
      ticks={layout.ticks}
      granularity={layout.granularity}
      tone={axisTone}
      visibleRows={{ from: viewFrom, to: viewTo }}
    />
  );
  // 展开全部时侧容器不再 min-w-0：列宽 ≥128px 撑开网格，由滚动容器横向滚动
  const sideCls = expanded ? "flex items-stretch" : "flex min-w-0 items-stretch";
  const leftEl = (
    <div className={sideCls}>
      {showLeft
        ? leftCols.map((col, i) => (
            <MatrixColumnTrack
              key={col.key}
              col={col}
              height={layout.height}
              tone={layout.split ? "intl" : "all"}
              pageType={pageType}
              tierThresholds={tiers}
              // 显隐下标 = 列的优先级名次（保留最重要的列）：双侧阵营时左组按优先级正序排列（下标即名次）；
              // 单侧对称布局时左组为倒序（最高优先级在末尾贴轴），名次自末尾计
              visibility={colVisibility(layout.split ? i : leftCols.length - 1 - i, visibleSides, expanded)}
              expanded={expanded}
            />
          ))
        : null}
    </div>
  );
  const rightEl = (
    <div className={sideCls}>
      {showRight
        ? rightCols.map((col, i) => (
            <MatrixColumnTrack
              key={col.key}
              col={col}
              height={layout.height}
              tone="dom"
              pageType={pageType}
              tierThresholds={tiers}
              visibility={colVisibility(i, visibleSides, expanded)}
              expanded={expanded}
            />
          ))
        : null}
    </div>
  );

  return (
    <section aria-label="天梯矩阵图">
      {/* R-83 T4 热门开发商收敛条 + UX-06 窄屏列收敛提示：默认只显示贴轴的前 N 家（热门优先级 + 屏宽容量），其余一键展开。
          是否渲染在 SSR 即确定（mayHideByWidth），高度恒定；按钮在无隐藏列时 invisible 占位，挂载后的计数更新不引起位移 */}
      {showBar ? (
        <div className="mb-2 flex h-7 items-center justify-end gap-2 text-xs text-slate-500" data-testid="ladder-vendor-bar">
          <span>
            {widthHidden === null && !collapsing
              ? `共 ${totalVendors} 家开发商`
              : `已显示 ${shownCount} / ${totalVendors} 家开发商`}
            {collapsing ? "（按后台热门优先级排序）" : ""}
          </span>
          <button
            type="button"
            onClick={() => setShowAllVendors((v) => !v)}
            className={`rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 ${
              canExpand ? "" : "invisible"
            }`}
          >
            {expanded ? (vendorLimit > 0 ? "仅看热门" : "收起") : `展开全部 ${totalVendors} 家`}
          </button>
        </div>
      ) : null}
      {/* v1.8：轴位随阵营开关三态——只勾国内居左（auto_1fr）、只勾国外居右（1fr_auto）、双勾/双不勾居中（1fr_auto_1fr）
          v1.9：容器滚动近底部自动追加取数；穷尽后底部常驻「到底了」提醒
          v2.0：标题行上移至 LadderBoard 行3（与数据更新时间同行） */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseEnter={() => setAutoScrollPaused(true)}
        onMouseLeave={() => setAutoScrollPaused(false)}
        className={`max-h-[72vh] ${expanded ? "overflow-x-auto" : "overflow-x-hidden"} overflow-y-auto rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-md)]`}
      >
        <div className={`grid items-stretch ${GRID_COLS[axisPos]}`}>
          {axisPos === "left" ? (
            <>
              {axisEl}
              {rightEl}
            </>
          ) : axisPos === "right" ? (
            <>
              {leftEl}
              {axisEl}
            </>
          ) : (
            <>
              {leftEl}
              {axisEl}
              {rightEl}
            </>
          )}
        </div>
        <div
          data-testid="ladder-list-footer"
          className="border-t border-slate-100 bg-slate-50/60 py-2.5 text-center text-xs text-slate-400"
          aria-live="polite"
        >
          {loadingMore ? (
            <span className="animate-pulse text-primary">{loadingBandLabel ?? "加载中…"}</span>
          ) : hasMore ? (
            <span>{bandHint ?? "继续下拉加载更多"}</span>
          ) : (
            <span>
              到底了 · 已展示全部 {entries.length} 个条目
              {LADDER_SHOWCASE_AUTO_SCROLL && entries.length >= MIN_ENTRIES_FOR_AUTOSCROLL ? (
                <span className="ml-2 text-slate-400">
                  {autoScrollPaused ? "（悬停已暂停滚动）" : "（自动滚动中）"}
                </span>
              ) : null}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

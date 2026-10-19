/**
 * ladder 天梯图域 types（Task L.3.2 / M-LADDER T2.1 排行化重构）。
 *
 * 形态演进：早期为「行=分数档位 × 列=厂商 × 单元格=模型列表」三层矩阵
 * （MatrixCell/MatrixColumn/LadderMatrixRow 已删）；
 * 现为快科技式连续排行——**一行 = 一个模型/站点**，rank 按综合分降序的同分并列名次
 * （competition ranking），厂商降为行内徽章数据。@aidean/shared 契约不动（仅缓存版本号）。
 */
import type { RedisLike } from "../../db/redis";

export type LadderTypeValue = "models" | "stations";

/** 默认筛选的模型类型（v1.7）：类型组默认「推理」，其余组不限；SSR 首屏取数与 store 初始态共用同一常量 */
export const LADDER_DEFAULT_MODEL_TYPES: readonly string[] = ["REASONING"];

/**
 * 测评组「综合」选项值（v1.8）：综合分口径 = 四维测评分数（官方/实测/评测/自测）的平均值，
 * seed 数据全量满足该恒等式；SSR 首屏取数与 store 初始态共用，服务端对 benchmark 透传不过滤。
 */
export const LADDER_BENCHMARK_COMPOSITE = "composite";

/** 无限滚动页大小（v1.9）：SSR 首屏与客户端追加取数共用；返回条数小于该值即判定穷尽 */
export const LADDER_PAGE_SIZE = 100;

/**
 * R-83 T3：自动循环滚动展示动效的总开关（默认关）。
 * - 管理者口径（2026-09-26）：动效与加载彻底解耦——默认关闭；如需橱窗展示（展会大屏），
 *   将此常量置 true 启用，且组件侧保证动效运行期间**永不触发** onLoadMore（防无人值守无界累积）。
 */
export const LADDER_SHOWCASE_AUTO_SCROLL = false;

/** R-83 T3 分数带分窗元数据：随 bandIndex 查询附加在响应上，客户端据此续拉与判穷尽 */
export interface LadderBandMeta {
  /** 本次加载的带序号（0=顶带） */
  index: number;
  /** 带高度（分值，= 后台 ladder_load_window_pct） */
  height: number;
  /** 本带综合分下限（含）：max(0, 100-(index+1)*height) */
  gte: number;
  /** 还有更低的带吗（gte > 0） */
  hasMore: boolean;
}

/** 筛选条件（modelType/protocol 为枚举名大小写不敏感匹配，支持数组任一命中；isOpenSource 兼容 "true" 字符串；
 *  updatedWithin 以 publishedAt 窗口过滤：30d/90d/180d/365d/730d，v1.9 起支持数组（并集=最早下限）；
 *  tags 中「开源/闭源」为真实过滤标签（v1.9）：服务端推导 isOpenSource，同选/未选=不限制） */
export interface LadderFilters {
  modelType?: string | string[];
  protocol?: string | string[];
  isOpenSource?: boolean | string;
  /** 前端通道预留直传键（Task L.4.1）：URL 可回放，benchmark 服务端不参与过滤 */
  benchmark?: string[];
  tags?: string[];
  /** 发布时间窗口过滤（v1.7 起生效）：值形如 "30d"，"730d"=两年内；v1.9 支持多选（并集语义） */
  updatedWithin?: string | string[];
}

/**
 * 排行查询参数：
 * - sort 兼容 shared SortKey（default/scoreDesc/priceAsc/priceDesc/name）
 *   并扩展 composite/contextLength/price/latency/custom；
 * - customFormula 在 sort="custom" 时经 formula-parser 白名单求值，
 *   变量映射 vars = { score: 综合分, priceInput, contextLength }。
 * shared 的 LadderQuerySchema 保持不动，本类型供 service 直调与后续前端扩展使用。
 */
export interface MatrixQuery {
  type: LadderTypeValue;
  sort?: string;
  customFormula?: string;
  filters?: LadderFilters;
  /** 分页（v1.9 无限滚动）：rank/排序在全量上计算后切片；缺省=全量（兼容 SSR 全量消费方） */
  offset?: number;
  limit?: number;
  /**
   * R-83 T3 分数带分窗（上拉加载更多）：bandIndex=n → 只返回综合分位于
   * [max(0, 100-(n+1)*bandHeight), 100-n*bandHeight) 的条目（n=0 顶带含 100 分满分）。
   * 提供时取代 offset/limit 切片；bandHeight 缺省 20（后台 ladder_load_window_pct）。
   */
  bandIndex?: number;
  bandHeight?: number;
}

/** repository 平铺行的统一中间形状（models 来源与 stations 来源归一到此；stations 以站台自身充厂商） */
export interface MatrixItem {
  modelId: string;
  modelName: string;
  slug: string | null;
  /** stations 以站台自身 name 充当分组键（每站一列），同维度对齐 models 的厂商列 */
  vendorId: string;
  vendorName: string;
  vendorCode: string | null;
  vendorTierLevel: number;
  vendorBrandColor: string | null;
  /** 厂商国别（vendors.country，如 "CN"/"USA"）：天梯矩阵图据此划分左（国外）右（国内）阵营；stations 恒 null */
  vendorCountry: string | null;
  /** 厂商展示优先级（vendors.priority，1-99，1 最高；v1.9）：天梯矩阵图列排序——优先级越高的系列列离性能轴越近；stations 恒 50 */
  vendorPriority: number;
  score: {
    composite: number;
    official: number | null;
    actual: number | null;
    review: number | null;
    selfTest: number | null;
  };
  price: { priceInput: number | null; priceOutput: number | null };
  modelType: string | null;
  protocol: string | null;
  /** 发布时间（ISO 串；models 来源取 ai_models.published_at，stations 恒 null）：时间窗过滤与「最新」快速筛选排序键 */
  publishedAt: string | null;
  isOpenSource: boolean | null;
  contextLength: number | null;
  /** 仅 stations 榜有意义（响应速度排序键），models 恒 null */
  avgLatency: number | null;
  /** 仅 stations 榜携带（在线率），models 恒 null */
  uptime: number | null;
}

/** 排行条目：一行 = 一个模型/站点；rank 为按综合分降序的同分并列名次（competition ranking），与当前展示排序解耦 */
export type LadderRankEntry = MatrixItem & { rank: number };

/** getRanking 对外 DTO（缓存直接序列化本结构） */
export interface LadderRankingData {
  type: LadderTypeValue;
  /** 展示顺序 = 当前排序键全序（comparator 决定）；rank 字段恒为综合分名次 */
  entries: LadderRankEntry[];
  updatedAt: string;
  /** R-83 T3：bandIndex 查询时附带的分带元数据（旧缓存/全量查询无此字段） */
  band?: LadderBandMeta;
}

export interface GetRankingResult {
  data: LadderRankingData;
  /** true=Redis HIT；false=DB 直查并回写（或无缓存直查分支） */
  hit: boolean;
}

/** service 可替换依赖：repository 数据源 + cache 端口（显式传 null 表示禁用缓存走直查） */
export interface LadderDeps {
  repository?: Pick<typeof import("./repository").ladderRepository, "getModelsForMatrix" | "getStationsForMatrix"> &
    Partial<Pick<typeof import("./repository").ladderRepository, "getNextPriceBoundary">>; // TASK-097：可选，测试桩可不实现
  cache?: RedisLike | null;
}

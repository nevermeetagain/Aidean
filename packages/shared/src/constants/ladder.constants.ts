// 天梯图领域常量（Task 1.3  单一来源）
export const LADDER_TYPES = ["models", "stations"] as const;
export type LadderType = (typeof LADDER_TYPES)[number];

export const SORT_KEYS = ["default", "scoreDesc", "priceAsc", "priceDesc", "name"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** 图表视图默认拉取条数 */
export const CHART_DEFAULT_PAGE_SIZE = 50;

/** 天梯缓存版本号（策略变更时递增以失效旧缓存）
 *  v2（M-PERF A4）：MatrixCell 增加 slug 字段，旧缓存结构缺 slug，bump 强制全量重建
 *  v3（M-LADDER T2.1）：矩阵档位结构 → 快科技式扁平排行（entries[rank]），结构不兼容 bump
 *  v4（M-LADDER 天梯矩阵图）：MatrixItem 增加 vendorCountry（国别阵营），旧缓存缺该字段，bump 强制全量重建
 *  v5（M-LADDER 筛选改版）：MatrixItem 增加 publishedAt（时间窗过滤/最新排序），bump 强制全量重建
 *  v6（M-LADDER v1.9 管理配置版）：MatrixItem 增加 vendorPriority（厂商优先级贴轴排序），bump 强制全量重建
 *  v7（R-83 T3 分数带分窗）：查询指纹纳入 band 元数据（bandIndex/bandHeight），每带独立缓存，结构不兼容 bump
 *  v8（天梯 stations 量纲归一）：getStationsForMatrix 的 composite 由 0–5 星级 ×20 归一到 0–100，与分带窗口（顶带 [100-pct,100]）/区段阈值（high80/mid60）/性能轴口径对齐；旧 v7 stations 缓存为 0–5 量纲（顶带恒空）——口径不兼容，bump 强制全量重建 */
export const LADDER_CACHE_VERSION = "v8";
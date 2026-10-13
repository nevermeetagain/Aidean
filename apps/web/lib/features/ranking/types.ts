/**
 * ranking 模型榜单域 types：领域类型与对外 DTO。
 *
 * 评分维度命名对齐 prisma ModelScore 列：
 * - 4 主维：official/actual/review/selfTest
 * - 9 扩展维（R-34 集成）：reasoning/coding/math/multilingual/creativity/instruction/safety/efficiency/value
 * 扩展维度默认权重为 0（禁用），管理员可通过权重管理 UI 启用。
 * MatrixCell/MatrixRow 为 L.3 天梯矩阵预留的行·列·单元结构。
 */
export type ScoreDimension =
  | "official"
  | "actual"
  | "review"
  | "selfTest"
  | "reasoning"
  | "coding"
  | "math"
  | "multilingual"
  | "creativity"
  | "instruction"
  | "safety"
  | "efficiency"
  | "value";

/** 全部 13 个评分维度（4 主维 + 9 扩展维） */
export const ALL_DIMENSIONS: readonly ScoreDimension[] = [
  "official", "actual", "review", "selfTest",
  "reasoning", "coding", "math", "multilingual",
  "creativity", "instruction", "safety", "efficiency", "value",
] as const;

/** 单模型分值（缺维为 undefined，重算时跳过该维并归一化权重和） */
export type ScoreValues = Partial<Record<ScoreDimension, number>>;

/** 维度→权重快照（读自 ranking_weights 中 isActive 行，数值刻度不敏感，仅作相对比值） */
export type WeightsSnapshot = Partial<Record<ScoreDimension, number>>;

/** rankService.recap() 的返回结构 */
export interface RecapResult {
  updated: number;
  weights: WeightsSnapshot;
}

/** 天梯矩阵单元格：L.3.2 行=compositeScore 每 5 分一档降序，单元格含模型标识与分值 */
export interface MatrixCell {
  modelId: string;
  name: string;
  score: number;
  vendorName?: string;
}

/** 天梯矩阵行：tierLabel 形如 "[95,90)"，tierMin 为档位下界，vendors 为该档位下的单元格集合 */
export interface MatrixRow {
  tierLabel: string;
  tierMin: number;
  vendors: MatrixCell[];
}

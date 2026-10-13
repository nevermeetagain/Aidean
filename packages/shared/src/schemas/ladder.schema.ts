import { z } from "zod";
import { LADDER_TYPES, SORT_KEYS } from "../constants/ladder.constants";

export const LadderTypeEnum = z.enum(LADDER_TYPES);
export const SortKeyEnum = z.enum(SORT_KEYS);
export type LadderTypeQuery = z.infer<typeof LadderTypeEnum>;

export const ViewModeEnum = z.enum(["table", "chart"]);
export const ViewMode = ViewModeEnum;
export type ViewModeValue = z.infer<typeof ViewModeEnum>;

export const LadderQuerySchema = z.object({
  type: LadderTypeEnum,
  sort: SortKeyEnum.optional(),
  viewMode: ViewModeEnum.optional(),
});
export type LadderQuery = z.infer<typeof LadderQuerySchema>;

/** 矩阵行结构宽松化:允许附加字段透传,tierLabel 必填、vendors 不限元素形态 */
export const MatrixRowSchema = z
  .object({ tierLabel: z.string(), vendors: z.array(z.unknown()) })
  .passthrough();
export type MatrixRow = z.infer<typeof MatrixRowSchema>;

export const MatrixResponseSchema = z.object({
  type: LadderTypeEnum,
  rows: z.array(MatrixRowSchema),
  updatedAt: z.string().optional(),
});
export type MatrixResponse = z.infer<typeof MatrixResponseSchema>;
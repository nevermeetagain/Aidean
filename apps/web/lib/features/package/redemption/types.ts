/**
 * redemption 兑换码子域 types：集中 re-export 本域类型定义。
 *
 * 领域类型实际定义在 repository.ts（RedemptionRow, Tx）和 service.ts（BatchGenerateInput），
 * 此文件作为 barrel 提供统一导入入口。
 */
export type { RedemptionRow, Tx } from "./repository";
export type { BatchGenerateInput } from "./service";

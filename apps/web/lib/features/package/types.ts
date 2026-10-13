/**
 * package 套餐域 types：领域类型定义。
 * 顶层 types 聚合本域（含 redemption 子目录）的对外 DTO。
 */

/** 套餐状态 */
export type PackageStatusCode = 'ACTIVE' | 'DISABLED';

/** 套餐 DTO（对外） */
export interface PackageDTO {
  id: string;
  stationId: string | null;
  title: string;
  description: string | null;
  priceMinor: string; // BigInt → string 序列化
  durationHours: number | null;
  benefits: unknown;
  status: PackageStatusCode;
  sortOrder: number;
}

/** 套餐创建输入 */
export interface PackageCreateInput {
  stationId?: string;
  title: string;
  description?: string;
  priceMinor: number; // 分
  durationHours?: number;
  benefits?: Record<string, unknown>;
  status?: PackageStatusCode;
  sortOrder?: number;
}

/** 套餐更新输入（部分字段） */
export interface PackageUpdateInput {
  title?: string;
  description?: string;
  priceMinor?: number;
  durationHours?: number;
  benefits?: Record<string, unknown>;
  status?: PackageStatusCode;
  sortOrder?: number;
}

// Re-export redemption types
export type { BatchGenerateInput } from './redemption/service';

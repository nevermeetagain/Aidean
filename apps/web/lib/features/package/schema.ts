/**
 * package 套餐域 schema：Zod 契约层。
 * 创建/更新套餐的输入校验。
 */

import { z } from 'zod';

export const PackageCreateSchema = z.object({
  stationId: z.string().uuid().optional(),
  title: z.string().min(1, '标题必填').max(100),
  description: z.string().max(500).optional(),
  priceMinor: z.number().int().min(0, '价格不能为负'),
  durationHours: z.number().int().positive().optional(),
  benefits: z.record(z.unknown()).optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const PackageUpdateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  priceMinor: z.number().int().min(0).optional(),
  durationHours: z.number().int().positive().optional(),
  benefits: z.record(z.unknown()).optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type PackageCreateSchemaType = z.infer<typeof PackageCreateSchema>;
export type PackageUpdateSchemaType = z.infer<typeof PackageUpdateSchema>;

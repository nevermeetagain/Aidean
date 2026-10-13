import { z } from "zod";

/** 套餐展示卡片 */
export const PackageCardSchema = z.object({
  id: z.string().min(1),
  stationId: z.string().optional(),
  title: z.string().min(1),
  priceMinor: z.coerce.bigint(),
  durationHours: z.number().int().positive().optional(),
});
export type PackageCard = z.infer<typeof PackageCardSchema>;

/** 余额兑换套餐入参 */
export const ExchangePackageInputSchema = z.object({
  packageId: z.string().min(1),
});
export type ExchangePackageInput = z.infer<typeof ExchangePackageInputSchema>;
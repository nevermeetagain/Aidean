// V0.12.0 · 可靠性读取（REQ-M-008）。落地：packages/shared/src/schemas/monitoring.schema.ts
import { z } from "zod";

/** GET /api/v1/stations/{id}/reliability?days=7 —— 匿名可读；days ∈ [1,30]，默认 7，非法 → 400。
 *  缺观测的日子返回 uptimePercent=null（不插值、不当作 0）。缓存 10 分钟，persist 写入后失效。 */
export const ReliabilityDay = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),          // Asia/Shanghai 自然日
  uptimePercent: z.number().min(0).max(100).nullable(),
  successCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
});
export const StationReliabilityResponse = z.object({
  stationId: z.string().uuid(),
  days: z.array(ReliabilityDay),
  lastAliveAt: z.string().datetime().nullable(),
  source: z.literal("llmtest"),
});

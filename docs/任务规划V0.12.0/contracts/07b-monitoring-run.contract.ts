// V0.12.0 · 监控运行端点（REQ-M-011）。落地：packages/shared/src/schemas/monitoring.schema.ts
import { z } from "zod";
import { MonitorRunRequest } from "./05b-events.contract";

/** POST /api/v1/admin/monitoring/sources/{key}/run —— 鉴权 admin.sync.write。
 *  语义由「只占锁」改为「插入 pending 请求」；返回 202。重复 → 10006(429)；key 未注册 → 20004；authRequired 且缺凭证 → 50012。
 *  响应形状向后兼容：保留既有 AdminMonitoringRunResponse 字段，新增 requestId。 */
export const AdminMonitoringRunResponseV2 = z.object({ accepted: z.literal(true), requestId: z.string().uuid() });

/** GET /api/v1/admin/monitoring/sources/{key}/runs?page&pageSize —— 鉴权 admin.sync.read。按 createdAt 倒序。 */
export const AdminMonitoringRunsResponse = z.object({
  items: z.array(MonitorRunRequest),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(50),
});

/** 源列表新增只读派生字段 nextRunAt（由 cadenceCron + lastRunAt 计算，Asia/Shanghai），非法 cron → null */
export const MonitoringSourceDerived = z.object({ nextRunAt: z.string().datetime().nullable() });

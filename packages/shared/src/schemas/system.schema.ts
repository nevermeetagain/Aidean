// S0 · 就绪探针契约 ——由 docs/任务规划V0.5.0/contracts/01-api.contract.ts §S0 readiness 经 TASK-001 落地。
// 落地映射（唯一源 = packages/shared/src/schemas/*，ADR-P001）：SystemReady* → 本文件。
// GET /api/v1/system/ready（PUBLIC，API-001，TASK-003 实现）：
//   就绪 → HTTP 200，data = SystemReadySchema；
//   失败 → HTTP 503 + 错误信封 code=50010（SERVICE_UNAVAILABLE），message 形如 "依赖不可用: db" / "依赖不可用: redis"。
import { z } from "zod";

const Iso = z.string().datetime();

/** 就绪响应体：status 恒 "ready"，db/redis 探活均 "ok"（任一失败走错误信封 50010，不返回本形） */
export const SystemReadySchema = z.object({
  status: z.enum(["ready"]),
  checks: z.object({ db: z.literal("ok"), redis: z.literal("ok") }),
  time: Iso,
});
export type SystemReady = z.infer<typeof SystemReadySchema>;

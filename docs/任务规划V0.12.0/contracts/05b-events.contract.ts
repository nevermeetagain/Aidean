// V0.12.0 · Events：监控「立即运行」请求的状态机（无消息总线，DB 行即事件；ADR-0011）。
import { z } from "zod";

export const MonitorRunStatus = z.enum(["pending", "running", "done", "failed"]);

/** 合法迁移：pending→running（调度领取，UPDATE … WHERE status='pending' RETURNING，原子）；running→done|failed。
 *  幂等键：部分唯一索引 (source_key) WHERE status IN ('pending','running') —— 同源同时至多 1 个未完成请求。
 *  触发时机：管理员 POST run 时插入 pending；run-due 调度节拍（每 15 分钟）或下一次 monitor_catalogs 执行时领取。
 *  超时回收：running 超过 30 分钟视为僵死，下一次领取前置为 failed(error='stale')。 */
export const MonitorRunTransition = z.discriminatedUnion("to", [
  z.object({ from: z.literal("pending"), to: z.literal("running") }),
  z.object({ from: z.literal("running"), to: z.literal("done") }),
  z.object({ from: z.literal("running"), to: z.literal("failed") }),
]);

export const MonitorRunRequest = z.object({
  id: z.string().uuid(),
  sourceKey: z.string().max(40),
  status: MonitorRunStatus,
  requestedBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  finishedAt: z.string().datetime().nullable(),
  resultCount: z.number().int().nonnegative().nullable(),
  error: z.string().max(2000).nullable(),
});

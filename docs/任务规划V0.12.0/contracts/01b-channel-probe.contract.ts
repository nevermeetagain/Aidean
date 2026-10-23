// V0.12.0 · 自定义渠道连通性探测（REQ-N-010）。落地：packages/shared/src/schemas/user.schema.ts
import { z } from "zod";

/** POST /api/v1/user/custom-channels/{id}/probe —— 鉴权：已登录用户，仅能探测自己的渠道（他人渠道按 404 处理，防枚举）。
 *  幂等：无副作用（只读外连），可重试；限流：每用户 10 次/分钟 → 10006(429)。 */
export const ChannelProbeParams = z.object({ id: z.string().uuid() });

export const ChannelProbeOutcome = z.enum([
  "reachable",     // 2xx，且响应体可解析为 OpenAI 兼容 /models
  "auth_failed",   // 401/403
  "timeout",       // 3s 内无响应
  "bad_response",  // 非 2xx（除 401/403）或响应体不可解析
]);

export const ChannelProbeResponse = z.object({
  outcome: ChannelProbeOutcome,
  httpStatus: z.number().int().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  modelCount: z.number().int().nonnegative().nullable(),
  probedAt: z.string().datetime(),
});
// 目标被拒（非 https / 解析到私网、回环、链路本地、云元数据地址 / 发生重定向）不是 outcome，而是错误 30005（见 02b）。

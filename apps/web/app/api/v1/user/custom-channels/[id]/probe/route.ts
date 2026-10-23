/**
 * POST /api/v1/user/custom-channels/{id}/probe — 自定义渠道连通性探测（T120-23 · REQ-N-010 · contracts/01b）。
 * 鉴权：已登录用户，仅本人渠道；他人或不存在 → 40000（不暴露存在性，与 PATCH/DELETE 同口径）。
 * 限流：每用户 10 次/分钟 → 10006（Redis 固定窗口，故障 fail-open）。
 * 目标被拒（非 https / 私网 / 回环 / 链路本地 / 元数据 / 重定向）→ 30005。
 * 结果写回 custom_channels.last_test_at / last_test_ok（复用既有列，ok=reachable）。
 */
import { ChannelProbeParams, type ChannelProbeResult } from "@aidean/shared";

import { decryptSecret } from "../../../../../../../lib/features/apikey/crypto";
import { requireUserApi } from "../../../../../../../lib/features/auth/session";
import { ProbeTargetForbiddenError, probeChannel } from "../../../../../../../lib/features/gateway/probe";
import { gatewayRepository } from "../../../../../../../lib/features/gateway/repository";
import { prisma } from "../../../../../../../lib/db/prisma";
import { checkFixedWindow } from "../../../../../../../lib/rate-limit";
import { ApiError, ERROR_CODES } from "../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../_lib/handler";

export const dynamic = "force-dynamic";

const PROBE_RATE_LIMIT = 10;
const PROBE_WINDOW_SECONDS = 60;

export const POST = withApi(async (_req: Request, ctx: RouteContext): Promise<ChannelProbeResult> => {
  const session = await requireUserApi();
  const parsed = ChannelProbeParams.safeParse(await ctx.params);
  if (!parsed.success) throw new ApiError(ERROR_CODES.BAD_REQUEST, "渠道 id 非法");
  const { id } = parsed.data;

  const rl = await checkFixedWindow(`rl:probe:user:${session.userId}`, PROBE_RATE_LIMIT, PROBE_WINDOW_SECONDS);
  if (!rl.allowed) throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "探测过于频繁，请稍后再试");

  const channel = await gatewayRepository.findCustomChannel(prisma, session.userId, id);
  if (!channel) throw new ApiError(ERROR_CODES.BAD_REQUEST, "渠道不存在或无权操作");

  const markResult = (ok: boolean) =>
    prisma.customChannel.updateMany({
      where: { id, userId: session.userId },
      data: { lastTestAt: new Date(), lastTestOk: ok },
    });

  try {
    const result = await probeChannel({
      baseUrl: channel.baseUrl,
      apiKey: decryptSecret(channel.keyCipher),
      format: String(channel.format),
    });
    await markResult(result.outcome === "reachable");
    return result;
  } catch (e) {
    if (e instanceof ProbeTargetForbiddenError) {
      await markResult(false);
      throw new ApiError(ERROR_CODES.CHANNEL_PROBE_TARGET_FORBIDDEN, e.message);
    }
    throw e;
  }
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);

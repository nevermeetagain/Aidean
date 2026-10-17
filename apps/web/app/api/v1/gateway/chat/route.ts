/**
 * POST /api/v1/gateway/chat — 统一计费网关入口（Task G.4.1）。
 *
 * requireGatewayPrincipal → 接入格式判别（问题 5：openai/anthropic/openai-responses/gemini）
 * → responses/gemini 归一为内部 OpenAI GatewayChat（剔 stream→走聚合，可后向转换响应体）
 * → GatewayChatSchema 校验（fail→40000）→ 编排（渠道 FREE_PROXY 优先 → 路由链预扣/捕获 → free 兜底）
 * → **入口同格式裸响应**（responses/gemini 经 serializeAccessResponse 回接入体裁）。
 *
 * 响应契约：网关是 API 中转面，成功响应体 = 接入格式原始 JSON（不加 successResponse 信封）；
 * 计费/链路事实经响应头暴露（x-aidean-*）。幂等：x-request-id（重复使用→40000）；缺省服务端生成。
 */
import {
  detectAccessFormat,
  GatewayChatSchema,
  normalizeAccessRequest,
  serializeAccessResponse,
} from "@aidean/shared";

import { requireGatewayPrincipal } from "../../../../../lib/features/apikey/guard";
import { gatewayOrchestrator } from "../../../../../lib/features/gateway/service";
import { requireFeature } from "../../../../../lib/features/flags/service";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { generateRequestId } from "../../_lib/response";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const POST = withApi(async (req: Request) => {
  // S2 受控面（TASK-015 / FEATURE_GATES["gateway.chat"]）：开关关闭 → 403+50011。先于鉴权短路，
  // 阻断未鉴权流量进入下游计费/tier 编排；受控态已由 PUBLIC /system/features 全量公开，此顺序不新增泄露面。
  await requireFeature("gateway.chat");
  // GW-KEY-01 P2-S2.1：双通道首守卫——Bearer/x-api-key → 平台 API Key 路径（免 cookie）；
  // 均缺失 → 回落 requireUserApi()（cookie 行为零回退）。幂等与裸响应契约不变。
  const principal = await requireGatewayPrincipal(req);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "请求体非合法 JSON");
  }
  // 接入格式（E.1）：openai/anthropic 直走既有双格式；responses/gemini 先归一为内部 OpenAI 形态。
  const accessFormat = detectAccessFormat(raw);
  const converts = accessFormat === "openai-responses" || accessFormat === "gemini";
  const chatInput = converts ? normalizeAccessRequest(accessFormat, raw) : raw;
  const parsed = GatewayChatSchema.safeParse(chatInput);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "请求体不符合接入格式（OpenAI/Anthropic/Responses/Gemini）");
  }

  const requestId = req.headers.get("x-request-id") ?? generateRequestId();
  const result = await gatewayOrchestrator.executeChat(principal.userId, parsed.data, requestId);

  // 流式透传（规格 v0.2）：编排层返回预构造 Response（SSE 字节流直通）——responses/gemini 已剔 stream
  // 不会进此分支（仅 openai/anthropic 透传）；不得 JSON.stringify（流对象序列化即 "{}"）。
  if (result.response instanceof Response) {
    return result.response;
  }

  const out = converts ? serializeAccessResponse(accessFormat, result.response, requestId) : result.response;
  return new Response(JSON.stringify(out), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      "x-aidean-billing-path": result.meta.billingPath,
      "x-aidean-quota-minor": result.meta.quotaMinor.toString(),
      "x-aidean-model-id": result.meta.modelId ?? "",
      "x-aidean-station-id": result.meta.stationId ?? "",
      "x-aidean-channel-id": result.meta.channelId ?? "",
    },
  });
});

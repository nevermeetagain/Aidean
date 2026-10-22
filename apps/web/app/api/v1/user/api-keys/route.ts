/**
 * /api/v1/user/api-keys — 平台 API Key 管理（GW-KEY-01 / RW-2 路由层）。
 *
 * GET：本人 Key 脱敏列表（keyId/permissions/rateLimit/状态面，永不回明文与哈希）；
 * POST：创建（parseCreateKeyInput 手写校验 → createApiKey；**明文仅此响应返回一次**，
 * 库内只存 HMAC-SHA256 哈希；之后任何接口/日志不可再取）。参数非法 → 40000。
 * 鉴权：requireUserApi（管理面 cookie 会话；GatewayPrincipal 是网关数据面专用，不在此用）。
 * 路由零业务逻辑：解析 → 守卫 → 调 apikey 域 service → 信封。
 */
import { requireUserApi } from "../../../../../lib/features/auth/session";
import {
  createApiKey,
  listApiKeys,
  parseCreateKeyInput,
} from "../../../../../lib/features/apikey/service";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const session = await requireUserApi();
  return { items: await listApiKeys(session.userId) };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireUserApi();
  const raw = await req.json().catch(() => null);
  const parsed = parseCreateKeyInput(raw);
  if (!parsed.ok) throw new ApiError(ERROR_CODES.BAD_REQUEST, parsed.message);
  const { plaintext, view } = await createApiKey(session.userId, parsed.value);
  // 明文仅本响应出现一次（secret 只存哈希，之后任何接口不可再取）
  return { plaintext, item: view };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

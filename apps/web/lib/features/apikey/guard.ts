/**
 * 网关统一主体守卫（GW-KEY-01 P2-S2.1）。
 *
 * 双通道判定（本函数为 chat 路由唯一首守卫替换点）：
 * - 携带 `Authorization: Bearer aid_ak_...`（OpenAI SDK 形态）或 `x-api-key`（Anthropic 形态）
 *   → 平台 API Key 路径：verify（401）→ permissions（403）→ 限流（429）→ 免 cookie；
 * - 均缺失 → 回落 requireUserApi()（cookie 会话，行为零回退，既有码面不变）。
 *
 * 不改 auth/session.ts 既有导出语义；本函数放 apikey 域（网关专用组合逻辑）。
 * 顺序契约：403（配置错）优先于 429（频率错）——越权 Key 不占用限流窗口。
 */
import { ApiError } from "../../../app/api/v1/_lib/errors";
import { requireUserApi } from "../auth/session";
import { authenticateApiKey } from "./service";
import type { GatewayPrincipal } from "./types";

export async function requireGatewayPrincipal(req: Request): Promise<GatewayPrincipal> {
  const auth = req.headers.get("authorization");
  const xKey = req.headers.get("x-api-key");
  const raw = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : (xKey ?? "").trim();
  if (raw) {
    return authenticateApiKey(raw);
  }
  const session = await requireUserApi();
  return { userId: session.userId, source: "cookie" };
}

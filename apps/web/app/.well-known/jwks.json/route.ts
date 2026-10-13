/**
 * GET /.well-known/jwks.json — JWKS 公钥集（M-SSO P1.2）。
 * 产品侧缓存后本地验签（零网络往返）；仅公参数，无私钥分量。
 * 轮换口径：新 kid 上线，本端点在新旧过渡期同时列出（keys.ts 当前实现为单 kid）。
 */
import { getPublicJwks } from "../../../lib/features/auth/keys";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const jwks = await getPublicJwks();
  return new Response(JSON.stringify(jwks), {
    headers: {
      "content-type": "application/json",
      // 公钥公开无密，短缓存平衡轮换可见性
      "cache-control": "public, max-age=300",
    },
  });
}

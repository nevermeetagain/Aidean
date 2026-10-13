/**
 * GET /oauth/userinfo — Bearer 访问令牌换取用户资料（M-SSO P1.5）。
 * 验签口径：经 getSessionFromBearer 双通道（主站自身 aud 或任一活跃 client 的产品令牌）。
 * 响应 OIDC 标准形态：sub 恒为 User.id，email/nickname/tier/role 按 scope 面裁剪。
 */
import { prisma } from "../../../lib/db/prisma";
import { getSessionFromBearer } from "../../../lib/features/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const session = await getSessionFromBearer(req);
  if (!session) {
    return new Response(JSON.stringify({ error: "invalid_token" }), {
      status: 401,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, nickname: true, tier: true, role: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") {
    return new Response(JSON.stringify({ error: "invalid_token" }), {
      status: 401,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
  return new Response(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      nickname: user.nickname,
      tier: user.tier,
      role: user.role,
    }),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}

/**
 * POST /oauth/revoke — 令牌撤销（M-SSO P1.5，RFC 7009 子集）。
 * client 认证后撤销指定 refresh 令牌所在链（该用户该产品的全部会话代）。
 * 口径：无论令牌是否有效，撤销成功一律 200（不泄露令牌存在性）。
 */
import { NextResponse } from "next/server";

import { authRepository } from "../../../lib/features/auth/repository";
import { verifyRefresh } from "../../../lib/features/auth/tokens";
import { oidcClientService } from "../../../lib/features/oauth/clients";

export const dynamic = "force-dynamic";

async function readClient(req: Request, form: URLSearchParams): Promise<{ clientId: string; secret: string } | null> {
  const basic = req.headers.get("authorization");
  if (basic?.startsWith("Basic ")) {
    try {
      const decoded = atob(basic.slice(6));
      const idx = decoded.indexOf(":");
      if (idx > 0) return { clientId: decoded.slice(0, idx), secret: decoded.slice(idx + 1) };
    } catch {
      return null;
    }
  }
  const clientId = form.get("client_id");
  const secret = form.get("client_secret");
  return clientId && secret ? { clientId, secret } : null;
}

export async function POST(req: Request): Promise<Response> {
  const form = new URLSearchParams(await req.text().catch(() => ""));
  const creds = await readClient(req, form);
  if (!creds) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }
  const client = await oidcClientService.getActiveClient(creds.clientId);
  if (!client || !oidcClientService.verifyClientSecret(client, creds.secret)) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }
  const token = form.get("token") ?? "";
  const claims = await verifyRefresh(token, { audience: client.clientId });
  if (claims) {
    // 撤销时校验令牌归属：aud=本 client 的 refresh 链才可由本 client 撤销
    if (claims.clientId === client.clientId) {
      await authRepository.revokeRefreshChainByJti(claims.jti);
    }
  }
  // RFC 7009：无效令牌同样返回 200（不泄露存在性）
  return NextResponse.json({}, { headers: { "cache-control": "no-store" } });
}

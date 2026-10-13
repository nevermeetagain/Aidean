/**
 * POST /oauth/introspect — 令牌内省（M-SSO P1.5 可选面，供要求强实时撤销的接入方）。
 * 仅支持 refresh 令牌（access 为无状态 JWT，实时撤销由 15m TTL + tokenVersion 承担）。
 * 返回 active 布尔与最小安全集（sub/scope/exp），不泄露任何存在性差异之外的细节。
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
  if (!claims || claims.clientId !== client.clientId) {
    return NextResponse.json({ active: false }, { headers: { "cache-control": "no-store" } });
  }
  const row = await prismaCheckRefresh(claims.jti);
  // 实时撤销口径：revokedAt（链被撤销）或 rotatedAt（已被轮换消费）任一非空即不活跃，
  // 与 consumeRefreshToken 的可用性语义完全一致（审计修复：原先只查 expiresAt）
  if (!row || row.revokedAt || row.rotatedAt) {
    return NextResponse.json({ active: false }, { headers: { "cache-control": "no-store" } });
  }
  return NextResponse.json(
    {
      active: true,
      sub: claims.userId,
      scope: client.scopes.join(" "),
      exp: Math.floor(row.expiresAt.getTime() / 1000),
    },
    { headers: { "cache-control": "no-store" } }
  );
}

async function prismaCheckRefresh(jti: string): Promise<{
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedAt: Date | null;
} | null> {
  const { prisma } = await import("../../../lib/db/prisma");
  return prisma.refreshToken.findUnique({
    where: { jti },
    select: { expiresAt: true, revokedAt: true, rotatedAt: true },
  });
}

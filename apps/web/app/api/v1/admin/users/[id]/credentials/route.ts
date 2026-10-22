/**
 * /api/v1/admin/users/[id]/credentials — 用户密钥/渠道全局只读聚合（S4 / M5 / G2）。
 *
 * auth: requireAdminApi("admin.users.read")（缺权限由 withApi → 403）。
 * 返回该用户三类凭据的「脱敏视图」，绝不明文回显：
 *  - apiKeys    —— ApiKey 仅存 keyHash（不可逆）+ keyId，掩码取 maskApiKey(keyId)，永不带 hash；
 *  - stationKeys—— 取库内冗余脱敏列 keyMasked（maskApiKey 口径），密文列 keyCipher 绝不投影；
 *  - channels   —— 取 CustomChannel.keyMasked 之外的元信息（name/format/isActive），不含任何 Key。
 * 契约见 spec §4①；空态返回空数组（用户无凭据 / 不存在均如此）。
 */
import { prisma } from "../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../lib/features/auth/session";
import { withApi, type RouteContext } from "../../../../_lib/handler";
import { maskApiKey } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async (_req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdminApi("admin.users.read");
  const { id } = await ctx.params;

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, keyId: true, isActive: true, lastUsedAt: true },
  });
  const stationKeys = await prisma.stationUserKey.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyMasked: true, isActive: true, station: { select: { name: true } } },
  });
  const channels = await prisma.customChannel.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, format: true, isActive: true },
  });

  return {
    apiKeys: apiKeys.map((k) => ({
      id: k.id,
      masked: maskApiKey(k.keyId),
      status: k.isActive ? "ACTIVE" : "REVOKED",
      lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    })),
    stationKeys: stationKeys.map((k) => ({
      id: k.id,
      stationName: k.station?.name ?? null,
      masked: k.keyMasked,
      status: k.isActive ? "ACTIVE" : "REVOKED",
    })),
    channels: channels.map((c) => ({
      id: c.id,
      name: c.name,
      provider: c.format,
      enabled: c.isActive,
    })),
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);

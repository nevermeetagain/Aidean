/**
 * /api/v1/admin/oidc-clients — OIDC 客户端只读列表（S7.3）。
 *
 * GET：requireAdminApi("admin.configs.read") → 全部 OidcClient 元数据。
 *      **绝不下发 clientSecretHash**（仅业务可编辑字段 + clientId 标识）。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireAdminApi("admin.configs.read");
  const rows = await prisma.oidcClient.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      clientId: true,
      name: true,
      redirectUris: true,
      logoutUri: true,
      scopes: true,
      pkceRequired: true,
      firstParty: true,
      isActive: true,
      createdAt: true,
    },
  });
  return {
    clients: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };
});

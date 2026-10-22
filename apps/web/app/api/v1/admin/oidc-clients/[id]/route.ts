/**
 * /api/v1/admin/oidc-clients/[id] — 编辑 OIDC 客户端元数据（S7.3）。
 *
 * PATCH：requireAdminApi("admin.configs.write") + AdminOidcClientPatchSchema。
 *   仅改 name/redirectUris/logoutUri/scopes/isActive；**绝不含 clientSecretHash/secret 发放**。
 *   记录不存在 → 40000；成功写 AuditLog(action=2)。停用即时影响登录（getActiveClient 返 null）。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminOidcClientPatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.configs.write");
    const { id } = await ctx.params;

    const before = await prisma.oidcClient.findUnique({
      where: { id },
      select: { id: true, clientId: true, name: true, redirectUris: true, scopes: true, isActive: true },
    });
    if (!before) throw new ApiError(ERROR_CODES.BAD_REQUEST, "OIDC 客户端不存在");

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminOidcClientPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }
    const d = parsed.data;

    const updated = await prisma.oidcClient.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.redirectUris !== undefined ? { redirectUris: d.redirectUris } : {}),
        ...(d.logoutUri !== undefined ? { logoutUri: d.logoutUri } : {}),
        ...(d.scopes !== undefined ? { scopes: d.scopes } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      },
      select: { id: true, clientId: true, name: true, redirectUris: true, scopes: true, isActive: true },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "oidc_clients",
      recordId: id,
      action: 2,
      changedFields: Object.keys(d),
      oldData: { name: before.name, isActive: before.isActive, redirectUris: before.redirectUris, scopes: before.scopes },
      newData: { name: updated.name, isActive: updated.isActive, redirectUris: updated.redirectUris, scopes: updated.scopes },
      requestId: req.headers.get("x-request-id"),
    });
    return updated;
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, DELETE, OPTIONS } = methodNotAllowed(["PATCH"]);

/**
 * /api/v1/admin/partner-keys — 卡商密钥管理（SubTask 3.5.3）。
 *
 * GET：列表（id/name/prefix/isActive/lastUsedAt/createdAt，不返回 hash）。
 * POST：AdminPartnerKeyCreateSchema → 生成 `ak_` + 32 hex 明文（仅本次响应返回），
 *       库内只存 SHA-256；prefix 取明文前 8 位供辨认。
 */
import { createHash, randomBytes } from "node:crypto";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { AdminPartnerKeyCreateSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireAdminApi("admin.partner-keys.read");
  const rows = await prisma.partnerKey.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, isActive: true, lastUsedAt: true, createdAt: true },
  });
  return {
    keys: rows.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
      createdAt: k.createdAt.toISOString(),
    })),
  };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.partner-keys.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminPartnerKeyCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }

  const plaintext = `ak_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(plaintext).digest("hex");
  const created = await prisma.partnerKey.create({
    data: { name: parsed.data.name, keyHash, prefix: plaintext.slice(0, 8), isActive: true },
    select: { id: true, name: true, prefix: true },
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "partner_keys",
    recordId: created.id,
    action: 1,
    changedFields: ["name", "prefix"],
    newData: { name: created.name, prefix: created.prefix },
    requestId: req.headers.get("x-request-id"),
  });

  return { key: created, apiKey: plaintext };
});

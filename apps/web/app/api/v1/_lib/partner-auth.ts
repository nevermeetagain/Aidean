/**
 * 卡商 API Key 鉴权（SubTask 3.5.2 共享件）。
 * X-API-Key → SHA-256 比对 PartnerKey.keyHash（isActive）；失败抛 401 段错误。
 */
import { createHash } from "node:crypto";

import { prisma } from "../../../../lib/db/prisma";
import { ApiError, ERROR_CODES } from "./errors";

export async function authenticatePartnerKey(req: Request): Promise<{ id: string; name: string }> {
  const raw = req.headers.get("x-api-key");
  if (!raw) throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "缺少 X-API-Key");
  const keyHash = createHash("sha256").update(raw).digest("hex");
  const key = await prisma.partnerKey.findUnique({ where: { keyHash }, select: { id: true, name: true, isActive: true } });
  if (!key || !key.isActive) throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "API Key 无效");
  return { id: key.id, name: key.name };
}

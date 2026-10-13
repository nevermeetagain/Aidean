/**
 * /api/v1/user/station-keys — 用户自有上游 Key（GW-KEY-01 / RW-2 路由层）。
 *
 * 站点维度录入/删除/列表（userId+stationId 唯一，POST 覆盖式 upsert 并复活 isActive）：
 * GET：脱敏列表（keyMasked，密文列 keyCipher 永不出 service 层）；
 * POST：录入/覆盖（parseStationKeyInput 手写校验 → AES-256-GCM 密文落库；明文仅请求出现）；
 * DELETE：按 stationId 删除（body 携带），0 行 → 40000。
 * 鉴权：requireUserApi（管理面 cookie 会话）。
 */
import { requireUserApi } from "../../../../../lib/features/auth/session";
import {
  listStationUserKeys,
  parseStationKeyInput,
  removeStationUserKey,
  saveStationUserKey,
} from "../../../../../lib/features/apikey/station-user-key";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const session = await requireUserApi();
  return { items: await listStationUserKeys(session.userId) };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireUserApi();
  const raw = await req.json().catch(() => null);
  const parsed = parseStationKeyInput(raw);
  if (!parsed.ok) throw new ApiError(ERROR_CODES.BAD_REQUEST, parsed.message);
  return { item: await saveStationUserKey(session.userId, parsed.value) };
});

export const DELETE = withApi(async (req: Request) => {
  const session = await requireUserApi();
  const raw = (await req.json().catch(() => null)) as { stationId?: unknown } | null;
  if (!raw || typeof raw.stationId !== "string" || raw.stationId.trim().length === 0) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "stationId 必填");
  }
  await removeStationUserKey(session.userId, raw.stationId.trim());
  return { deleted: true };
});

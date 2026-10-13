/**
 * /api/v1/user/tier-mappings — 模型四档绑定映射（Task A.2.2）。
 *
 * GET：requireUserApi → OPUS/SONNET/FABLE/HAIKU 四档分组 + free 说明区。
 * PUT：requireUserApi → TierMappingsPutSchema safeParse（fail→40000 等级映射格式非法；
 *      FREE 等非四档 tier 由 schema 枚举直接拒收）→ 跨档同模型守卫
 *      （同一 modelId 出现在两个档→40000「同一模型不可绑定多个等级」）
 *      → 整组覆盖事务 → {saved:n}。
 */
import { TierMappingsPutSchema } from "@aidean/shared";

import { requireUserApi } from "../../../../../lib/features/auth/session";
import { userService } from "../../../../../lib/features/user/service";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { successResponse } from "../../_lib/response";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const session = await requireUserApi();
  return userService.listTierMappings(session.userId);
});

export const PUT = withApi(async (req: Request) => {
  const session = await requireUserApi();
  const parsed = TierMappingsPutSchema.safeParse(await req.json());
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "等级映射格式非法");
  }
  const saved = await userService.saveTierMappings(session.userId, parsed.data);
  return successResponse({ saved });
});

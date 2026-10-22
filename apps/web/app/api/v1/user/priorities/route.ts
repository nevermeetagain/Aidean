/**
 * /api/v1/user/priorities — 用户模型优先级配置（Task A.2.2）。
 *
 * GET：requireUserApi → listPriorities（升序 + free 只读行置尾）。
 * PUT：requireUserApi → PrioritiesPutSchema safeParse（fail→40000 优先级配置格式非法）
 *      → 整组覆盖事务 [deleteMany(userId) + createMany] → {saved:n}。
 */
import { PrioritiesPutSchema } from "@aidean/shared";

import { requireUserApi } from "../../../../../lib/features/auth/session";
import { userService } from "../../../../../lib/features/user/service";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { successResponse } from "../../_lib/response";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const session = await requireUserApi();
  return { priorities: await userService.listPriorities(session.userId) };
});

export const PUT = withApi(async (req: Request) => {
  const session = await requireUserApi();
  const parsed = PrioritiesPutSchema.safeParse(await req.json());
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "优先级配置格式非法");
  }
  const saved = await userService.savePriorities(session.userId, parsed.data);
  return successResponse({ saved });
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "PUT"]);

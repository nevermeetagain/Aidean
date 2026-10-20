/**
 * GET /api/v1/search — 顶栏全局搜索（TASK-033，契约 API-012，PUBLIC）。
 *
 * - 入参 SearchQuerySchema（packages/shared/src/schemas/search.schema.ts，TASK-032 落地）；
 * - IP 级固定窗口限流（复用 lib/rate-limit.ts，Redis 不可用 fail-open）；
 * - 三路查询见 lib/features/search/service.ts；响应 {q, hits, tookMs}（SearchResponseSchema 形）。
 */
import { SearchQuerySchema } from "@aidean/shared";

import { prisma } from "../../../../lib/db/prisma";
import { checkFixedWindow, clientIpFrom } from "../../../../lib/rate-limit";
import { searchAll } from "../../../../lib/features/search/service";
import { ApiError, ERROR_CODES } from "../_lib/errors";
import { withApi } from "../_lib/handler";

export const dynamic = "force-dynamic";

/** 公开搜索限流：每 IP 60s 内 30 次（纵深防御层，Redis 故障 fail-open 放行） */
const SEARCH_RATE_LIMIT = 30;
const SEARCH_RATE_WINDOW_SECONDS = 60;

export const GET = withApi(async (req: Request) => {
  const rl = await checkFixedWindow(`rl:search:${clientIpFrom(req)}`, SEARCH_RATE_LIMIT, SEARCH_RATE_WINDOW_SECONDS);
  if (!rl.allowed) {
    throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "搜索过于频繁，请稍后再试");
  }

  const sp = new URL(req.url).searchParams;
  const raw = {
    q: sp.get("q") ?? "",
    ...(sp.has("types") ? { types: sp.get("types") ?? undefined } : {}),
    ...(sp.has("limit") ? { limit: sp.get("limit") ?? undefined } : {}),
  };
  const parsed = SearchQuerySchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "搜索参数非法");
  }

  const started = Date.now();
  const hits = await searchAll(prisma, parsed.data);
  return { q: parsed.data.q, hits, tookMs: Date.now() - started };
});

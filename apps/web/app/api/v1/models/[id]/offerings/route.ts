/**
 * GET /api/v1/models/[id]/offerings — 模型多源上架信息（TASK-066；契约 MONITORING_ENDPOINTS「PUBLIC，cache:model-offerings:{id} 600s」）。
 * [id] 接受 slug 或 cuid；模型不存在/已软删 → 20001 MODEL_NOT_FOUND；无观测 → { items: [] }。
 * 缓存：Redis 可用时读穿 600s（键用解析后的模型 id，slug 与 id 两种入口共享一份）；Redis 故障静默直查。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { getRedis } from "../../../../../../lib/db/redis";
import { ModelOfferingsResponse } from "@aidean/shared";

import { buildOfferings, offeringKeys, offeringsCacheKey, OFFERINGS_CACHE_TTL_SECONDS, PUBLIC_TOS_STATUSES, type ModelOfferings } from "../../../../../../lib/monitoring/offerings";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

async function loadOfferings(identifier: string): Promise<ModelOfferings> {
  const model = await prisma.aiModel.findFirst({
    where: { OR: [{ slug: identifier }, { id: identifier }], deletedAt: null },
    select: { id: true, modelCode: true, slug: true },
  });
  if (!model) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "模型不存在");

  const cache = getRedis();
  const key = offeringsCacheKey(model.id);
  if (cache) {
    try {
      const hit = await cache.get(key);
      if (hit) {
        // 命中也过契约校验：形状不符（旧版本/脏写）按 MISS 重算
        const parsed = ModelOfferingsResponse.safeParse(JSON.parse(hit));
        if (parsed.success) return parsed.data;
      }
    } catch {
      /* 缓存故障按 MISS */
    }
  }

  const rows = await prisma.providerModelObservation.findMany({
    where: { normalizedModelId: { in: offeringKeys(model) }, source: { deletedAt: null, tosStatus: { in: [...PUBLIC_TOS_STATUSES] } } },
    orderBy: { lastSeenAt: "desc" },
    take: 500,
    select: {
      externalModelId: true,
      isListed: true,
      priceUnit: true,
      priceInput: true,
      priceOutput: true,
      firstSeenAt: true,
      lastSeenAt: true,
      source: { select: { key: true, label: true, tier: true, kind: true, endpoint: true, docsUrl: true, tosStatus: true, deletedAt: true } },
    },
  });
  const data = buildOfferings(rows);

  if (cache) {
    try {
      await cache.set(key, JSON.stringify(data), "EX", OFFERINGS_CACHE_TTL_SECONDS);
    } catch {
      /* 回写失败容忍 */
    }
  }
  return data;
}

export async function GET(req: Request, ctx: RouteContext): Promise<Response> {
  const { id } = await ctx.params;
  return withApi(() => loadOfferings(id))(req);
}

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);

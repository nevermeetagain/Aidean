/**
 * GET /api/v1/models/[id]/stations — 服务某模型的站台资费列表端点（Task L.3.3）。
 *
 * 先按 slug 或 cuid 解析模型取 nameDisplay；pg 数组 contains → Prisma has 查
 * api_stations.models 命中站台；站级价格来自 stations.pricing JSON **宽松透传**
 * （结构不做强假设）。无命中/站台未配置 models 数组均容忍返回 []。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { ladderRepository } from "../../../../../../lib/features/ladder/repository";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

async function loadStations(identifier: string) {
  const model = await ladderRepository.findModelByIdentifier(prisma, identifier);
  if (!model) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "模型不存在");

  const stations = await ladderRepository.listStationsServingModel(prisma, model.nameDisplay);

  return {
    model: { id: model.id, slug: model.slug, name: model.nameDisplay },
    items: stations.map((s) => ({
      stationId: s.id,
      name: s.name,
      displayName: s.displayName,
      protocols: s.protocols,
      rating: s.rating,
      avgLatency: s.avgLatency,
      uptime: s.uptime,
      isVerified: s.isVerified,
      baseUrl: s.baseUrl,
      // pricing 为 Json 列：宽松处理——原样透出（对象/数组/基元均可），缺省 null
      pricing: s.pricing ?? null,
    })),
  };
}

export async function GET(req: Request, ctx: RouteContext): Promise<Response> {
  const { id } = await ctx.params;
  const handle = withApi(() => loadStations(id));
  return handle(req);
}

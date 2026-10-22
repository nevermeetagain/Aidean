/**
 * /api/v1/admin/discovery/pipeline — 触发发现管道。
 */
import { withApi } from "../../../_lib/handler";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import type { SourceType } from "../../../../../../lib/discovery/types";
import { runPipeline } from "../../../../../../lib/discovery/pipeline";
import { writeAudit } from "../../../_lib/audit";

export const dynamic = "force-dynamic";

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.discovery.write");
  const body = await req.json().catch(() => ({})) as {
    sources?: string[];
    dryRun?: boolean;
  };

  const result = await runPipeline({
    sources: (body.sources ?? ["registry", "search", "github", "news"]) as SourceType[],
    dryRun: body.dryRun ?? false,
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "discovery_candidates",
    action: 1,
    recordId: result.pipelineId,
    newData: {
      sources: body.sources,
      dryRun: body.dryRun,
      totalCandidates: result.totalCandidates,
      promoted: result.promoted,
    },
  });

  return result;
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);

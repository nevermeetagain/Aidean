/**
 * /api/v1/admin/intelligence/snapshots — 市场快照列表 + 生成。
 */
import { withApi } from "../../../_lib/handler";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { listSnapshots, generateSnapshot } from "../../../../../../lib/intelligence/snapshot";
import { writeAudit } from "../../../_lib/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.intelligence.read");
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "30", 10);
  return await listSnapshots(limit);
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.intelligence.write");
  const body = await req.json().catch(() => ({})) as { type?: "full" | "incremental" };

  const result = await generateSnapshot(body.type ?? "full");

  await writeAudit({
    actorId: session.userId,
    tableName: "market_snapshots",
    action: 1,
    recordId: result.snapshotId,
    newData: {
      type: body.type ?? "full",
      providers: result.providerCount,
      models: result.modelCount,
    },
  });

  return result;
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);

/**
 * /api/v1/admin/capabilities/[id] — 能力矩阵单资源（B11-03a / Q-11-01=A）。
 *
 * GET    ：admin.capabilities.read  → 单行；不存在 → 40000「能力矩阵记录不存在」
 * PATCH  ：admin.capabilities.write → CapabilityPatchSchema（strict，≥1 字段）；改键撞唯一 → 40000「…已存在」
 * DELETE ：admin.capabilities.write → 物理删除（表无 deleted_at）；oldData 全量入审计
 * 业务逻辑见 lib/features/admin/matrix/service.ts；写操作后 revalidatePath("/admin/capabilities")。
 */
import { revalidatePath } from "next/cache";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { deleteCapability, getCapability, patchCapability } from "../../../../../../lib/features/admin/matrix/service";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<{ id: string }>;

export const GET = withApi(async (_req: Request, ctx: Ctx) => {
  await requireAdminApi("admin.capabilities.read");
  const { id } = await ctx.params;
  return getCapability(id);
});

export const PATCH = withApi(async (req: Request, ctx: Ctx) => {
  const session = await requireAdminApi("admin.capabilities.write");
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as unknown;
  const record = await patchCapability(id, body, { userId: session.userId, requestId: req.headers.get("x-request-id") });
  revalidatePath("/admin/capabilities");
  return record;
});

export const DELETE = withApi(async (req: Request, ctx: Ctx) => {
  const session = await requireAdminApi("admin.capabilities.write");
  const { id } = await ctx.params;
  const result = await deleteCapability(id, { userId: session.userId, requestId: req.headers.get("x-request-id") });
  revalidatePath("/admin/capabilities");
  return result;
});

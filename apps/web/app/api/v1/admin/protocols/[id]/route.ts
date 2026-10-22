/**
 * /api/v1/admin/protocols/[id] — 协议兼容矩阵单资源（B11-03a / Q-11-01=A）。
 *
 * GET    ：admin.protocols.read  → 单行；不存在 → 40000「协议兼容记录不存在」
 * PATCH  ：admin.protocols.write → ProtocolPatchSchema（strict，≥1 字段）；改键撞唯一 → 40000「…已存在」
 * DELETE ：admin.protocols.write → 物理删除（表无 deleted_at）；oldData 全量入审计
 * 业务逻辑见 lib/features/admin/matrix/service.ts；写操作后 revalidatePath("/admin/protocols")。
 */
import { revalidatePath } from "next/cache";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { deleteProtocol, getProtocol, patchProtocol } from "../../../../../../lib/features/admin/matrix/service";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<{ id: string }>;

export const GET = withApi(async (_req: Request, ctx: Ctx) => {
  await requireAdminApi("admin.protocols.read");
  const { id } = await ctx.params;
  return getProtocol(id);
});

export const PATCH = withApi(async (req: Request, ctx: Ctx) => {
  const session = await requireAdminApi("admin.protocols.write");
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as unknown;
  const record = await patchProtocol(id, body, { userId: session.userId, requestId: req.headers.get("x-request-id") });
  revalidatePath("/admin/protocols");
  return record;
});

export const DELETE = withApi(async (req: Request, ctx: Ctx) => {
  const session = await requireAdminApi("admin.protocols.write");
  const { id } = await ctx.params;
  const result = await deleteProtocol(id, { userId: session.userId, requestId: req.headers.get("x-request-id") });
  revalidatePath("/admin/protocols");
  return result;
});

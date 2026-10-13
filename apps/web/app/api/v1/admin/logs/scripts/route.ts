/**
 * /api/v1/admin/logs/scripts — 脚本执行记录只读聚合查询（S5 日志中心）。
 *
 * GET：requireAdminApi("admin.logs.read") → AdminScriptLogsQuerySchema（跨全部脚本聚合，
 *      区别于 /admin/scripts/[id]/executions 的单脚本视图）+ scriptId/status 筛选 + 分页封顶。
 *   执行记录属账本类，只读；本端点禁写/禁删。列表不返回完整 output（Text 体积大），
 *   仅回传 errorMsg 与 durationMs，详情可经单脚本端点查看。
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { AdminScriptLogsQuerySchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<number, string> = { 0: "执行中", 1: "成功", 2: "失败" };

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.logs.read");

  const url = new URL(req.url);
  const parsed = AdminScriptLogsQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    scriptId: url.searchParams.get("scriptId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { page, pageSize, scriptId, status } = parsed.data;

  const where: Prisma.ScriptExecutionWhereInput = {};
  if (scriptId) where.scriptId = scriptId;
  if (status !== undefined) where.status = status;

  const skip = (page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    prisma.scriptExecution.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        scriptId: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        durationMs: true,
        errorMsg: true,
        createdAt: true,
        script: { select: { name: true } },
      },
    }),
    prisma.scriptExecution.count({ where }),
  ]);

  return {
    items: rows.map((e) => ({
      id: e.id,
      scriptId: e.scriptId,
      scriptName: e.script.name,
      status: e.status,
      statusLabel: STATUS_LABEL[e.status] ?? "未知",
      startedAt: e.startedAt.toISOString(),
      finishedAt: e.finishedAt ? e.finishedAt.toISOString() : null,
      durationMs: e.durationMs,
      errorMsg: e.errorMsg,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

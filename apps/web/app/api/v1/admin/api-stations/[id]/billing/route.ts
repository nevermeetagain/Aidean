/**
 * GET  /api/v1/admin/api-stations/[id]/billing — get billing rule
 * PUT  /api/v1/admin/api-stations/[id]/billing — upsert billing rule
 *
 * R-49: API站点 admin 板块——计费规则管理。
 * ⚠️ markupRate / tokenMultiplier 敏感字段，仅 admin 可读写。
 */
import { prisma } from "../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../_lib/handler";
import { writeAudit } from "../../../../_lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BillingRuleSchema = z.object({
  billingMode: z.enum(["PLATFORM", "UPSTREAM"]).optional().default("PLATFORM"),
  markupRate: z.number().min(0.001).max(999.999).optional().default(1.0),
  tokenMultiplier: z.number().min(0.001).max(999.999).optional().default(1.0),
});

export const GET = withApi(
  async (_req: Request, ctx: RouteContext<{ id: string }>) => {
    await requireAdminApi("admin.api-stations.read");
    const { id } = await ctx.params;

    const rule = await prisma.stationBillingRule.findUnique({
      where: { stationId: id },
    });

    if (!rule) {
      return {
        item: {
          stationId: id,
          billingMode: "PLATFORM",
          markupRate: 1.0,
          tokenMultiplier: 1.0,
          isDefault: true,
        },
      };
    }

    return {
      item: {
        id: rule.id,
        stationId: rule.stationId,
        billingMode: rule.billingMode as string,
        markupRate: Number(rule.markupRate),
        tokenMultiplier: Number(rule.tokenMultiplier),
        isDefault: false,
      },
    };
  }
);

export const PUT = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.api-stations.write");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = BillingRuleSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }

    const station = await prisma.aPIStation.findUnique({ where: { id } });
    if (!station || station.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "API站点不存在");
    }

    const existing = await prisma.stationBillingRule.findUnique({
      where: { stationId: id },
    });

    const rule = await prisma.stationBillingRule.upsert({
      where: { stationId: id },
      update: {
        billingMode: parsed.data.billingMode,
        markupRate: parsed.data.markupRate,
        tokenMultiplier: parsed.data.tokenMultiplier,
      },
      create: {
        stationId: id,
        billingMode: parsed.data.billingMode,
        markupRate: parsed.data.markupRate,
        tokenMultiplier: parsed.data.tokenMultiplier,
      },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "station_billing_rules",
      recordId: rule.id,
      action: existing ? 2 : 1,
      changedFields: Object.keys(parsed.data),
      oldData: existing
        ? { billingMode: existing.billingMode as string, markupRate: Number(existing.markupRate), tokenMultiplier: Number(existing.tokenMultiplier) }
        : undefined,
      newData: { billingMode: rule.billingMode as string, markupRate: Number(rule.markupRate), tokenMultiplier: Number(rule.tokenMultiplier) },
      requestId: req.headers.get("x-request-id"),
    });

    return {
      item: {
        id: rule.id,
        stationId: rule.stationId,
        billingMode: rule.billingMode as string,
        markupRate: Number(rule.markupRate),
        tokenMultiplier: Number(rule.tokenMultiplier),
      },
    };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../_lib/method-not-allowed";
export const { POST, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "PUT"]);

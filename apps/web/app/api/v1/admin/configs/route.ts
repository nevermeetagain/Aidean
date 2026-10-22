/**
 * /api/v1/admin/configs — 站点配置通用键值（P2，泛化 ladder/config 模式）。
 *
 * GET ：requireAdminApi → 白名单（ADMIN_CONFIG_KEYS）内可编辑配置合并投影
 *       （库内缺行回退注册表默认值，前端拿到完整元信息渲染键值表单）。
 * PUT ：requireAdminApi → AdminConfigPutSchema（configKey 白名单枚举 + configValue number|string）
 *       → normalizeConfigValue（按 valueRule 钩子：number clamp / string trim+长度+空串+枚举 /
 *         boolean true|false 归一化；非法→40000 中文）→ 分派落库
 *       （ladder_score_granularity 走 setLadderGranularity + revalidate /models /ladder；
 *         其余键通用 upsert → 按 configGroup 失效读侧页面：partners→/partners、
 *         about→/about、pricing→/pricing）→ audit_logs action=2。
 *
 * ⚠️ Next 路由契约：本文件**仅可导出** `dynamic` 与 HTTP 方法等约定符号。
 *    注册表与归一化函数已下沉 `@aidean/shared`（constants/admin-config.constants.ts），
 *    不得在本文件再 export 其他符号，否则 `next build` 的 .next/types 校验会失败。
 *
 * 白名单扩容四处同步：shared ADMIN_CONFIG_KEYS + shared ADMIN_CONFIG_REGISTRY（含 valueRule）
 * + prisma seed systemConfigsData + 本文件 applyConfig 分派（seed 为值真源，registry 仅兜底）。
 */
import { revalidatePath, revalidateTag } from "next/cache";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { setLadderGranularity } from "../../../../../lib/features/ladder/config";
import {
  ADMIN_CONFIG_KEYS,
  ADMIN_CONFIG_REGISTRY,
  AdminConfigPutSchema,
  normalizeConfigValue,
  type AdminConfigRegistryEntry,
} from "@aidean/shared";

export const dynamic = "force-dynamic";

/** 按键分派：仅支持已注册的白名单键；返回值 = 落库后的规范化 configValue */
async function applyConfig(
  entry: AdminConfigRegistryEntry,
  configValue: string | number
): Promise<string> {
  const normalized = normalizeConfigValue(entry, configValue);
  if (!normalized.ok) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, normalized.message);
  }
  const value = normalized.value;
  // 需读侧联动的键在此分派（revalidate + service 落库）；其余键走通用 upsert
  switch (entry.configKey) {
    case "ladder_score_granularity": {
      const effective = await setLadderGranularity(Number(value));
      revalidatePath("/models");
      revalidatePath("/ladder");
      return String(effective);
    }
    default: {
      await prisma.systemConfig.upsert({
        where: { configKey: entry.configKey },
        update: { configValue: value },
        create: {
          configKey: entry.configKey,
          configGroup: entry.configGroup,
          configType: entry.configType,
          configValue: value,
          defaultValue: entry.defaultValue,
          description: entry.description,
          inputType: entry.inputType,
          sortOrder: entry.sortOrder,
        },
      });
      // 读侧页面按 configGroup 精确失效（2026-09-23：/about 与 /pricing 由 force-dynamic 改 ISR，
      // 保存若无 revalidatePath 会滞后到 revalidate 窗口结束才可见；三组键各自独立失效目标）。
      if (entry.configGroup === "partners") revalidatePath("/partners");
      else if (entry.configGroup === "about") revalidatePath("/about");
      else if (entry.configGroup === "pricing") revalidatePath("/pricing");
      else if (entry.configGroup === "roadmap") {
        // 路线图双读侧：/roadmap 页与首页「产品路线图」区块共用同一键，两处一起失效
        revalidatePath("/roadmap");
        revalidatePath("/");
      } else if (entry.configGroup === "home") {
        // S4 首页区块：清 brand/home 缓存标签并失效首页 ISR（保存即时可见）
        revalidateTag("site-home");
        revalidatePath("/");
      } else if (entry.configGroup === "docs") {
        revalidateTag("site-docs");
        revalidatePath("/docs");
      } else if (entry.configGroup === "general") {
        // S4 站名/SEO：清品牌缓存 + 失效首页（根 generateMetadata 消费 site.*）
        revalidateTag("site-branding");
        revalidatePath("/");
      }
      return value;
    }
  }
}

export const GET = withApi(async () => {
  await requireAdminApi("admin.configs.read");
  const rows = await prisma.systemConfig.findMany({
    where: { configKey: { in: [...ADMIN_CONFIG_KEYS] } },
  });
  const rowByKey = new Map(rows.map((r) => [r.configKey, r]));
  return {
    configs: ADMIN_CONFIG_REGISTRY.map((c) => {
      const row = rowByKey.get(c.configKey);
      return {
        configKey: c.configKey,
        configGroup: c.configGroup,
        configType: c.configType,
        configValue: row?.configValue ?? c.defaultValue,
        defaultValue: c.defaultValue,
        description: c.description,
        inputType: c.inputType,
        sortOrder: c.sortOrder,
        updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
      };
    }),
  };
});

export const PUT = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.configs.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminConfigPutSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { configKey, configValue } = parsed.data;
  const entry = ADMIN_CONFIG_REGISTRY.find((c) => c.configKey === configKey);
  if (!entry) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "该配置项不在可编辑白名单内");
  }

  const persisted = await applyConfig(entry, configValue);

  await writeAudit({
    actorId: session.userId,
    tableName: "system_configs",
    recordId: configKey,
    action: 2,
    changedFields: ["configValue"],
    newData: { configKey, configType: entry.configType, configValue: persisted },
    requestId: req.headers.get("x-request-id"),
  });

  return { config: { configKey, configType: entry.configType, configValue: persisted } };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "PUT"]);

// S2 · 功能开关契约 —— 由 docs/任务规划V0.5.0/contracts/01-api.contract.ts §S2 经 TASK-014 原样落地。
// 落地映射（唯一源 = packages/shared/src/schemas/*，ADR-P001）：FeatureFlag* → 本文件。
// 端点（01-api.contract.ts §端点注册表）：
//   API-002 GET /api/v1/system/features（PUBLIC，TASK-015）→ data = PublicFeaturesSchema；
//   API-003 GET /api/v1/admin/feature-flags（ADMIN:admin.configs.read，TASK-016）→ data = { items: AdminFeatureFlagSchema[] }；
//   API-004 PATCH /api/v1/admin/feature-flags/[id]（ADMIN:admin.configs.write，TASK-016）→ data = AdminFeatureFlagSchema。
// 关闭受控面（FEATURE_GATES）时：入口隐藏 + 页面 403 态 + API 50011（FEATURE_DISABLED，02-errors.contract.ts）。
import { z } from "zod";

const Iso = z.string().datetime();

/** 种子中已存在的 8 个开关码（apps/web/prisma/seed.ts FEATURE_FLAGS），新增码须同步 seed + 本表。
 *  T120-20 跟进：新增安全类开关 `auth.password_reset`（缺省 off，生产配置 SMTP 后由运营打开；contracts/03b）。 */
export const FEATURE_FLAG_CODES = [
  "ladder.model",
  "ladder.station",
  "gateway.chat",
  "favorites.enabled",
  "comparison.enabled",
  "evaluation.enabled",
  "chat.support",
  "auth.password_reset",
] as const;
export const FeatureFlagCodeSchema = z.enum(FEATURE_FLAG_CODES);
/**
 * 安全类开关：读取失败时 **fail-closed**（视为关闭），其余开关维持 DESIGN-001 fail-open。
 * 裁决：Q-12-08 选 B（仅对新增的安全类开关 fail-closed；《12_风险与待裁决》）。
 */
export const FAIL_CLOSED_FEATURE_FLAGS: ReadonlyArray<(typeof FEATURE_FLAG_CODES)[number]> = ["auth.password_reset"];
/** 公开读：GET /api/v1/system/features → data = { flags: Record<code, boolean> }（只暴露开/关，不暴露 rollout/config） */
export const PublicFeaturesSchema = z.object({ flags: z.record(FeatureFlagCodeSchema, z.boolean()) });
/** 后台：GET /api/v1/admin/feature-flags → data = { items: AdminFeatureFlag[] } */
export const AdminFeatureFlagSchema = z.object({
  id: z.string(),
  flagCode: FeatureFlagCodeSchema,
  name: z.string(),
  nameCn: z.string().nullable(),
  description: z.string().nullable(),
  isEnabled: z.boolean(),
  category: z.string().nullable(),
  priority: z.number().int(),
  updatedAt: Iso,
});
/** 后台：PATCH /api/v1/admin/feature-flags/[id]（幂等：同值 PATCH 返回同一结果，仍写审计） */
export const AdminFeatureFlagPatchSchema = z
  .object({ isEnabled: z.boolean().optional(), description: z.string().max(500).nullable().optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "至少修改一个字段");
/** 开关 → 受控面映射（关闭时：入口隐藏 + 页面 403 态 + API 50011）。仅登记有消费面的码 */
export const FEATURE_GATES: Readonly<Partial<Record<(typeof FEATURE_FLAG_CODES)[number], { api: string[]; pages: string[] }>>> = {
  "ladder.station": { api: ["GET /api/v1/ladder?type=stations"], pages: ["/providers"] },
  "gateway.chat": { api: ["POST /api/v1/gateway/chat"], pages: [] },
  "evaluation.enabled": { api: ["POST /api/v1/evaluations"], pages: ["/evaluations/new"] },
  "favorites.enabled": { api: ["GET|POST /api/v1/user/favorites", "DELETE /api/v1/user/favorites/[id]"], pages: [] },
  "ladder.model": { api: ["GET /api/v1/ladder?type=models"], pages: ["/models", "/ladder"] },
  "auth.password_reset": { api: ["POST /api/v1/auth/password/reset/code", "POST /api/v1/auth/password/reset"], pages: [] },
};

export type FeatureFlagCode = z.infer<typeof FeatureFlagCodeSchema>;
export type PublicFeatures = z.infer<typeof PublicFeaturesSchema>;
export type AdminFeatureFlag = z.infer<typeof AdminFeatureFlagSchema>;
export type AdminFeatureFlagPatch = z.infer<typeof AdminFeatureFlagPatchSchema>;

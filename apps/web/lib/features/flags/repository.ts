/**
 * lib/features/flags/repository — 功能开关读数据层（TASK-015 / 需求 §3.9 / DESIGN-001）。
 *
 * 真源：feature_flags 表（apps/web/prisma/schema.prisma:1524，S0 已建，S2 无迁移）。
 * 判定口径（开启 = isEnabled 且落在生效时间窗内）：
 * - isEnabled=false → 关闭；
 * - enableFrom 存在且晚于当前 → 未到开启时间 → 关闭；
 * - enableUntil 存在且早于/等于当前 → 已过结束时间 → 关闭；
 * - 其余（isEnabled 且窗口内）→ 开启；
 * - 表缺该 code 行 → 视为关闭（fail-closed by default，与「只暴露 seed 已登记的 7 码」一致）。
 * 说明：DB 异常**不在此吞掉**，交由 service 层依 DESIGN-001 做 fail-open。
 */
import type { PrismaClient } from "@prisma/client";

import { FEATURE_FLAG_CODES, type FeatureFlagCode } from "@aidean/shared";

import { prisma } from "../../db/prisma";

export type FeatureFlagState = Record<FeatureFlagCode, boolean>;

/** 全部开启（service fail-open 兜底用）。 */
export function allEnabled(): FeatureFlagState {
  return Object.fromEntries(FEATURE_FLAG_CODES.map((c) => [c, true])) as FeatureFlagState;
}

/** 读 feature_flags 并按「isEnabled ∧ 时间窗」折算成 code→boolean 全量快照。 */
export async function loadFeatureFlags(client: PrismaClient = prisma): Promise<FeatureFlagState> {
  const rows = await client.featureFlag.findMany({
    select: { flagCode: true, isEnabled: true, enableFrom: true, enableUntil: true },
  });
  const now = Date.now();
  const byCode = new Map(rows.map((r) => [r.flagCode, r]));
  const out = {} as FeatureFlagState;
  for (const code of FEATURE_FLAG_CODES) {
    const row = byCode.get(code);
    if (!row || !row.isEnabled) {
      out[code] = false;
      continue;
    }
    if (row.enableFrom && row.enableFrom.getTime() > now) {
      out[code] = false;
      continue;
    }
    if (row.enableUntil && row.enableUntil.getTime() <= now) {
      out[code] = false;
      continue;
    }
    out[code] = true;
  }
  return out;
}

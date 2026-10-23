// TASK-014 功能开关契约单测：8 码集合 / seed 一致性 / 公开·后台 DTO / PATCH strict / 受控面映射
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  AdminFeatureFlagPatchSchema,
  AdminFeatureFlagSchema,
  FEATURE_FLAG_CODES,
  FEATURE_GATES,
  FeatureFlagCodeSchema,
  PublicFeaturesSchema,
} from "../index";

describe("feature-flags 契约码（TASK-014）", () => {
  it("FEATURE_FLAG_CODES 恰为 8 码且枚举逐一放行", () => {
    expect(FEATURE_FLAG_CODES).toHaveLength(8);
    for (const code of FEATURE_FLAG_CODES) {
      expect(FeatureFlagCodeSchema.safeParse(code).success).toBe(true);
    }
    expect(FeatureFlagCodeSchema.safeParse("bogus.flag").success).toBe(false);
  });

  it("码值集合 = seed.ts featureFlagsData 的 flagCode 集合（读文件正则提取，防双源漂移）", () => {
    const seedPath = fileURLToPath(new URL("../../../../apps/web/prisma/seed.ts", import.meta.url));
    const text = readFileSync(seedPath, "utf8");
    const seedCodes = [...text.matchAll(/flagCode:\s*'([^']+)'/g)].map((m) => m[1]);
    expect(new Set(seedCodes)).toEqual(new Set(FEATURE_FLAG_CODES));
    expect(seedCodes).toHaveLength(8);
  });
});

describe("PublicFeaturesSchema（GET /api/v1/system/features）", () => {
  it("接受合法 code→boolean，拒绝未知码与非布尔值", () => {
    expect(PublicFeaturesSchema.safeParse({ flags: { "ladder.model": true } }).success).toBe(true);
    expect(PublicFeaturesSchema.safeParse({ flags: {} }).success).toBe(true);
    expect(PublicFeaturesSchema.safeParse({ flags: { "unknown.code": true } }).success).toBe(false);
    expect(PublicFeaturesSchema.safeParse({ flags: { "ladder.model": "yes" } }).success).toBe(false);
  });
});

describe("AdminFeatureFlagSchema（GET /api/v1/admin/feature-flags）", () => {
  const base = {
    id: "f1",
    flagCode: "ladder.station",
    name: "大模型云服务天梯图",
    nameCn: "大模型云服务天梯图",
    description: "模型站榜功能开关",
    isEnabled: true,
    category: "ladder",
    priority: 2,
    updatedAt: "2026-10-16T00:00:00.000Z",
  };

  it("合法行放行；null 字段容忍", () => {
    expect(AdminFeatureFlagSchema.safeParse(base).success).toBe(true);
    expect(AdminFeatureFlagSchema.safeParse({ ...base, nameCn: null, description: null, category: null }).success).toBe(true);
  });

  it("非法 flagCode / 缺 updatedAt / priority 非整数 拒绝", () => {
    expect(AdminFeatureFlagSchema.safeParse({ ...base, flagCode: "nope" }).success).toBe(false);
    expect(AdminFeatureFlagSchema.safeParse({ ...base, updatedAt: undefined }).success).toBe(false);
    expect(AdminFeatureFlagSchema.safeParse({ ...base, priority: 1.5 }).success).toBe(false);
  });
});

describe("AdminFeatureFlagPatchSchema（PATCH /api/v1/admin/feature-flags/[id]）", () => {
  it("isEnabled / description 单独或组合放行", () => {
    expect(AdminFeatureFlagPatchSchema.safeParse({ isEnabled: false }).success).toBe(true);
    expect(AdminFeatureFlagPatchSchema.safeParse({ description: "改备注" }).success).toBe(true);
    expect(AdminFeatureFlagPatchSchema.safeParse({ description: null }).success).toBe(true);
  });

  it("strict 拒未知键；空对象（至少修改一个字段）拒绝；description>500 拒绝", () => {
    expect(AdminFeatureFlagPatchSchema.safeParse({ priority: 9 }).success).toBe(false);
    expect(AdminFeatureFlagPatchSchema.safeParse({}).success).toBe(false);
    expect(AdminFeatureFlagPatchSchema.safeParse({ description: "x".repeat(501) }).success).toBe(false);
  });
});

describe("FEATURE_GATES 受控面映射", () => {
  it("每个 gate 键均为合法开关码，且仅登记有消费面的码（api 或 pages 非空）", () => {
    for (const key of Object.keys(FEATURE_GATES)) {
      expect(FEATURE_FLAG_CODES).toContain(key);
      const gate = FEATURE_GATES[key as (typeof FEATURE_FLAG_CODES)[number]];
      expect(gate).toBeDefined();
      expect(gate!.api.length + gate!.pages.length).toBeGreaterThan(0);
    }
    // 需求 §3.9：天梯站榜关闭 → /providers 隐藏入口 + 页面态 + API
    expect(FEATURE_GATES["ladder.station"]?.pages).toContain("/providers");
  });
});

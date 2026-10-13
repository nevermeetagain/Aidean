import { describe, expect, it } from "vitest";
import {
  PrioritiesPutSchema,
  PriorityUpsertSchema,
  QuotaUsageItemSchema,
  TierMappingsPutSchema,
  TierMappingUpsertSchema,
  UserProfileSchema,
} from "../schemas/user.schema";
import { AuthResponseSchema, RegisterSchema } from "../schemas/auth.schema";

describe("user 域契约", () => {
  it("priority 边界：1 与 99 通过，0 与 100 拒绝", () => {
    expect(PriorityUpsertSchema.safeParse({ modelId: "m1", priority: 1 }).success).toBe(true);
    expect(PriorityUpsertSchema.safeParse({ modelId: "m1", priority: 99 }).success).toBe(true);
    expect(PriorityUpsertSchema.safeParse({ modelId: "m1", priority: 0 }).success).toBe(false);
    expect(PriorityUpsertSchema.safeParse({ modelId: "m1", priority: 100 }).success).toBe(false);
    // 整数约束
    expect(PriorityUpsertSchema.safeParse({ modelId: "m1", priority: 1.5 }).success).toBe(false);
  });

  it("tier-mappings：FREE 不在固定四档枚举内即被拒", () => {
    expect(TierMappingUpsertSchema.safeParse({ tier: "FREE", modelId: "m1" }).success).toBe(false);
    for (const tier of ["OPUS", "SONNET", "FABLE", "HAIKU"] as const) {
      expect(TierMappingUpsertSchema.safeParse({ tier, modelId: "m1" }).success).toBe(true);
    }
  });

  it("整组覆盖数组上限与最小约束", () => {
    const one = { modelId: "m1", priority: 50 };
    expect(PrioritiesPutSchema.safeParse(Array.from({ length: 99 }, () => one)).success).toBe(true);
    expect(PrioritiesPutSchema.safeParse(Array.from({ length: 100 }, () => one)).success).toBe(false);
    expect(
      TierMappingsPutSchema.safeParse([{ tier: "OPUS", modelId: "m" }]).success
    ).toBe(true);
    // modelId 非空约束
    expect(PrioritiesPutSchema.safeParse([{ modelId: "", priority: 3 }]).success).toBe(false);
  });

  it("UserProfile 契约形状与 QuotaUsageItem 宽 ISO/默认值", () => {
    expect(
      UserProfileSchema.safeParse({ id: "u1", email: "a@b.co", nickname: null, tier: "NORMAL" })
        .success
    ).toBe(true);
    expect(
      UserProfileSchema.safeParse({
        id: "u1",
        email: "a@b.co",
        nickname: null,
        tier: "FREE",
      }).success
    ).toBe(false);

    const quota = QuotaUsageItemSchema.parse({
      modelId: "m1",
      modelName: "GPT-4o",
      quotaTokens: 1000,
      totalQuotaTokens: 10000,
      resetCycle: "DAY",
      nextResetAt: "2026-09-01T00:00:00+08:00",
    });
    expect(quota.usedTokens).toBe(0); // default(0)
    // usedTokens 显式值透传；resetCycle 非法被拒
    expect(
      QuotaUsageItemSchema.safeParse({
        modelId: "m1",
        modelName: "x",
        quotaTokens: 1,
        totalQuotaTokens: 2,
        resetCycle: "HOUR",
        nextResetAt: "bad",
      }).success
    ).toBe(false);
  });

  it("Register nickname 必填化与 AuthResponse 兼容 UserProfile 形状", () => {
    expect(RegisterSchema.safeParse({ email: "a@b.co", password: "longenough1" }).success).toBe(
      false
    ); // 缺 nickname 被拒
    expect(
      RegisterSchema.safeParse({
        email: "a@b.co",
        password: "longenough1",
        nickname: "阿典",
      }).success
    ).toBe(true);

    // 旧载荷（无 tier）仍通过 —— 向后兼容
    expect(
      AuthResponseSchema.safeParse({
        user: { id: "u1", email: "a@b.co", nickname: null },
        accessToken: "at",
        refreshToken: "rt",
        expiresAt: "2026-01-01T00:00:00Z",
      }).success
    ).toBe(true);
    // 新载荷（含 tier）同样通过
    expect(
      AuthResponseSchema.safeParse({
        user: { id: "u1", email: "a@b.co", nickname: "阿典", tier: "MAX" },
        accessToken: "at",
        refreshToken: "rt",
        expiresAt: "2026-01-01T00:00:00Z",
      }).success
    ).toBe(true);
  });
});

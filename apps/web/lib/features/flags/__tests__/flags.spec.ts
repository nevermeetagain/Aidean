/**
 * TASK-015 功能开关运行时单测（≥8 例）：
 * - repository.loadFeatureFlags：全开 / 单关 / enableFrom 未到 / enableUntil 已过 / 窗口内 / 缺行；
 * - service.requireFeature：开启放行 / 关闭抛 50011；
 * - service fail-open：DB 读取异常一律视为开启（DESIGN-001，待 U-7）。
 * 策略：repository 直传 fake client（纯逻辑）；service mock next/cache（unstable_cache 降级恒等）+ mock prisma。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// next/cache：unstable_cache 降级为恒等，避开 Next 运行时（对齐 permissions.spec 口径）
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

const prismaState = vi.hoisted(() => ({ featureFlag: { findMany: vi.fn() } }));
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

import { FEATURE_FLAG_CODES, type FeatureFlagCode } from "@aidean/shared";
import { ApiError } from "../../../../app/api/v1/_lib/errors";

import { allEnabled, loadFeatureFlags } from "../repository";
import { getFeatureFlags, isFeatureEnabled, requireFeature } from "../service";

/** 造一行 feature_flags（默认开启、无时间窗） */
function row(code: FeatureFlagCode, over: Record<string, unknown> = {}) {
  return {
    flagCode: code,
    isEnabled: true,
    enableFrom: null,
    enableUntil: null,
    ...over,
  };
}

/** fake prisma client（repository 显式注入，绕过全局 prisma mock） */
function fakeClient(rows: ReturnType<typeof row>[]) {
  return { featureFlag: { findMany: async () => rows } } as never;
}

const HOUR = 3_600_000;

describe("flags.repository · loadFeatureFlags 时间窗与缺行折算", () => {
  it("全部 isEnabled 且无时间窗 → 8 码全开", async () => {
    const flags = await loadFeatureFlags(fakeClient(FEATURE_FLAG_CODES.map((c) => row(c))));
    expect(Object.values(flags)).toHaveLength(8);
    expect(Object.values(flags).every(Boolean)).toBe(true);
  });

  it("单个 isEnabled=false → 仅该码关闭", async () => {
    const flags = await loadFeatureFlags(
      fakeClient(FEATURE_FLAG_CODES.map((c) => row(c, { isEnabled: c === "ladder.station" ? false : true }))),
    );
    expect(flags["ladder.station"]).toBe(false);
    expect(flags["ladder.model"]).toBe(true);
  });

  it("enableFrom 未到（未来）→ 关闭", async () => {
    const flags = await loadFeatureFlags(
      fakeClient([row("gateway.chat", { enableFrom: new Date(Date.now() + HOUR) })]),
    );
    expect(flags["gateway.chat"]).toBe(false);
  });

  it("enableUntil 已过（过去）→ 关闭", async () => {
    const flags = await loadFeatureFlags(
      fakeClient([row("evaluation.enabled", { enableUntil: new Date(Date.now() - HOUR) })]),
    );
    expect(flags["evaluation.enabled"]).toBe(false);
  });

  it("enableFrom 已过 + enableUntil 未到（窗口内）→ 开启", async () => {
    const flags = await loadFeatureFlags(
      fakeClient([row("comparison.enabled", { enableFrom: new Date(Date.now() - HOUR), enableUntil: new Date(Date.now() + HOUR) })]),
    );
    expect(flags["comparison.enabled"]).toBe(true);
  });

  it("表缺某 code 行 → 视为关闭（fail-closed by default）", async () => {
    const flags = await loadFeatureFlags(fakeClient([row("ladder.model")]));
    expect(flags["ladder.model"]).toBe(true);
    expect(flags["ladder.station"]).toBe(false);
    expect(flags["chat.support"]).toBe(false);
  });
});

describe("flags.service · requireFeature 与 fail-open", () => {
  beforeEach(() => {
    prismaState.featureFlag.findMany.mockReset();
  });

  it("开启码：requireFeature 放行、isFeatureEnabled=true", async () => {
    prismaState.featureFlag.findMany.mockResolvedValue(FEATURE_FLAG_CODES.map((c) => row(c)));
    await expect(requireFeature("gateway.chat")).resolves.toBeUndefined();
    await expect(isFeatureEnabled("gateway.chat")).resolves.toBe(true);
  });

  it("关闭码：requireFeature 抛 ApiError 50011（FEATURE_DISABLED）", async () => {
    prismaState.featureFlag.findMany.mockResolvedValue(
      FEATURE_FLAG_CODES.map((c) => row(c, { isEnabled: c !== "ladder.station" })),
    );
    const err = await requireFeature("ladder.station").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(50011);
  });

  it("DB 异常：getFeatureFlags fail-open → 普通开关全开，requireFeature 放行", async () => {
    prismaState.featureFlag.findMany.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const flags = await getFeatureFlags();
    expect(flags).toEqual(allEnabled());
    await expect(requireFeature("ladder.station")).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it("DB 异常：安全类开关 auth.password_reset fail-closed → 50011（Q-12-08 B）", async () => {
    prismaState.featureFlag.findMany.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(allEnabled()["auth.password_reset"]).toBe(false);
    const err = await requireFeature("auth.password_reset").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(50011);
    spy.mockRestore();
  });

  it("表缺 auth.password_reset 行（旧库未 seed）→ 关闭", async () => {
    prismaState.featureFlag.findMany.mockResolvedValue(
      FEATURE_FLAG_CODES.filter((c) => c !== "auth.password_reset").map((c) => row(c, { isEnabled: true })),
    );
    await expect(isFeatureEnabled("auth.password_reset")).resolves.toBe(false);
  });
});

/** TASK-097：invalidatePriceViews 两层失效（ISR 4 路径 + Redis 天梯矩阵），Redis 失败静默。 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const nextCache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
const svc = vi.hoisted(() => ({ ladderService: { invalidateLadderCache: vi.fn() } }));
vi.mock("next/cache", () => nextCache);
vi.mock("../service", () => svc);

import { invalidatePriceViews } from "../price-views";

beforeEach(() => vi.resetAllMocks());

describe("invalidatePriceViews", () => {
  it("失效 /pricing、/models、/(site)/models/[slug]（含路由组，review-097 M1）、/ladder 并清 Redis 天梯缓存", async () => {
    await invalidatePriceViews();
    const paths = nextCache.revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(["/pricing", "/models", "/(site)/models/[slug]", "/ladder"]);
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/(site)/models/[slug]", "page");
    // 页面文件真实存在于该路由组路径下（防止路由组改名后失效静默失灵）
    const { existsSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    expect(existsSync(resolve(__dirname, "../../../../app/(site)/models/[slug]/page.tsx"))).toBe(true);
    expect(svc.ladderService.invalidateLadderCache).toHaveBeenCalledTimes(1);
  });

  it("Redis 失效抛错 → 静默，不向写路由抛出", async () => {
    svc.ladderService.invalidateLadderCache.mockRejectedValueOnce(new Error("redis down"));
    await expect(invalidatePriceViews()).resolves.toBeUndefined();
  });
});

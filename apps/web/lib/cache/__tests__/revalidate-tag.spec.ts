// T120-03 缺陷 D1/D2 根因回归：next@15.5.28 FileSystemCache.revalidateTag 仅首次写 tagsManifest → 二次失效被吞。
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cacheStub = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock("next/cache", () => cacheStub);

const req = createRequire(import.meta.url);
const { tagsManifest, isStale } = req("next/dist/server/lib/incremental-cache/tags-manifest.external") as {
  tagsManifest: Map<string, number>;
  isStale: (tags: string[], ts: number) => boolean;
};
const FileSystemCache = (req("next/dist/server/lib/incremental-cache/file-system-cache") as { default: new (ctx: unknown) => { revalidateTag: (t: string) => Promise<void> } }).default;

import { __setTagsManifestForTest, revalidateTagNow } from "../revalidate-tag";

const TAG = "t120-03-probe";
let now = 1_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  now = 1_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  tagsManifest.delete(TAG);
  __setTagsManifestForTest(undefined); // 走真实 require 解析
  cacheStub.revalidateTag.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  tagsManifest.delete(TAG);
});

describe("根因复现：Next 原生 revalidateTag 第二次不刷新时间戳", () => {
  it("首次失效后重建的条目，在第二次原生失效后仍判为新鲜（即 D1/D2）", async () => {
    const fsc = new FileSystemCache({ fs: {}, serverDistDir: "/tmp", revalidatedTags: [], maxMemoryCacheSize: 0 });
    await fsc.revalidateTag(TAG); // T=1_000_000
    now += 5_000;
    const rebuiltAt = now; // 首次失效后重建的条目
    now += 5_000;
    await fsc.revalidateTag(TAG); // 第二次写入
    expect(tagsManifest.get(TAG)).toBe(1_000_000);
    expect(isStale([TAG], rebuiltAt)).toBe(false); // 被吞：旧值继续命中
  });
});

describe("revalidateTagNow", () => {
  it("每次调用都刷新时间戳 → 重建后的条目在第二次失效后判陈旧", () => {
    revalidateTagNow(TAG);
    now += 5_000;
    const rebuiltAt = now;
    now += 5_000;
    revalidateTagNow(TAG);
    expect(tagsManifest.get(TAG)).toBe(now);
    expect(isStale([TAG], rebuiltAt)).toBe(true);
    expect(cacheStub.revalidateTag).toHaveBeenCalledTimes(2);
    expect(cacheStub.revalidateTag).toHaveBeenCalledWith(TAG);
  });

  it("1s 后补刷一次：写后才回填的在途读条目同样失效", () => {
    revalidateTagNow(TAG);
    now += 300;
    const lateFill = now; // 写前开始、写后回填旧值
    now += 900;
    vi.advanceTimersByTime(1000);
    expect(isStale([TAG], lateFill)).toBe(true);
  });

  it("内部模块不可用时退化为原生行为，不抛错", () => {
    __setTagsManifestForTest(null);
    expect(() => revalidateTagNow(TAG)).not.toThrow();
    expect(cacheStub.revalidateTag).toHaveBeenCalledWith(TAG);
    expect(tagsManifest.has(TAG)).toBe(false);
  });
});

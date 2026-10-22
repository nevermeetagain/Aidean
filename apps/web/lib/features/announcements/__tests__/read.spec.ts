/**
 * 公告读模型（S7.4 消费闭环）单测。
 * 覆盖：isStillActive 纯函数（null/未来/过去）；listActiveAnnouncements 映射（date 取 publishedAt??createdAt）
 *      + 前台过滤条件（isPublished/isActive/deletedAt null/expiredAt）
 *      + 失败口径（UX-03）：listActiveAnnouncements 抛错、loadActiveAnnouncements 区分失败/空、横幅失败回落 null。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaState = vi.hoisted(() => ({
  announcement: { findMany: vi.fn() },
}));

vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

import {
  isStillActive,
  listActiveAnnouncements,
  loadActiveAnnouncements,
  pickBannerAnnouncement,
} from "../repository";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("isStillActive", () => {
  const now = new Date("2026-10-12T00:00:00Z");
  it("无过期时间 → 长期有效", () => expect(isStillActive(null, now)).toBe(true));
  it("过期时间在未来 → 有效", () => expect(isStillActive(new Date("2026-12-01T00:00:00Z"), now)).toBe(true));
  it("过期时间已过 → 失效", () => expect(isStillActive(new Date("2026-01-01T00:00:00Z"), now)).toBe(false));
});

describe("listActiveAnnouncements", () => {
  it("映射为前台卡片：date 取 publishedAt，缺失回落 createdAt", async () => {
    prismaState.announcement.findMany.mockResolvedValueOnce([
      {
        id: "a1",
        title: "维护公告",
        content: "今晚 22:00 停机",
        type: "maintenance",
        isPinned: true,
        publishedAt: new Date("2026-10-10T00:00:00Z"),
        createdAt: new Date("2026-10-09T00:00:00Z"),
      },
      {
        id: "a2",
        title: "更新公告",
        content: "新增模型",
        type: "update",
        isPinned: false,
        publishedAt: null,
        createdAt: new Date("2026-10-11T00:00:00Z"),
      },
    ]);
    const list = await listActiveAnnouncements(new Date("2026-10-12T00:00:00Z"));
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ id: "a1", date: "2026-10-10", isPinned: true, type: "maintenance" });
    expect(list[1]).toMatchObject({ id: "a2", date: "2026-10-11" });
  });

  it("前台查询过滤：仅已发布+启用+未删除+未过期", async () => {
    prismaState.announcement.findMany.mockResolvedValueOnce([]);
    await listActiveAnnouncements(new Date("2026-10-12T00:00:00Z"));
    const arg = prismaState.announcement.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(arg.where).toMatchObject({ deletedAt: null, isPublished: true, isActive: true });
    expect(Array.isArray(arg.where.OR)).toBe(true);
  });

  // UX-03：原口径「DB 失败 → 空数组」导致停库时页面显示「当前暂无公告」，与真实空数据不可区分；
  // 改为失败上抛，由页面渲染错误态（期望随行为更新）。
  it("DB 失败 → 抛错（不再伪装成空数组）", async () => {
    prismaState.announcement.findMany.mockRejectedValueOnce(new Error("db down"));
    await expect(listActiveAnnouncements()).rejects.toThrow("db down");
  });
});

describe("loadActiveAnnouncements（页面读模型：失败≠空）", () => {
  it("成功且无数据 → ok:true + 空列表（真实空态）", async () => {
    prismaState.announcement.findMany.mockResolvedValueOnce([]);
    expect(await loadActiveAnnouncements()).toEqual({ ok: true, items: [] });
  });

  it("DB 失败 → ok:false（错误态，不落空列表）", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    prismaState.announcement.findMany.mockRejectedValueOnce(new Error("db down"));
    const res = await loadActiveAnnouncements();
    expect(res.ok).toBe(false);
    expect("items" in res).toBe(false);
  });
});

describe("pickBannerAnnouncement（首页横幅非侵入）", () => {
  it("DB 失败 → null（不阻断首页）", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    prismaState.announcement.findMany.mockRejectedValueOnce(new Error("db down"));
    expect(await pickBannerAnnouncement()).toBeNull();
  });
});

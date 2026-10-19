// TASK-021 收藏契约单测：FAVORITE_TYPES 二值 / 非法 refType 拒绝 / 超长 note 拒绝 / 分页默认与边界 / target 可空 / delete 字面量 / prisma enum 防双源漂移
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  FAVORITE_TYPES,
  FavoriteCreateSchema,
  FavoriteDeleteResponseSchema,
  FavoriteItemSchema,
  FavoriteListQuerySchema,
  FavoriteListResponseSchema,
} from "../index";

describe("favorites 契约（TASK-021）", () => {
  it("FAVORITE_TYPES 恰为 MODEL / API_STATION 两值（对齐 schema.prisma FavoriteType）", () => {
    expect(FAVORITE_TYPES).toEqual(["MODEL", "API_STATION"]);
  });

  it("FAVORITE_TYPES = schema.prisma enum FavoriteType 成员集（读文件防双源漂移）", () => {
    const p = fileURLToPath(new URL("../../../../apps/web/prisma/schema.prisma", import.meta.url));
    const block = /enum FavoriteType \{([^}]*)\}/.exec(readFileSync(p, "utf8"))![1];
    expect(block.trim().split(/\s+/).sort()).toEqual([...FAVORITE_TYPES].sort());
  });

  it("FavoriteCreateSchema：合法放行，非法 refType 拒绝", () => {
    expect(FavoriteCreateSchema.safeParse({ refType: "MODEL", refId: "m-1" }).success).toBe(true);
    expect(FavoriteCreateSchema.safeParse({ refType: "API_STATION", refId: "s-1", note: "常看" }).success).toBe(true);
    expect(FavoriteCreateSchema.safeParse({ refType: "bogus", refId: "x" }).success).toBe(false);
  });

  it("FavoriteCreateSchema：refId 非空 ≤64；note ≤200（超长拒绝）", () => {
    expect(FavoriteCreateSchema.safeParse({ refType: "MODEL", refId: "" }).success).toBe(false);
    expect(FavoriteCreateSchema.safeParse({ refType: "MODEL", refId: "r".repeat(65) }).success).toBe(false);
    expect(FavoriteCreateSchema.safeParse({ refType: "MODEL", refId: "r", note: "n".repeat(201) }).success).toBe(false);
    expect(FavoriteCreateSchema.safeParse({ refType: "MODEL", refId: "r", note: "n".repeat(200) }).success).toBe(true);
  });

  it("FavoriteListQuerySchema：默认 page=1/pageSize=20，pageSize 上限 50，refType 可选", () => {
    const def = FavoriteListQuerySchema.parse({});
    expect(def).toMatchObject({ page: 1, pageSize: 20 });
    expect(FavoriteListQuerySchema.safeParse({ pageSize: 51 }).success).toBe(false);
    expect(FavoriteListQuerySchema.safeParse({ refType: "MODEL" }).success).toBe(true);
    expect(FavoriteListQuerySchema.safeParse({ refType: "bogus" }).success).toBe(false);
    // coerce：字符串数字入参（query string）应被正确转换
    expect(FavoriteListQuerySchema.parse({ page: "3", pageSize: "10" })).toMatchObject({ page: 3, pageSize: 10 });
  });

  it("FavoriteItemSchema：target 下线为 null；note nullable", () => {
    const item = {
      id: "f1",
      refType: "MODEL",
      refId: "m1",
      note: null,
      createdAt: "2026-10-18T00:00:00.000Z",
      target: null,
    };
    expect(FavoriteItemSchema.safeParse(item).success).toBe(true);
    expect(
      FavoriteItemSchema.safeParse({ ...item, target: { name: "GPT", href: "/models/gpt", slug: "gpt" } }).success,
    ).toBe(true);
    expect(FavoriteItemSchema.safeParse({ ...item, createdAt: "not-a-date" }).success).toBe(false);
  });

  it("FavoriteListResponseSchema：paged 五要素齐备 + items 元素须为合法 FavoriteItem", () => {
    const validItem = {
      id: "f1",
      refType: "MODEL",
      refId: "m1",
      note: null,
      createdAt: "2026-10-18T00:00:00.000Z",
      target: null,
    };
    expect(FavoriteListResponseSchema.safeParse({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }).success).toBe(true);
    expect(
      FavoriteListResponseSchema.safeParse({ items: [validItem], total: 1, page: 1, pageSize: 20, totalPages: 1 }).success,
    ).toBe(true);
    // 元素缺 target.href 的合法 target 应被拒（target 对象内 href 必填）
    expect(
      FavoriteListResponseSchema.safeParse({
        items: [{ ...validItem, target: { name: "GPT", slug: null } }],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }).success,
    ).toBe(false);
  });

  it("FavoriteDeleteResponseSchema：deleted 恒为字面量 true", () => {
    expect(FavoriteDeleteResponseSchema.safeParse({ deleted: true }).success).toBe(true);
    expect(FavoriteDeleteResponseSchema.safeParse({ deleted: false }).success).toBe(false);
  });
});

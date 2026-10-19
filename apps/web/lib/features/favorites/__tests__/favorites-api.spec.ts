/**
 * TASK-022 收藏 API 单测（GET/POST/DELETE /api/v1/user/favorites）。
 * 策略同 admin-feature-flags.spec：vi.hoisted 桩 requireUserApi/requireFeature/prisma；
 *   vi.mock session/flags·service/db·prisma，再动态 import 真实路由驱动。
 * 覆盖：POST 合法/非法 refType/目标 20003/幂等/note 超长/未登录 10004/开关关闭 50011；
 *      GET 分页投影+反 N+1 断言/target 缺失 null/pageSize 越界/refType 过滤/coerce 字符串入参；
 *      DELETE 成功/0 行 40000 防枚举。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const authStub = vi.hoisted(() => ({ requireUserApi: vi.fn() }));
const featureStub = vi.hoisted(() => ({ requireFeature: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  favorite: { findMany: vi.fn(), count: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  aiModel: { findFirst: vi.fn(), findMany: vi.fn() },
  aPIStation: { findFirst: vi.fn(), findMany: vi.fn() },
}));

vi.mock("../../auth/session", () => authStub);
vi.mock("../../flags/service", () => featureStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const listRoute = await import("../../../../app/api/v1/user/favorites/route");
const itemRoute = await import("../../../../app/api/v1/user/favorites/[id]/route");

const SESSION_OK = { userId: "u-1" };
const CREATED_AT = new Date("2026-10-18T08:00:00.000Z");

const favRow = (over: Record<string, unknown> = {}) => ({
  id: "fav-1",
  refType: "MODEL",
  refId: "m-1",
  note: null,
  createdAt: CREATED_AT,
  ...over,
});

const postReq = (body: unknown) =>
  new Request("http://localhost/api/v1/user/favorites", { method: "POST", body: JSON.stringify(body) });
const getReq = (query = "") => new Request(`http://localhost/api/v1/user/favorites${query}`);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  featureStub.requireFeature.mockResolvedValue(undefined);
  authStub.requireUserApi.mockResolvedValue(SESSION_OK);
});

describe("POST /api/v1/user/favorites", () => {
  it("合法 MODEL 收藏 → 200 FavoriteItem（目标投影 name/href/slug）", async () => {
    prismaState.aiModel.findFirst.mockResolvedValue({ nameDisplay: "GPT-4o", slug: "gpt-4o" });
    prismaState.favorite.upsert.mockResolvedValue(favRow());

    const res = await listRoute.POST(postReq({ refType: "MODEL", refId: "m-1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(featureStub.requireFeature).toHaveBeenCalledWith("favorites.enabled");
    expect(body.data).toMatchObject({
      id: "fav-1",
      refType: "MODEL",
      refId: "m-1",
      createdAt: "2026-10-18T08:00:00.000Z",
      target: { name: "GPT-4o", href: "/models/gpt-4o", slug: "gpt-4o" },
    });
    expect(prismaState.favorite.upsert).toHaveBeenCalledTimes(1);
  });

  it("非法 refType → 40000 且不查目标、不写库", async () => {
    const res = await listRoute.POST(postReq({ refType: "bogus", refId: "x" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(prismaState.aiModel.findFirst).not.toHaveBeenCalled();
    expect(prismaState.favorite.upsert).not.toHaveBeenCalled();
  });

  it("目标不存在/已软删 → 20003（FAVORITE_TARGET_NOT_FOUND）且不 upsert", async () => {
    prismaState.aiModel.findFirst.mockResolvedValue(null);

    const res = await listRoute.POST(postReq({ refType: "MODEL", refId: "gone" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe(ERROR_CODES.FAVORITE_TARGET_NOT_FOUND);
    expect(prismaState.favorite.upsert).not.toHaveBeenCalled();
  });

  it("幂等：upsert 命中唯一键返回既有记录 → 200 既有 id", async () => {
    prismaState.aiModel.findFirst.mockResolvedValue({ nameDisplay: "GPT-4o", slug: "gpt-4o" });
    prismaState.favorite.upsert.mockResolvedValue(favRow({ id: "fav-existing" }));

    const res = await listRoute.POST(postReq({ refType: "MODEL", refId: "m-1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe("fav-existing");
    expect(prismaState.favorite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_refType_refId: { userId: "u-1", refType: "MODEL", refId: "m-1" } } }),
    );
  });

  it("note 超长（>200）→ 40000（schema 先于目标校验）", async () => {
    const res = await listRoute.POST(postReq({ refType: "MODEL", refId: "m-1", note: "n".repeat(201) }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(prismaState.aiModel.findFirst).not.toHaveBeenCalled();
  });

  it("未登录 → 401/10004 且不进下游查库", async () => {
    authStub.requireUserApi.mockRejectedValue(new ApiError(ERROR_CODES.UNAUTHENTICATED, "请先登录"));

    const res = await listRoute.POST(postReq({ refType: "MODEL", refId: "m-1" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.code).toBe(ERROR_CODES.UNAUTHENTICATED);
    expect(prismaState.aiModel.findFirst).not.toHaveBeenCalled();
  });

  it("开关关闭 → 403/50011（守卫先于鉴权，requireUserApi 不触发）", async () => {
    featureStub.requireFeature.mockRejectedValue(new ApiError(ERROR_CODES.FEATURE_DISABLED, "该功能暂未开放"));

    const res = await listRoute.POST(postReq({ refType: "MODEL", refId: "m-1" }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe(ERROR_CODES.FEATURE_DISABLED);
    expect(authStub.requireUserApi).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/user/favorites", () => {
  it("分页投影 + 反 N+1：3 条 MODEL 收藏，目标仅一次 IN 查询", async () => {
    prismaState.favorite.findMany.mockResolvedValue([
      favRow({ id: "f1", refId: "m1" }),
      favRow({ id: "f2", refId: "m2" }),
      favRow({ id: "f3", refId: "m3" }),
    ]);
    prismaState.favorite.count.mockResolvedValue(3);
    prismaState.aiModel.findMany.mockResolvedValue([
      { id: "m1", nameDisplay: "A", slug: "a" },
      { id: "m2", nameDisplay: "B", slug: "b" },
      { id: "m3", nameDisplay: "C", slug: "c" },
    ]);

    const res = await listRoute.GET(getReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.total).toBe(3);
    expect(body.data.totalPages).toBe(1);
    expect(body.data.items).toHaveLength(3);
    expect(body.data.items[0].target).toMatchObject({ name: "A", href: "/models/a" });
    // 反 N+1 硬断言：aiModel.findMany 恰一次（含 3 个 id 的 IN），aPIStation.findMany 因空集不触发
    expect(prismaState.aiModel.findMany).toHaveBeenCalledTimes(1);
    expect(prismaState.aiModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ["m1", "m2", "m3"] } }) }),
    );
    expect(prismaState.aPIStation.findMany).not.toHaveBeenCalled();
  });

  it("target 缺失（模型已软删，IN 未命中）→ items[].target=null（不级联失效）", async () => {
    prismaState.favorite.findMany.mockResolvedValue([favRow({ id: "f1", refId: "gone" })]);
    prismaState.favorite.count.mockResolvedValue(1);
    prismaState.aiModel.findMany.mockResolvedValue([]);

    const res = await listRoute.GET(getReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items[0].target).toBeNull();
  });

  it("pageSize 越界（51）→ 40000 且不查库", async () => {
    const res = await listRoute.GET(getReq("?pageSize=51"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(prismaState.favorite.findMany).not.toHaveBeenCalled();
  });

  it("refType=MODEL 过滤 → findMany where 含 refType", async () => {
    prismaState.favorite.findMany.mockResolvedValue([]);
    prismaState.favorite.count.mockResolvedValue(0);

    const res = await listRoute.GET(getReq("?refType=MODEL"));

    expect(res.status).toBe(200);
    expect(prismaState.favorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u-1", refType: "MODEL" } }),
    );
  });

  it("coerce：query string page=2&pageSize=10 → skip=10/take=10", async () => {
    prismaState.favorite.findMany.mockResolvedValue([]);
    prismaState.favorite.count.mockResolvedValue(0);

    const res = await listRoute.GET(getReq("?page=2&pageSize=10"));

    expect(res.status).toBe(200);
    expect(prismaState.favorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it("GET 开关关闭 → 403/50011（守卫先于鉴权，requireUserApi 不触发）", async () => {
    featureStub.requireFeature.mockRejectedValue(new ApiError(ERROR_CODES.FEATURE_DISABLED, "该功能暂未开放"));

    const res = await listRoute.GET(getReq());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe(ERROR_CODES.FEATURE_DISABLED);
    expect(authStub.requireUserApi).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/v1/user/favorites/[id]", () => {
  it("命中本人记录 → 200 {deleted:true}", async () => {
    prismaState.favorite.deleteMany.mockResolvedValue({ count: 1 });

    const res = await itemRoute.DELETE(new Request("http://localhost/api/v1/user/favorites/fav-1", { method: "DELETE" }), ctx("fav-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ deleted: true });
    expect(prismaState.favorite.deleteMany).toHaveBeenCalledWith({ where: { id: "fav-1", userId: "u-1" } });
  });

  it("0 行（不存在/非本人）→ 40000 防枚举", async () => {
    prismaState.favorite.deleteMany.mockResolvedValue({ count: 0 });

    const res = await itemRoute.DELETE(new Request("http://localhost/api/v1/user/favorites/nope", { method: "DELETE" }), ctx("nope"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe(ERROR_CODES.BAD_REQUEST);
  });

  it("DELETE 开关关闭 → 403/50011（守卫先于鉴权，requireUserApi 不触发）", async () => {
    featureStub.requireFeature.mockRejectedValue(new ApiError(ERROR_CODES.FEATURE_DISABLED, "该功能暂未开放"));

    const res = await itemRoute.DELETE(new Request("http://localhost/api/v1/user/favorites/fav-1", { method: "DELETE" }), ctx("fav-1"));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe(ERROR_CODES.FEATURE_DISABLED);
    expect(authStub.requireUserApi).not.toHaveBeenCalled();
    expect(prismaState.favorite.deleteMany).not.toHaveBeenCalled();
  });
});

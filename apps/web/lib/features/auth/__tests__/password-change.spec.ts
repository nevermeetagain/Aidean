/**
 * T120-19 POST /api/v1/auth/password 契约测（成功 / 旧密错 / 新密弱 / 未登录 / 限流 429 / 他端下一请求 401）。
 * 策略：内存 User 行模拟库态；vi.mock next/headers、db/prisma（$transaction 透传 tx=同一桩）、rate-limit。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  row: null as null | Record<string, unknown>,
  user: { findUnique: vi.fn(), update: vi.fn() },
  refreshToken: { updateMany: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
}));
const rl = vi.hoisted(() => ({ checkFixedWindow: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("../../../db/prisma", () => {
  const prisma = {
    user: db.user,
    refreshToken: db.refreshToken,
    auditLog: db.auditLog,
    $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  return { prisma };
});
vi.mock("../../../rate-limit", () => ({
  checkFixedWindow: rl.checkFixedWindow,
  clientIpFrom: () => "203.0.113.9",
}));

import { cookies } from "next/headers";
import { COOKIE_ACCESS, COOKIE_REFRESH } from "../constants";
import { hashPassword, verifyPassword } from "../password";
import { requireUserApi } from "../session";
import { signAccess, verifyAccess } from "../tokens";

const route = await import("../../../../app/api/v1/auth/password/route");

const jar = new Map<string, string>();
function useJar() {
  vi.mocked(cookies).mockReturnValue({
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n) as string } : undefined),
  } as unknown as ReturnType<typeof cookies>);
}
function pick(row: Record<string, unknown>, select: Record<string, boolean>) {
  return Object.fromEntries(Object.keys(select).map((k) => [k, row[k]]));
}
type RouteRes = Response & { cookies: { get(n: string): { value: string } | undefined } };
const call = async (body: unknown): Promise<RouteRes> =>
  (await route.POST(
    new Request("http://localhost/api/v1/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "req-t12019" },
      body: JSON.stringify(body),
    }),
  )) as RouteRes;

beforeEach(async () => {
  vi.clearAllMocks();
  jar.clear();
  useJar();
  db.row = {
    id: "u1", email: "a@b.co", nickname: null, tier: "PRO", status: "ACTIVE", deletedAt: null,
    password: await hashPassword("OldPass123", 4), tokenVersion: 0, failedLoginAttempts: 0, lockedUntil: null,
  };
  db.user.findUnique.mockImplementation(async ({ select }: { select: Record<string, boolean> }) =>
    db.row ? pick(db.row, select) : null);
  db.user.update.mockImplementation(async ({ data, select }: { data: Record<string, unknown>; select: Record<string, boolean> }) => {
    const r = db.row as Record<string, unknown>;
    if (typeof data.password === "string") r.password = data.password;
    if (data.tokenVersion) r.tokenVersion = (r.tokenVersion as number) + 1;
    return pick(r, select);
  });
  db.refreshToken.updateMany.mockResolvedValue({ count: 2 });
  db.refreshToken.create.mockResolvedValue({});
  db.auditLog.create.mockResolvedValue({});
  rl.checkFixedWindow.mockResolvedValue({ allowed: true, count: 1 });
  jar.set(COOKIE_ACCESS, await signAccess({ id: "u1", tier: "PRO", tokenVersion: 0 }));
});

describe("POST /api/v1/auth/password", () => {
  it("① 成功：200 {changed:true}；同事务 哈希更新 + ver++ + 吊销全部 refresh；新令牌对 ver=1；审计 password.change", async () => {
    const res = await call({ currentPassword: "OldPass123", newPassword: "NewPass456" });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ changed: true });
    expect(db.row?.tokenVersion).toBe(1);
    expect(await verifyPassword("NewPass456", db.row?.password as string)).toBe(true);
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", revokedAt: null } }),
    );
    const access = res.cookies.get(COOKIE_ACCESS)?.value as string;
    expect(res.cookies.get(COOKIE_REFRESH)?.value).toBeTruthy();
    expect((await verifyAccess(access))?.ver).toBe(1);
    expect(db.refreshToken.create).toHaveBeenCalledTimes(1);
    const audit = db.auditLog.create.mock.calls[0][0].data;
    expect(audit.newData).toEqual({ event: "password.change", tokenVersion: 1 });
    expect(JSON.stringify(audit)).not.toContain("$2");
  });

  it("② 改密后另一会话（旧 ver=0 access）下一请求 → 10004；本设备新令牌放行", async () => {
    const otherDevice = jar.get(COOKIE_ACCESS) as string;
    const res = await call({ currentPassword: "OldPass123", newPassword: "NewPass456" });
    jar.set(COOKIE_ACCESS, otherDevice);
    await expect(requireUserApi()).rejects.toMatchObject({ code: 10004 });
    jar.set(COOKIE_ACCESS, res.cookies.get(COOKIE_ACCESS)?.value as string);
    await expect(requireUserApi()).resolves.toEqual({ userId: "u1", tier: "PRO" });
  });

  it("③ 旧密错 → 401 / 10003，库态不变，计入登录同一 IP 限流桶", async () => {
    const res = await call({ currentPassword: "WrongPass1", newPassword: "NewPass456" });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe(10003);
    expect(db.row?.tokenVersion).toBe(0);
    expect(db.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(rl.checkFixedWindow).toHaveBeenCalledWith("rl:login:203.0.113.9", expect.any(Number), expect.any(Number));
  });

  it("④ 新密弱（无数字 / 过短 / 与旧密相同）→ 400 / 40000，库态不变", async () => {
    for (const newPassword of ["onlyletters", "a1", "OldPass123"]) {
      const res = await call({ currentPassword: "OldPass123", newPassword });
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe(40000);
    }
    expect(db.row?.tokenVersion).toBe(0);
  });

  it("⑤ 未登录 → 401 / 10004，不触限流与库写", async () => {
    jar.clear();
    const res = await call({ currentPassword: "OldPass123", newPassword: "NewPass456" });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe(10004);
    expect(rl.checkFixedWindow).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("⑥ 限流命中 → 429 / 10006，不核验旧密", async () => {
    rl.checkFixedWindow.mockResolvedValue({ allowed: false, count: 11 });
    const res = await call({ currentPassword: "OldPass123", newPassword: "NewPass456" });
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe(10006);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("⑦ 405：GET 未实现", async () => {
    const res = await route.GET(new Request("http://localhost/api/v1/auth/password"));
    expect(res.status).toBe(405);
  });
});

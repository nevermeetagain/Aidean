/**
 * auth-service 单测（Task A.1.2；≥8 用例）。
 *
 * 策略：vi.mock '../../db/prisma'（以内存 tx 桩替身事务回调）；
 * @node-rs/bcrypt 真实现（性能轮由 bcryptjs 迁入 password.ts 单源）；vi.mock 部分替换
 * hashPassword（包装真实现，其余导出保留）以断言 cost 参数——ESM 模块命名空间不可 spyOn。
 */
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { hashPassword, hashPasswordSync } from "../password";

vi.mock("../../../db/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../../db/prisma";

// password.ts 是 ESM（模块命名空间只读，不可 spyOn）——用工厂部分 mock：hashPassword 包装真实现可断言调用，其余导出（hashPasswordSync/verifyPassword 等）保持真实现
vi.mock("../password", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../password")>();
  return { ...actual, hashPassword: vi.fn(actual.hashPassword) };
});

import { SALT_ROUNDS, authService } from "../service";
import { ApiError } from "../../../../app/api/v1/_lib/errors";
import type { AuthUserRow } from "../repository";

// ==================== 测试设施 ====================

const txStub = {
  user: { create: vi.fn() },
  wallet: { create: vi.fn() },
};

function mockTransaction(): void {
  // 放宽为 vitest 原生 Mock：真实 PrismaClient 的 $transaction 泛型重载会窄化 vi.mocked 推断
  const txFn = (prisma.$transaction as unknown) as Mock;
  txFn.mockImplementation(async (fn: unknown) =>
    (fn as unknown as (tx: typeof txStub) => Promise<unknown>)(txStub)
  );
}

const findUnique = (prisma.user.findUnique as unknown) as Mock;

async function expectApiError(promise: Promise<unknown>, code: number, message?: string) {
  try {
    await promise;
    expect.unreachable("should have thrown ApiError");
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    const apiErr = err as ApiError;
    expect(apiErr.code).toBe(code);
    if (message !== undefined) expect(apiErr.message).toBe(message);
    return apiErr;
  }
}

/** 铺一个 ACTIVE 用户行（密码为明文 pwd12345 的哈希） */
function activeUserRow(overrides: Partial<AuthUserRow> = {}): AuthUserRow {
  return {
    id: "u-1",
    email: "a@b.co",
    nickname: "阿典",
    tier: "PRO",
    status: "ACTIVE",
    password: hashPasswordSync("pwd12345", SALT_ROUNDS),
    tokenVersion: 0,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  txStub.user.create.mockReset();
  txStub.wallet.create.mockReset();
});

describe("authService.register", () => {
  it("① 注册成功：users+wallets 同建（balanceMinor=0n、userId 一致），返回 NORMAL tier", async () => {
    mockTransaction();
    const created = { id: "u-new", email: "new@b.co", nickname: "新人", tier: "NORMAL", status: "ACTIVE" };
    txStub.user.create.mockResolvedValueOnce(created);

    const profile = await authService.register({
      email: "new@b.co",
      password: "longenough1",
      nickname: "新人",
    });

    expect(txStub.user.create).toHaveBeenCalledTimes(1);
    const userData = (txStub.user.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(userData.email).toBe("new@b.co");
    expect(userData.tier).toBe("NORMAL");
    expect(String(userData.password)).toMatch(/^\$2[aby]\$/); // bcrypt 哈希形态
    expect(txStub.wallet.create).toHaveBeenCalledTimes(1);
    const walletData = (txStub.wallet.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(walletData.userId).toBe(created.id);
    expect(walletData.balanceMinor).toBe(0n); // BigInt 最小单位置零
    expect(profile).toEqual({ id: created.id, email: created.email, nickname: created.nickname, tier: "NORMAL" });
  });

  it("② P2002 唯一冲突 → ApiError(10002,'邮箱已被注册')", async () => {
    mockTransaction();
    txStub.user.create.mockRejectedValueOnce({ code: "P2002" });

    await expectApiError(
      authService.register({ email: "dup@b.co", password: "longenough1", nickname: "n" }),
      10002,
      "邮箱已被注册"
    );
    // 冲突后不落钱包
    expect(txStub.wallet.create).not.toHaveBeenCalled();
  });

  it("③ 载荷走 shared RegisterSchema：缺 nickname / 弱密码 → 40000，且不触库不哈希", async () => {
    const hashSpy = vi.mocked(hashPassword);

    await expectApiError(authService.register({ email: "bad-email", password: "longenough1", nickname: "n" }), 40000);
    await expectApiError(authService.register({ email: "a@b.co", password: "short7x", nickname: "n" }), 40000);
    await expectApiError(authService.register({ email: "a@b.co", password: "longenough1" }), 40000); // 缺昵称

    expect(hashSpy).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
    hashSpy.mockRestore();
  });

  it("④ 哈希 cost ≥10（SALT_ROUNDS=12 且确被传入 hashPassword 传参 cost）", async () => {
    mockTransaction();
    const hashSpy = vi.mocked(hashPassword);
    txStub.user.create.mockResolvedValueOnce({ id: "u-x", email: "c@d.co", nickname: "n", tier: "NORMAL", status: "ACTIVE" });

    await authService.register({ email: "c@d.co", password: "longenough1", nickname: "n" });

    expect(hashSpy).toHaveBeenCalledTimes(1);
    const [, rounds] = hashSpy.mock.calls[0];
    expect(rounds).toBeGreaterThanOrEqual(10);
    expect(SALT_ROUNDS).toBe(12);
    hashSpy.mockRestore();
  });
});

describe("authService.login", () => {
  it("⑤ 登录成功返回 profile", async () => {
    findUnique.mockResolvedValueOnce(activeUserRow());
    const profile = await authService.login({ email: "a@b.co", password: "pwd12345" });
    expect(profile.id).toBe("u-1");
    expect(profile.tier).toBe("PRO");
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "a@b.co" },
      select: {
        id: true,
        email: true,
        nickname: true,
        tier: true,
        status: true,
        password: true,
        tokenVersion: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });
  });

  it("⑥ 用户不存在 → 10003 '凭据无效'", async () => {
    findUnique.mockResolvedValueOnce(null);
    await expectApiError(
      authService.login({ email: "ghost@b.co", password: "whatever1" }),
      10003,
      "凭据无效"
    );
  });

  it("⑦ 密码错误与用户不存在同码同文案（防枚举一致性）", async () => {
    findUnique.mockResolvedValueOnce(activeUserRow()); // 密码不匹配
    const wrongPwd = await expectApiError(
      authService.login({ email: "a@b.co", password: "wrong-pass-1" }),
      10003,
      "凭据无效"
    );
    findUnique.mockResolvedValueOnce(null); // 用户不存在
    const noUser = await expectApiError(
      authService.login({ email: "ghost@b.co", password: "wrong-pass-1" }),
      10003,
      "凭据无效"
    );
    // 防枚举：两者响应完全不可区分
    expect(noUser.code).toBe(wrongPwd.code);
    expect(noUser.message).toBe(wrongPwd.message);
  });

  it("⑧ 载荷非法（空密码/坏邮箱）→ 40000 且不查库", async () => {
    await expectApiError(authService.login({ email: "a@b.co", password: "" }), 40000);
    await expectApiError(authService.login({ email: "not-an-email", password: "x" }), 40000);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("⑨ 凭据正确但账号停用 → 10005 '账号已被禁用或锁定'", async () => {
    findUnique.mockResolvedValueOnce(activeUserRow({ status: "SUSPENDED" }));
    await expectApiError(
      authService.login({ email: "a@b.co", password: "pwd12345" }),
      10005,
      "账号已被禁用或锁定"
    );
  });
});

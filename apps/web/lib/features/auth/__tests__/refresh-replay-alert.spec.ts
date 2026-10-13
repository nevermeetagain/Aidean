/**
 * refresh 链重放告警单测（ADR-0003 L4.5）。
 *
 * 覆盖：已轮换代被复用（replay）→ ① 整链撤销同步发生；② 输出 auth-security
 * 结构化告警日志（tag/event/jti/userId/chainId）；③ 返回 kind="replayed"。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaState = vi.hoisted(() => ({
  refreshToken: {
    findUnique: vi.fn(),
    update: vi.fn(async () => ({})),
    updateMany: vi.fn(async () => ({ count: 1 })),
  },
}));

vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

import { authRepository } from "../repository";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("refresh 链重放告警（ADR-0003 L4.5）", () => {
  it("已轮换代复用 → 整链撤销 + auth-security 结构化告警 + kind=replayed", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    prismaState.refreshToken.findUnique.mockResolvedValueOnce({
      jti: "jti-old",
      userId: "u-1",
      clientId: "aidean-bot",
      chainId: "chain-1",
      rotatedAt: new Date(Date.now() - 60_000),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await authRepository.consumeRefreshToken("jti-old", new Date());

    expect(result.kind).toBe("replayed");
    // 整链撤销同步发生
    expect(prismaState.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { chainId: "chain-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    // 结构化告警日志
    expect(errSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(errSpy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      tag: "auth-security",
      event: "refresh_replay",
      jti: "jti-old",
      userId: "u-1",
      clientId: "aidean-bot",
      chainId: "chain-1",
    });
    errSpy.mockRestore();
  });

  it("正常轮换（未重放）→ 不输出告警，kind=ok", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    prismaState.refreshToken.findUnique.mockResolvedValueOnce({
      jti: "jti-live",
      userId: "u-2",
      clientId: null,
      chainId: "chain-2",
      rotatedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await authRepository.consumeRefreshToken("jti-live", new Date());

    expect(result.kind).toBe("ok");
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

/**
 * TASK-015 route 级受控面取证（验收：关闭 gateway.chat 后 POST /api/v1/gateway/chat 返回 403 且 code=50011）。
 *
 * 直接驱动真实 gateway/chat 路由（不修改 gateway/**，仅以 vi.mock 隔离其重依赖）：
 * - requireFeature 为路由首行（鉴权之前），关闭时抛 ApiError(FEATURE_DISABLED=50011)，
 *   经 withApi 依 DEFAULT_STATUS_BY_CODE 映射 HTTP 403；
 * - 对照组：开启 gateway.chat 时守卫放行，执行流抵达 requireGatewayPrincipal（此处令其抛 10004），
 *   证明「非 50011、非 500」，即门已开。
 * mock 口径：next/cache 以 unstable_cache 恒等降级（对齐 flags.spec）；prisma 仅桩 featureFlag.findMany；
 * gateway/service、apikey/guard 桩为轻对象（requireFeature 先抛，二者内部逻辑在本用例不执行）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

const prismaState = vi.hoisted(() => ({ featureFlag: { findMany: vi.fn() } }));
const guardStub = vi.hoisted(() => ({ requireGatewayPrincipal: vi.fn() }));

vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../apikey/guard", () => guardStub);
vi.mock("../../gateway/service", () => ({ gatewayOrchestrator: {} }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const chatRoute = await import("../../../../app/api/v1/gateway/chat/route");

/** 造一行 feature_flags */
function row(flagCode: string, isEnabled: boolean) {
  return { flagCode, isEnabled, enableFrom: null, enableUntil: null };
}

function chatRequest() {
  return new Request("http://localhost/api/v1/gateway/chat", {
    method: "POST",
    body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: "hi" }] }),
  });
}

beforeEach(() => {
  prismaState.featureFlag.findMany.mockReset();
  guardStub.requireGatewayPrincipal.mockReset();
});

describe("route 级 · gateway.chat 开关受控面", () => {
  it("gateway.chat 关闭 → POST /api/v1/gateway/chat 返回 HTTP 403 且 code=50011（未抵达鉴权）", async () => {
    prismaState.featureFlag.findMany.mockResolvedValue([row("gateway.chat", false)]);

    const res = await chatRoute.POST(chatRequest());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe(ERROR_CODES.FEATURE_DISABLED); // 50011
    // 首行守卫先于鉴权：关闭时不得调用 requireGatewayPrincipal（不泄露受控面存在性之外的信息）
    expect(guardStub.requireGatewayPrincipal).not.toHaveBeenCalled();
  });

  it("gateway.chat 开启 → 守卫放行，抵达 requireGatewayPrincipal（对照：非 403/50011、非 500）", async () => {
    prismaState.featureFlag.findMany.mockResolvedValue([row("gateway.chat", true)]);
    guardStub.requireGatewayPrincipal.mockImplementation(async () => {
      throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "未登录");
    });

    const res = await chatRoute.POST(chatRequest());
    const body = await res.json();

    // 门已开：执行流抵达鉴权守卫，返回其 10004，而非开关 50011 / 内部 500
    expect(guardStub.requireGatewayPrincipal).toHaveBeenCalledTimes(1);
    expect(body.code).toBe(ERROR_CODES.UNAUTHENTICATED); // 10004
    expect(res.status).not.toBe(500);
  });
});

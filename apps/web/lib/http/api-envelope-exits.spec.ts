/**
 * B11-10（DEF-011-13 / Q-11-03=B）：API 非 2xx 出口信封化单测。
 *
 * 覆盖：
 * 1. methodNotAllowed：405 + 四要素信封 + Allow 头 + x-request-id 透传；OPTIONS 204 + Allow；
 * 2. allowHeaderFor：有 GET 时派生 HEAD、恒含 OPTIONS、顺序稳定；
 * 3. 真实路由文件：`admin/scripts/[id]`（仅 PATCH/DELETE）的 GET → 405 信封（DEF-011-13 主证样本）；
 * 4. API 兜底路由 `app/api/[[...slug]]`：7 个方法均 404 JSON 信封（替代 27KB HTML）；
 * 5. 信封体可被 @aidean/shared 的 ErrorBodySchema 校验通过（错误码已登记）；
 * 6. 守卫脚本 api-method-coverage.mjs 对当前仓库 exit 0（防回归），且其纯函数对反例给出正确期望。
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

import { ErrorBodySchema } from "@aidean/shared";
import { describe, expect, it, vi } from "vitest";

import {
  HTTP_METHODS,
  allowHeaderFor,
  methodNotAllowed,
  routeNotFound,
} from "../../app/api/v1/_lib/method-not-allowed";

vi.mock("../db/prisma", () => ({ prisma: {} }));
vi.mock("../features/auth/session", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ userId: "admin-1" }),
}));

const REPO_ROOT = path.resolve(__dirname, "../../../..");

describe("allowHeaderFor", () => {
  it.each([
    [["GET"], "GET, HEAD, OPTIONS"],
    [["GET", "POST"], "GET, HEAD, OPTIONS, POST"],
    [["PATCH", "DELETE"], "OPTIONS, DELETE, PATCH"],
    [["POST"], "OPTIONS, POST"],
  ] as const)("%j → %s", (impl, expected) => {
    expect(allowHeaderFor(impl)).toBe(expected);
  });
});

describe("methodNotAllowed", () => {
  const handlers = methodNotAllowed(["GET", "POST"]);

  it("返回全部 7 个方法的处理器", () => {
    expect(Object.keys(handlers).sort()).toEqual([...HTTP_METHODS].sort());
  });

  it("未实现方法 → 405 + JSON 信封 + Allow + requestId 透传", async () => {
    const req = new Request("http://localhost/api/v1/x", {
      method: "DELETE",
      headers: { "x-request-id": "rid-123" },
    });
    const res = handlers.DELETE(req);
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD, OPTIONS, POST");
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(res.headers.get("x-request-id")).toBe("rid-123");
    const body = await res.json();
    expect(body).toMatchObject({ code: 40000, data: null, requestId: "rid-123" });
    expect(body.message).toContain("DELETE");
    expect(ErrorBodySchema.safeParse(body).success).toBe(true);
  });

  it("无入站 requestId 时自动生成", async () => {
    const res = handlers.PUT(new Request("http://localhost/api/v1/x", { method: "PUT" }));
    const body = await res.json();
    expect(typeof body.requestId).toBe("string");
    expect(body.requestId.length).toBeGreaterThan(0);
    expect(res.headers.get("x-request-id")).toBe(body.requestId);
  });

  it("OPTIONS → 204 + 准确 Allow（不含 405 存根方法）", () => {
    const res = handlers.OPTIONS(new Request("http://localhost/api/v1/x", { method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("allow")).toBe("GET, HEAD, OPTIONS, POST");
  });
});

describe("真实路由：admin/scripts/[id]（仅 PATCH/DELETE）", () => {
  it("GET → 405 信封（修前：0 字节空体 + content-type=null）", async () => {
    const mod = (await import("../../app/api/v1/admin/scripts/[id]/route")) as unknown as Record<
      string,
      (req: Request) => Response
    >;
    expect(typeof mod.PATCH).toBe("function");
    expect(typeof mod.GET).toBe("function");
    const res = mod.GET(new Request("http://localhost/api/v1/admin/scripts/abc", { method: "GET" }));
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("OPTIONS, DELETE, PATCH");
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
    const body = JSON.parse(text);
    expect(body).toMatchObject({ code: 40000, data: null });
  });
});

describe("API 兜底路由 app/api/[[...slug]]", () => {
  it("7 个方法均 404 JSON 信封", async () => {
    const mod = (await import("../../app/api/[[...slug]]/route")) as unknown as Record<
      string,
      (req: Request) => Response
    >;
    for (const m of HTTP_METHODS) {
      const res = mod[m]!(new Request("http://localhost/api/v1/no-such-endpoint", { method: m }));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toMatch(/application\/json/);
      const body = await res.json();
      expect(body).toMatchObject({ code: 40000, data: null });
      expect(body.message).toContain("/api/v1/no-such-endpoint");
      expect(ErrorBodySchema.safeParse(body).success).toBe(true);
    }
  });

  it("routeNotFound 覆盖全部方法", () => {
    expect(Object.keys(routeNotFound()).sort()).toEqual([...HTTP_METHODS].sort());
  });
});

describe("守卫 scripts/guard/api-method-coverage.mjs", () => {
  it("纯函数：expectedStubNames / analyzeRoute 对样例给出正确结论", async () => {
    const guard = (await import(
      /* @vite-ignore */ path.join(REPO_ROOT, "scripts/guard/api-method-coverage.mjs")
    )) as {
      expectedStubNames: (impl: string[]) => string[];
      analyzeRoute: (c: string) => { implemented: string[]; stub: { names: string[]; arg: string[] } | null; unsupported: boolean };
    };
    expect(guard.expectedStubNames(["GET"])).toEqual(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
    expect(guard.expectedStubNames(["PATCH", "DELETE"])).toEqual(["GET", "HEAD", "POST", "PUT", "OPTIONS"]);
    const a = guard.analyzeRoute(
      'export const GET = withApi(x);\nexport async function POST() {}\nexport const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);\n'
    );
    expect(a.implemented).toEqual(["GET", "POST"]);
    expect(a.stub?.names).toEqual(["PUT", "PATCH", "DELETE", "OPTIONS"]);
    expect(a.stub?.arg).toEqual(["GET", "POST"]);
    expect(guard.analyzeRoute("export { h as GET };").unsupported).toBe(true);
  });

  it("对当前仓库 exit 0（每个 route.ts 均有正确存根 + 兜底路由存在）", () => {
    const out = execFileSync(process.execPath, [path.join(REPO_ROOT, "scripts/guard/api-method-coverage.mjs")], {
      encoding: "utf8",
    });
    expect(out).toContain("RESULT: PASS (api-method-coverage)");
  });
});

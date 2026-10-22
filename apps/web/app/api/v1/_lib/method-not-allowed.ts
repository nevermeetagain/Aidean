/**
 * API 非 2xx 出口信封化（B11-10 / DEF-011-13 / Q-11-03=B）。
 *
 * 问题：App Router 对 route.ts 未导出的方法返回 Next 内置 405（空体、content-type=null），
 * 未匹配的 /api/* 路径回落到站点 HTML 404（27KB）——两者都不符合 `{code,message,data,requestId}` 信封。
 *
 * 机制（选型理由见《API架构设计方案》§7.14 `api-envelope-exits-architecture`）：
 *   - 每个 route.ts 在文件末尾显式导出「未实现方法」的 405 处理器：
 *       export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
 *     由 `scripts/codemod/api-method-guard.mjs` 生成，`scripts/guard/api-method-coverage.mjs` 防回归；
 *   - 处理器在模块加载期一次性构造：已实现方法零额外开销，不经 middleware（middleware 运行时
 *     无法得知某路由导出了哪些方法，须另维护清单，易漂移且每请求都要付成本）；
 *   - OPTIONS 一并接管（返回 204 + 正确 Allow），因为 Next 自动实现的 OPTIONS 会把这些 405
 *     存根也算进 Allow；HEAD 仅在 GET 缺失时接管（GET 存在时沿用 Next 由 GET 自动派生的 HEAD）；
 *   - 未匹配路径由 `app/api/[[...slug]]/route.ts` 兜底，统一走 `routeNotFound()`。
 *
 * 错误码：复用已登记的 `40000 BAD_REQUEST`，以 HTTP 状态 405/404 区分语义（`packages/shared`
 * 错误码属冻结契约，新增专用码需 ADR，见 EVD-B11-10/deviation.md 升级项）。
 */
import { ERROR_CODES } from "./errors";
import { errorResponse } from "./response";

/** App Router 支持的 HTTP 方法全集（与 Next `HTTP_METHODS` 一致） */
export const HTTP_METHODS = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "DELETE", "PATCH"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

/** 业务方可显式实现的方法（通常为 GET/POST/PUT/PATCH/DELETE；HEAD/OPTIONS 一般由本机制或 Next 派生） */
export type ImplementedMethod = HttpMethod;

type Handler = (req: Request) => Response;

/** 计算 Allow 头：已实现方法 + 派生的 HEAD（有 GET 时）+ OPTIONS，按 HTTP_METHODS 顺序去重 */
export function allowHeaderFor(implemented: readonly ImplementedMethod[]): string {
  const set = new Set<HttpMethod>(implemented);
  if (set.has("GET")) set.add("HEAD");
  set.add("OPTIONS");
  return HTTP_METHODS.filter((m) => set.has(m)).join(", ");
}

function requestIdOf(req: Request): string | undefined {
  return req.headers.get("x-request-id") ?? undefined;
}

/** 405 信封：{code:40000, message, data:null, requestId} + HTTP 405 + Allow */
export function methodNotAllowedResponse(req: Request, allow: string): Response {
  const res = errorResponse(
    ERROR_CODES.BAD_REQUEST,
    `不支持的请求方法 ${req.method}（允许：${allow}）`,
    requestIdOf(req),
    405
  );
  res.headers.set("Allow", allow);
  return res;
}

/** 404 信封：未匹配的 API 路径 */
export function routeNotFoundResponse(req: Request): Response {
  let path = "";
  try {
    path = new URL(req.url).pathname;
  } catch {
    /* 非法 URL 不回显 */
  }
  return errorResponse(
    ERROR_CODES.BAD_REQUEST,
    `接口不存在：${req.method} ${path}`.trim(),
    requestIdOf(req),
    404
  );
}

/**
 * 为一个 route.ts 生成「全部 HTTP 方法」的处理器表：未实现方法 → 405 信封，OPTIONS → 204 + Allow。
 * 路由文件只解构导出自己**未实现**的那些键（由 codemod 生成、guard 校验），已实现的方法保持原样。
 *
 * @param implemented 该路由真实实现的方法（须与文件内真实导出一致，guard 断言）
 */
export function methodNotAllowed(implemented: readonly ImplementedMethod[]): Record<HttpMethod, Handler> {
  const allow = allowHeaderFor(implemented);
  const notAllowed: Handler = (req) => methodNotAllowedResponse(req, allow);
  const options: Handler = (req) => {
    const headers = new Headers({ Allow: allow });
    const rid = requestIdOf(req);
    if (rid) headers.set("x-request-id", rid);
    return new Response(null, { status: 204, headers });
  };
  return {
    GET: notAllowed,
    HEAD: notAllowed,
    POST: notAllowed,
    PUT: notAllowed,
    PATCH: notAllowed,
    DELETE: notAllowed,
    OPTIONS: options,
  };
}

/** 未匹配 API 路径的处理器表（全部方法 → 404 信封），供 `app/api/[[...slug]]/route.ts` 解构导出 */
export function routeNotFound(): Record<HttpMethod, Handler> {
  const h: Handler = (req) => routeNotFoundResponse(req);
  return { GET: h, HEAD: h, OPTIONS: h, POST: h, PUT: h, DELETE: h, PATCH: h };
}

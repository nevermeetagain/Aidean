/**
 * withApi：API v1 路由处理器高阶包装。
 *
 * 职责（Route 层通用横切关注点，业务逻辑留在下游 handler）：
 * - handler 正常返回的数据自动包成 successResponse（含 x-request-id 贯穿）；
 * - handler 抛出 ApiError(code, message) 自动转为 errorResponse；
 * - 其他未知异常 catch 后统一收敛为 errorResponse(50000)，不在响应体泄露内部细节。
 */
import { ERROR_CODES, ApiError } from "./errors";
import { errorResponse, generateRequestId, successResponse } from "./response";

export type ApiHandler<T, C = unknown> = (req: Request, ctx: C) => T | Promise<T>;

/** Next.js 动态路由上下文（params 由 Next 运行时注入；Next.js 15 中 params 为 Promise） */
export type RouteContext<P extends Record<string, string> = Record<string, string>> = {
  params: Promise<P>;
};

// 双重载：Next.js 15 typegen（.next/types/*/route.ts 的 ParamCheck<RouteContext>）对
// 导出 handler 的第二参强校验「不得含 undefined」，但对**未声明第二参**的 handler
// （SecondArg 解析为 unknown → any）放行。故：
//  - 静态路由 handler 不声明 ctx → 返回函数无第二参（单测可直调 route.GET(req)）；
//  - 动态路由 handler 声明 ctx: RouteContext<P>（params 为 Promise）→ 第二参必传。
export function withApi<T>(handler: ApiHandler<T, unknown>): (req: Request) => Promise<Response>;
export function withApi<T, C>(handler: ApiHandler<T, C>): (req: Request, ctx: C) => Promise<Response>;
export function withApi<T, C = unknown>(
  handler: ApiHandler<T, C>
): (req: Request, ctx: C) => Promise<Response> {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      const data = await handler(req, ctx as C);
      // 直通：handler 自行构造的 Response（如认证路由需携带 Set-Cookie）原样返回，不再二次包信封
      if (data instanceof Response) {
        return data;
      }
      // 透传入站 x-request-id（存在则复用同一 ID 闭环；不存在则让 successResponse 自动生成）
      return successResponse(data, {
        requestId: req.headers.get("x-request-id") ?? undefined,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error.code, error.message);
      }
      // 未知异常：服务端留痕（不含任何密钥/敏感载荷），对外统一 50000
      console.error(
        "[api] unhandled error:",
        error instanceof Error ? error.stack : error,
        generateRequestId()
      );
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, "内部错误");
    }
  };
}

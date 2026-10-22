/**
 * /api/* 兜底路由（B11-10 / DEF-011-13）：任何未匹配的 API 路径（含 `/api` 本身）一律返回
 * `{code:40000,message,data:null,requestId}` + HTTP 404 的 JSON 信封，替代回落的站点 HTML 404。
 *
 * App Router 匹配优先级：静态段 > 动态段 > 可选捕获段，因此本文件只接住「没有任何具体
 * route.ts 匹配」的请求，不影响既有端点（已有路由的未实现方法由各自的 methodNotAllowed 存根给 405）。
 * 守卫：scripts/guard/api-method-coverage.mjs 断言本文件以 routeNotFound() 导出全部 7 个方法。
 */
import { routeNotFound } from "../v1/_lib/method-not-allowed";

export const dynamic = "force-dynamic";

export const { GET, HEAD, OPTIONS, POST, PUT, DELETE, PATCH } = routeNotFound();

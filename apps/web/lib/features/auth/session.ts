/**
 * auth 认证域 session：请求态会话解析与守卫（Task A.1.3）。
 *
 * - getSession()：从 HttpOnly Cookie 解析 access；无 Cookie 或无效一律 null。
 * - requireUser()：RSC 版守卫，null 时 redirect('/login?redirect=…')。
 * - requireUserApi()：route 版守卫，null 时 throw ApiError(10004,'未登录')。
 */
import { cookies } from "next/headers";

import { prisma } from "../../db/prisma";
import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";
import { COOKIE_ACCESS } from "./constants";
import { verifyAccess } from "./tokens";
import { oidcClientService } from "../oauth/clients";
import { getAdminPermissions, hasPermission } from "./permissions";
import type { PermissionCode } from "@aidean/shared";

export interface SessionContext {
  userId: string;
  tier: string;
}

/** 从 next/headers Cookie 读取并验签 access；不可用/无效返回 null。
 *  显式投影 {userId,tier} 收口 SessionContext（M-SSO：claims 已扩展 ver/jti/clientId，会话面不外泄） */
export async function getSession(): Promise<SessionContext | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_ACCESS)?.value;
    if (!token) return null;
    const claims = await verifyAccess(token);
    if (!claims) return null;
    return { userId: claims.userId, tier: claims.tier };
  } catch {
    // 非请求上下文（如静态渲染/测试外环境）视为未登录
    return null;
  }
}

/** RSC 守卫：未登录跳登录页（携带 redirect 回跳参数） */
export async function requireUser(redirectTo = "/user/console"): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    // 动态引入以避免在 Node 单测环境加载 next/navigation 的 RSC 运行时
    const { redirect } = await import("next/navigation");
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }
  return session as SessionContext;
}

/** route 守卫：未登录抛 10004（withApi 转 401 信封）；登录但账号封禁/软删抛 10005（#20 回库校验）。
 *  回库复核 status=ACTIVE + deletedAt=null——保证封禁(SUSPENDED)用户的令牌即时失效，
 *  不受 JWT 剩余有效期影响（与 requireAdminApi 封禁=全端失效口径一致）。 */
export async function requireUserApi(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "请先登录");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { status: true, deletedAt: true },
  });
  if (!user || user.deletedAt || user.status !== "ACTIVE") {
    throw new ApiError(ERROR_CODES.ACCOUNT_DISABLED, "账号已被禁用或删除");
  }
  return session;
}

/**
 * route 管理员守卫（v1.9 后台配置端点）：会话有效且 users.role ∈ {ADMIN, SUPER_ADMIN}，
 * 否则抛 10008（withApi 转 403 信封）。JWT claims 不含 role，此处按 userId 回库复核角色（角色变更即时生效）。
 *
 * 后台延迟优化：语义与判定顺序完全不变（10004 未登录 → 10005 禁用/软删/非 ACTIVE → 403 非管理员），
 * 有效性复核走对同一 User 行的**单次** findUnique（status/deletedAt 每次回库，保证封禁即时失效）。
 *
 * S3.3 RBAC（A2 接口级权限）：
 * - 入场总闸（无参调用，等价旧行为但放开 MODERATOR）：`getAdminPermissions().isStaff`——
 *   User.role ∈ {ADMIN,SUPER_ADMIN,MODERATOR} 或持有任一角色分配即可进入后台（落实决策④「MODERATOR 要能用」）。
 * - 逐接口强制（有参调用）：额外要求持有 `permission` 权限码；SUPER_ADMIN 通配绕过。
 *   校验位于后端（不由前端承担），未命中抛 10008（withApi 转 403）。
 * - 角色/授权变更经 `revalidateTag("admin-auth")` 即时失效 getAdminPermissions 缓存；
 *   status/deletedAt 始终新鲜（不受缓存影响）。
 */
export async function requireAdminApi(permission?: PermissionCode): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "请先登录");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { status: true, deletedAt: true },
  });
  if (!user || user.deletedAt || user.status !== "ACTIVE") {
    throw new ApiError(ERROR_CODES.ACCOUNT_DISABLED, "账号已被禁用或删除");
  }
  const perms = await getAdminPermissions(session.userId);
  if (!perms.isStaff) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");
  }
  if (permission && !hasPermission(perms, permission)) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, "权限不足");
  }
  return session;
}

/**
 * M-SSO P1.7：Bearer 双鉴权通道（子平台接入）。
 * 接受两类令牌：① 主站自身令牌（aud=aidean-web）；② SSO 产品令牌（aud=活跃 OidcClient.clientId）。
 * 返回统一会话面（clientId 标注来源），失败 null——由调用方决定 401 语义。
 */
export async function getSessionFromBearer(
  req: Request
): Promise<(SessionContext & { clientId?: string }) | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  // ① 主站自身令牌
  const self = await verifyAccess(token);
  if (self) return { userId: self.userId, tier: self.tier };
  // ② SSO 产品令牌：跳过 aud 精确断言后人工核对 client 活跃性
  const claims = await verifyAccess(token, { audience: null });
  if (!claims?.clientId) return null;
  const client = await oidcClientService.getActiveClient(claims.clientId);
  if (!client) return null;
  return { userId: claims.userId, tier: claims.tier, clientId: client.clientId };
}

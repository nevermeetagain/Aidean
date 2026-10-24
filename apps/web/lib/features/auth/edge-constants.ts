/**
 * auth 域 Cookie/令牌常量 —— **Edge 安全子集**（T120-02 / ADR-0012）。
 *
 * 拆分背景：middleware 运行于 Edge Runtime，只用到签发/验签所需的**纯常量与纯函数**；
 * 而 constants.ts 另含从 DB 读 security.* 的 TTL/阈值函数（对 lib/db/prisma 做运行时动态 import）。
 * webpack 会把该动态目标一并打进 Edge middleware 产物（实测 middleware.js 内含
 * PrismaClient/query_engine/setImmediate），既撑大体积又非 Edge 运行时应承载之物。
 * 故把这些**零 node 依赖**的常量/纯函数下沉到本文件，middleware 只 import 此处，
 * 使 Edge 闭包彻底不含 @prisma/client。constants.ts 再整体重导出本文件的纯常量，
 * 既有指向 constants 的导入点（route handler / 服务层 / 单测）全部不变。
 *
 * 约束：本文件不得引入任何 node-only 模块（prisma/redis/node:）；如需 DB 读值请放 constants.ts。
 */

/** 访问令牌 Cookie（HttpOnly；maxAge=15m 与令牌 TTL 对齐） */
export const COOKIE_ACCESS = "aidean_token";
/** 刷新令牌 Cookie（HttpOnly；仅经同源 /auth/refresh 换发新对） */
export const COOKIE_REFRESH = "aidean_refresh";

/** access 有效期（秒）：15 分钟（兜底常量；运行时读库见 constants.getAccessTtlSeconds） */
export const ACCESS_TTL_SECONDS = 15 * 60;
/** refresh 有效期（秒）：7 天（兜底常量；运行时读库见 constants.getRefreshTtlSeconds） */
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

/** JWT iss：主站对外 origin（NEXT_PUBLIC_SITE_URL 可覆盖，部署对齐 docker env） */
export const AUTH_ISSUER = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
/** 容器侧可达 iss（AideanBot 等容器消费方经 host.docker.internal 访问主平台；A-T20 双值对齐）。
 *  Edge bundle 对非 NEXT_PUBLIC_ env 引用不做构建时内联、sandbox 运行时读取不可靠（实测 host
 *  令牌被拒）——故采用编译期字面量，随构建固化为版本锚；变更容器网段须重新构建。 */
export const AUTH_ISSUER_CONTAINER = "http://host.docker.internal:3000";
/** 验签接受的 iss 集合：浏览器值 + 容器值（去重；middleware 兼容迁移期双口径令牌，A-T20） */
export const AUTH_ISSUERS_ACCEPTED = Array.from(
  new Set([AUTH_ISSUER, AUTH_ISSUER_CONTAINER]),
);
/** 主站自身令牌的默认 aud；SSO 签发产品令牌时 aud = clientId */
export const AUTH_AUDIENCE_SELF = "aidean-web";

/** 登录连续失败阈值：达到即锁定（兜底常量；运行时读库见 constants.getLoginMaxFailedAttempts） */
export const LOGIN_MAX_FAILED_ATTEMPTS = 5;
/** 登录锁定时长（分钟） */
export const LOGIN_LOCK_MINUTES = 15;

/** 登录 IP 限流：固定窗口内最大尝试次数 */
export const LOGIN_IP_RATE_LIMIT = 20;
/** 登录 IP 限流窗口（秒） */
export const LOGIN_IP_RATE_WINDOW_SECONDS = 10 * 60;

/** 生产环境判定：secure cookie 仅在 https 下强制 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Login IP rate-limit bypass - test harness ONLY. Double guard: explicit env flag AND non-production,
 *  so isProduction() forces false in prod (the login limiter stays byte-identical there). A single full
 *  e2e pass performs >20 real logins and trips the fixed-window 429; that is test-env contention, not a defect. */
export function loginRateLimitBypassed(): boolean {
  return process.env.AIDEAN_BYPASS_LOGIN_RATE_LIMIT === "1" && !isProduction();
}

/** access/refresh 共用的 Cookie 属性基座 */
export function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
  };
}

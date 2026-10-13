/**
 * auth 域 Cookie/令牌常量集中导出（Task A.1.3 / M-SSO P0.2 升级）。
 *
 * 方案演进（M-SSO P0.1~P0.4）：
 * - 签名 HS256 → RS256 非对称（keys.ts 管理密钥束），消灭共享密钥伪造面；
 * - claims 补全 iss/aud/jti（access 亦加）/ver（= User.tokenVersion）；
 * - refresh 持久化（RefreshToken 表）+ 轮换检测（旧值复用 = 整链撤销）；
 * - 原「无状态 JWT 刷新对」的已知权衡（重放窗口/不可撤销）随之关闭。
 */

/** 访问令牌 Cookie（HttpOnly；maxAge=15m 与令牌 TTL 对齐） */
export const COOKIE_ACCESS = "aidean_token";
/** 刷新令牌 Cookie（HttpOnly；仅经同源 /auth/refresh 换发新对） */
export const COOKIE_REFRESH = "aidean_refresh";

/** access 有效期（秒）：15 分钟（兜底常量；运行时读库见 getAccessTtlSeconds） */
export const ACCESS_TTL_SECONDS = 15 * 60;
/** refresh 有效期（秒）：7 天（兜底常量；运行时读库见 getRefreshTtlSeconds） */
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

/** security.* 数值键运行时读库的 60s 进程内缓存（键 → 值/时间戳） */
const SECURITY_NUMBER_CACHE_MS = 60 * 1000;
const securityNumberCache = new Map<string, { value: number; at: number }>();

/**
 * security.* 数值键通用读库（60s 缓存；缺行/异常回退 fallback，越界 clamp 到 [min,max] 后缓存）。
 * 键名与 shared ADMIN_CONFIG_KEYS / ADMIN_CONFIG_REGISTRY / seed 四处同步（PUT 侧已 clamp，
 * 此处防御性复核）；dynamic import prisma 避免与 db 模块循环依赖；任何异常静默回退，fail-open
 * 永不阻断登录/刷新路径（与 getLoginMaxFailedAttempts 同口径）。
 */
async function getSecurityNumberClamped(
  configKey: string,
  min: number,
  max: number,
  fallback: number
): Promise<number> {
  const cached = securityNumberCache.get(configKey);
  if (cached && Date.now() - cached.at < SECURITY_NUMBER_CACHE_MS) {
    return cached.value;
  }
  try {
    const { prisma } = await import("../../db/prisma");
    const row = await prisma.systemConfig.findUnique({
      where: { configKey },
      select: { configValue: true },
    });
    const n = Number(row?.configValue);
    if (Number.isFinite(n)) {
      const clamped = Math.min(max, Math.max(min, n));
      securityNumberCache.set(configKey, { value: clamped, at: Date.now() });
      return clamped;
    }
  } catch {
    // 读库任何异常（无 DB/表缺失等）静默回退默认值，绝不阻断签发路径
  }
  return fallback;
}

/** access TTL（秒）：security.accessTokenTtlMinutes（分钟，[5,60]，默认 15）→ 秒；异常回退 900 */
export async function getAccessTtlSeconds(): Promise<number> {
  const minutes = await getSecurityNumberClamped(
    "security.accessTokenTtlMinutes",
    5,
    60,
    ACCESS_TTL_SECONDS / 60
  );
  return minutes * 60;
}

/** refresh TTL（秒）：security.refreshTokenTtlDays（天，[1,30]，默认 7）→ 秒；异常回退 604800 */
export async function getRefreshTtlSeconds(): Promise<number> {
  const days = await getSecurityNumberClamped(
    "security.refreshTokenTtlDays",
    1,
    30,
    REFRESH_TTL_SECONDS / (24 * 60 * 60)
  );
  return days * 24 * 60 * 60;
}

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

/** 登录连续失败阈值：达到即锁定（兜底常量；运行时读库见 getLoginMaxFailedAttempts） */
export const LOGIN_MAX_FAILED_ATTEMPTS = 5;
/** 登录锁定时长（分钟） */
export const LOGIN_LOCK_MINUTES = 15;

/**
 * security.maxLoginAttempts 运行时读库（60s 进程内缓存，异常/缺行/越界回退 LOGIN_MAX_FAILED_ATTEMPTS=5）。
 * 键名与 shared ADMIN_CONFIG_KEYS / ADMIN_CONFIG_REGISTRY / seed systemConfigsData 四处同步；
 * 值域 [1,20] 与 registry valueRule 一致（PUT 侧已 clamp，此处防御性复核）。
 */
const MAX_LOGIN_ATTEMPTS_KEY = "security.maxLoginAttempts";
const MAX_LOGIN_ATTEMPTS_CACHE_MS = 60 * 1000;
let maxLoginAttemptsCache: { value: number; at: number } | null = null;

export async function getLoginMaxFailedAttempts(): Promise<number> {
  if (maxLoginAttemptsCache && Date.now() - maxLoginAttemptsCache.at < MAX_LOGIN_ATTEMPTS_CACHE_MS) {
    return maxLoginAttemptsCache.value;
  }
  try {
    const { prisma } = await import("../../db/prisma");
    const row = await prisma.systemConfig.findUnique({
      where: { configKey: MAX_LOGIN_ATTEMPTS_KEY },
      select: { configValue: true },
    });
    const n = Number(row?.configValue);
    if (Number.isFinite(n) && n >= 1 && n <= 20) {
      maxLoginAttemptsCache = { value: n, at: Date.now() };
      return n;
    }
  } catch {
    // 读库任何异常（无 DB/表缺失等）静默回退默认值，绝不阻断登录失败路径
  }
  return LOGIN_MAX_FAILED_ATTEMPTS;
}
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

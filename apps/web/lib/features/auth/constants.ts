/**
 * auth 域 Cookie/令牌常量集中导出（Task A.1.3 / M-SSO P0.2 升级）。
 *
 * 方案演进（M-SSO P0.1~P0.4）：
 * - 签名 HS256 → RS256 非对称（keys.ts 管理密钥束），消灭共享密钥伪造面；
 * - claims 补全 iss/aud/jti（access 亦加）/ver（= User.tokenVersion）；
 * - refresh 持久化（RefreshToken 表）+ 轮换检测（旧值复用 = 整链撤销）；
 * - 原「无状态 JWT 刷新对」的已知权衡（重放窗口/不可撤销）随之关闭。
 *
 * T120-02 / ADR-0012 拆分：纯常量与纯函数（Cookie 名、iss/aud、TTL 兜底、限流阈值、生产判定、
 * Cookie 属性基座）零 node 依赖，已下沉到 ./edge-constants 供 Edge middleware 直接引用；
 * 本文件保留只在 Node 侧运行、从 DB 读 security.* 的 TTL/阈值函数（经运行时动态 import prisma），
 * 并整体重导出 ./edge-constants 的纯常量，使既有指向本模块的导入点（route handler / 服务层 / 单测）保持不变。
 */

export * from "./edge-constants";

// 上面 `export *` 只对外再导出、不注入本文件局部作用域；下方 DB 函数需引用这几个纯常量作兜底默认值。
import { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS, LOGIN_MAX_FAILED_ATTEMPTS } from "./edge-constants";

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

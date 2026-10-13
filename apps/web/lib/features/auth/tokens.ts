/**
 * auth 认证域 tokens：令牌签发/验签纯函数（Task A.1.3 / M-SSO P0.1~P0.2 重构）。
 *
 * 演进：
 * - HS256 对称 → RS256 非对称（keys.ts）：产品侧只能验签不能签发，消灭共享密钥伪造面；
 * - claims 补全：iss（AUTH_ISSUER）/ aud（主站=aidean-web，SSO 产品=clientId）/ jti（access 亦加）
 *   / ver（= User.tokenVersion，改密封号全端失效的比对位）；
 * - refresh 语义升级：签发返回 jti 供持久化落库（RefreshToken 表，见 auth/repository.ts），
 *   轮换检测/整链撤销的持久化编排在 repository+route 层（原 rotateRefresh 已迁出）；
 * - 本模块保持纯 JWT 语义：不触请求上下文；TTL 运行时读库经 auth/constants 的缓存 getter
 *   （60s 缓存 + fail-open 回退 900/604800，O-B1），签发路径永不因配置缺失/DB 异常阻断。
 */
import { SignJWT, jwtVerify } from "jose";

import {
  AUTH_AUDIENCE_SELF,
  AUTH_ISSUER,
  AUTH_ISSUERS_ACCEPTED,
  getAccessTtlSeconds,
  getRefreshTtlSeconds,
} from "./constants";
import { decodeProtectedHeader, getCurrentKid, getSigningKey, getVerificationKeyByKid } from "./keys";

const ALG = "RS256" as const;

export interface AccessClaims {
  userId: string;
  tier: string;
  /** User.tokenVersion 快照：与库值不一致 = 已全端失效 */
  ver: number;
  jti: string;
  /** 签发方：undefined/null = 主站自身；SSO 令牌为 OidcClient.clientId */
  clientId?: string;
}

export interface RefreshClaims {
  userId: string;
  ver: number;
  jti: string;
  clientId?: string;
}

export interface SignOptions {
  /** SSO 产品令牌的 aud（= clientId）；缺省为主站自身 */
  audience?: string;
  /** 签发方 clientId（SSO 令牌携带，写入 payload；主站自有令牌不带） */
  clientId?: string;
  /**
   * O-B2：显式覆盖 TTL（秒）。缺省由 sign* 内部读 security.*（60s 缓存 fail-open）。
   * signTokenPair 统一计算并传入，保证返回的 accessTtlSeconds/refreshTtlSeconds 与 JWT
   * exp-iat 同源严格一致（Cookie Max-Age 对齐依据）；直接调用 signAccess/signRefresh
   * 不带此字段时行为与 O-B1 一致（内部读库）。
   */
  accessTtlSeconds?: number;
  refreshTtlSeconds?: number;
}

function issuer(): string {
  return AUTH_ISSUER;
}

/** 验签接受的 iss 集合：浏览器 + 容器双口径（A-T20/A-T21 对齐；与 middleware 同源，任一匹配即过） */
function issuersAccepted(): string[] {
  return AUTH_ISSUERS_ACCEPTED;
}

/** 签发 access（TTL 读库 security.accessTokenTtlMinutes，回退 15m；RS256，sub=userId，payload: tier/ver/jti/clientId?） */
export async function signAccess(
  user: { id: string; tier: string; tokenVersion: number },
  opts?: SignOptions
): Promise<string> {
  const ttlSeconds = opts?.accessTtlSeconds ?? await getAccessTtlSeconds();
  return new SignJWT({
    tier: user.tier,
    ver: user.tokenVersion,
    jti: crypto.randomUUID(),
    clientId: opts?.clientId,
  })
    .setProtectedHeader({ alg: ALG, kid: await getCurrentKid() })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer(issuer())
    .setAudience(opts?.audience ?? AUTH_AUDIENCE_SELF)
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(await getSigningKey());
}

export interface RefreshIssuance {
  token: string;
  /** 落库锚点：RefreshToken.jti */
  jti: string;
  expiresAt: Date;
}

/** 签发 refresh（TTL 读库 security.refreshTokenTtlDays，回退 7d；typ:'refresh' 防被当 access 解析；jti 由调用方落库） */
export async function signRefresh(
  userId: string,
  tokenVersion: number,
  opts?: SignOptions
): Promise<RefreshIssuance> {
  const jti = crypto.randomUUID();
  const ttlSeconds = opts?.refreshTtlSeconds ?? await getRefreshTtlSeconds();
  const token = await new SignJWT({ typ: "refresh", ver: tokenVersion, clientId: opts?.clientId })
    .setProtectedHeader({ alg: ALG, kid: await getCurrentKid() })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setIssuer(issuer())
    .setAudience(opts?.audience ?? AUTH_AUDIENCE_SELF)
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(await getSigningKey());
  return {
    token,
    jti,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  };
}

export interface TokenPairIssuance {
  accessToken: string;
  refreshToken: string;
  /** refresh 落库锚点（调用方必须写入 RefreshToken 表） */
  refreshJti: string;
  refreshExpiresAt: Date;
  /** O-B2：TTL（秒），与 JWT exp-iat 同源；供 Cookie Max-Age 对齐（login/refresh/register） */
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

/** 签发一整对（注册/登录/轮换共用） */
export async function signTokenPair(
  user: { id: string; tier: string; tokenVersion: number },
  opts?: SignOptions
): Promise<TokenPairIssuance> {
  // O-B2：统一读库一次（60s 缓存 fail-open），外露 TTL 并与签发同源，杜绝「JWT 移位/cookie 落后」窗口
  const accessTtlSeconds = await getAccessTtlSeconds();
  const refreshTtlSeconds = await getRefreshTtlSeconds();
  const merged: SignOptions = { ...(opts ?? {}), accessTtlSeconds, refreshTtlSeconds };
  const refresh = await signRefresh(user.id, user.tokenVersion, merged);
  return {
    accessToken: await signAccess(user, merged),
    refreshToken: refresh.token,
    refreshJti: refresh.jti,
    refreshExpiresAt: refresh.expiresAt,
    accessTtlSeconds,
    refreshTtlSeconds,
  };
}

interface BaseVerifyOptions {
  /** SSO 产品验签口径：audience 必须等于其 clientId；主站自身缺省 aidean-web；
   *  显式传 null = 跳过 aud 断言（调用方自行核对 audience，如 getBearerSession 的多 client 场景） */
  audience?: string | null;
}

/** 按 token header kid 选验签公钥（M-SSO-FOLLOWUP C1 轮换：current/previous 过渡期双活） */
async function verifyKeyFor(token: string): Promise<CryptoKey | null> {
  const { kid } = decodeProtectedHeader(token);
  return getVerificationKeyByKid(kid);
}

/** 验签 access：返回 claims；签名/过期/iss/aud 不符/载荷缺 tier 一律 null */
export async function verifyAccess(
  token: string,
  opts?: BaseVerifyOptions
): Promise<AccessClaims | null> {
  try {
    const key = await verifyKeyFor(token);
    if (!key) return null;
    const { payload } = await jwtVerify(token, key, {
      algorithms: [ALG],
      issuer: issuersAccepted(),
      audience: opts?.audience === null ? undefined : (opts?.audience ?? AUTH_AUDIENCE_SELF),
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.tier !== "string" ||
      typeof payload.ver !== "number" ||
      typeof payload.jti !== "string"
    ) {
      return null; // refresh 令牌混入 access 位（无 tier claim）会被此处拦截
    }
    return {
      userId: payload.sub,
      tier: payload.tier,
      ver: payload.ver,
      jti: payload.jti,
      clientId: typeof payload.clientId === "string" ? payload.clientId : undefined,
    };
  } catch {
    return null;
  }
}

/** 验签 refresh：返回 claims；无效（签名/过期/类型不符/iss/aud 不符）一律 null */
export async function verifyRefresh(
  token: string,
  opts?: BaseVerifyOptions
): Promise<RefreshClaims | null> {
  try {
    const key = await verifyKeyFor(token);
    if (!key) return null;
    const { payload } = await jwtVerify(token, key, {
      algorithms: [ALG],
      issuer: issuersAccepted(),
      audience: opts?.audience === null ? undefined : (opts?.audience ?? AUTH_AUDIENCE_SELF),
    });
    if (
      payload.typ !== "refresh" ||
      typeof payload.sub !== "string" ||
      typeof payload.jti !== "string" ||
      typeof payload.ver !== "number"
    ) {
      return null; // access 令牌混入 refresh 位（缺 typ/jti）会被此处拦截
    }
    return {
      userId: payload.sub,
      jti: payload.jti,
      ver: payload.ver,
      clientId: typeof payload.clientId === "string" ? payload.clientId : undefined,
    };
  } catch {
    return null;
  }
}

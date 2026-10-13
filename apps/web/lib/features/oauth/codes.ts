/**
 * oauth 域 codes：授权码签发/一次性消费（M-SSO P1.3~P1.4）。
 *
 * 安全部约（RFC 6749 §4.1.2 / §10.5）：
 * - code = 32 字节 crypto 随机（192bit 熵）；
 * - 生命周期 60s（RFC 上限 10min，取更紧值）；
 * - **一次性**：消费走 Redis GETDEL（原子取值并删除），重放天然失败；
 * - payload 绑定 {userId, clientId, redirectUri, scope, challenge, nonce}，
 *   token 端点逐字段复核（redirect_uri/challenge 不一致即拒）；
 * - Redis 不可用 → 签发/消费均抛错降级为拒绝服务该请求（授权码无存储不可用 = 无法安全签发）。
 */
import { createHash, randomBytes } from "node:crypto";

import { getRedis } from "../../db/redis";

const CODE_TTL_SECONDS = 60;
const CODE_KEY_PREFIX = "oauth:code:";

export interface AuthorizationCodePayload {
  userId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  /** PKCE code_challenge（S256）；公共客户端强制 */
  challenge?: string;
  /** OIDC nonce（防重放，透传至 id_token） */
  nonce?: string;
}

export interface IssuedCode {
  code: string;
  expiresInSeconds: number;
}

export async function issueAuthorizationCode(payload: AuthorizationCodePayload): Promise<IssuedCode> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("authorization code storage unavailable");
  }
  const code = randomBytes(32).toString("base64url");
  await redis.set(
    `${CODE_KEY_PREFIX}${code}`,
    JSON.stringify(payload),
    "EX",
    CODE_TTL_SECONDS
  );
  return { code, expiresInSeconds: CODE_TTL_SECONDS };
}

export type ConsumeCodeResult =
  | { kind: "ok"; payload: AuthorizationCodePayload }
  /** 不存在或已过期或已消费（GETDEL 原子语义下三者不可区分，统一拒绝） */
  | { kind: "invalid" };

export async function consumeAuthorizationCode(code: string): Promise<ConsumeCodeResult> {
  const redis = getRedis();
  if (!redis) {
    return { kind: "invalid" };
  }
  try {
    const raw = await redis.getdel(`${CODE_KEY_PREFIX}${code}`);
    if (!raw) {
      return { kind: "invalid" };
    }
    return { kind: "ok", payload: JSON.parse(raw) as AuthorizationCodePayload };
  } catch {
    return { kind: "invalid" };
  }
}

/** PKCE S256：challenge = BASE64URL(SHA256(verifier)) */
export function s256Challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** PKCE 校验：verifier 哈希后与 code_challenge 一致 */
export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!verifier || verifier.length < 43 || verifier.length > 128) {
    return false; // RFC 7636 §4.1：43~128 字符
  }
  return s256Challenge(verifier) === challenge;
}

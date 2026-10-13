/**
 * oauth 域 back-channel logout（M-SSO-FOLLOWUP B1，OIDC Back-Channel Logout 1.0 子集）。
 *
 * 语义：用户在主平台登出（或链被撤销）时，主平台向该产品的 logoutUri POST
 * `logout_token`（RS256 JWT），产品侧收到后应清理该用户的本地会话。
 * 规范要点：
 * - claims 必含 events={"http://schemas.openid.net/event/backchannel-logout":{}} 与 sid；
 * - **禁止携带 nonce**（规范明确要求，含 nonce 的 logout_token 必须被拒）；
 * - aud=clientId，sub=用户锚点，sid=refresh 链锚点（链级会话标识）；
 * - 投递 fire-and-forget：5s 超时/次，有限重试（L2-3：最多 2 次重试，间隔 500ms），
 *   失败仅日志（登出主流程不被第三方可用性阻断）；best-effort 语义，不保证 100% 投递成功。
 */
import { SignJWT } from "jose";

import { getCurrentKid, getSigningKey } from "../auth/keys";
import { AUTH_ISSUER } from "../auth/constants";

const LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout";

export interface BackchannelLogoutInput {
  logoutUri: string;
  clientId: string;
  /** 用户锚点（= User.id） */
  sub: string;
  /** 会话标识（= refresh 链 chainId） */
  sid: string;
}

async function signLogoutToken(input: BackchannelLogoutInput): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    events: { [LOGOUT_EVENT]: {} },
    sub: input.sub,
    sid: input.sid,
  })
    .setProtectedHeader({ alg: "RS256", kid: await getCurrentKid() })
    .setAudience(input.clientId)
    .setIssuer(AUTH_ISSUER)
    .setJti(crypto.randomUUID())
    .setIssuedAt(now)
    .sign(await getSigningKey());
}

/** L2-3：有限重试——最多 2 次重试（共 3 次尝试），间隔 500ms；
 * 每次请求 5s 超时不变。重试仅对网络错误/非 2xx 触发，不阻塞登出主流程（fire-and-forget）。
 * best-effort 语义：保证最终一致性的概率提升，但不保证 100% 投递成功。 */
const BACKCHANNEL_MAX_RETRIES = 2;
const BACKCHANNEL_RETRY_DELAY_MS = 500;
const BACKCHANNEL_TIMEOUT_MS = 5000;

async function deliverOnce(
  logoutUri: string,
  body: URLSearchParams,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKCHANNEL_TIMEOUT_MS);
  try {
    // SSRF 豁免：logoutUri 来自管理员登记的 OAuth 客户端注册信息，响应体不读取（仅取 ok），
    // 5s 超时；无可回显数据面。风险面=管理员误登记，留痕于此。
    const res = await fetch(logoutUri, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    return res.ok;
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 投递 back-channel logout；绝不抛出（登出主流程不依赖第三方可用性）。
 * L2-3：有限重试（best-effort + 短重试补漏，不阻塞等待） */
export async function sendBackChannelLogout(input: BackchannelLogoutInput): Promise<boolean> {
  try {
    const logoutToken = await signLogoutToken(input);
    const body = new URLSearchParams({ logout_token: logoutToken });

    for (let attempt = 0; attempt <= BACKCHANNEL_MAX_RETRIES; attempt++) {
      const ok = await deliverOnce(input.logoutUri, body);
      if (ok) return true;
      if (attempt < BACKCHANNEL_MAX_RETRIES) {
        await sleep(BACKCHANNEL_RETRY_DELAY_MS);
      }
    }
    console.error(
      `[oauth] back-channel logout 投递失败（已重试 ${BACKCHANNEL_MAX_RETRIES} 次）: client=${input.clientId}`,
    );
    return false;
  } catch {
    console.error(`[oauth] back-channel logout 异常: client=${input.clientId}`);
    return false;
  }
}

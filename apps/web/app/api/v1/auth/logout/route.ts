/**
 * POST /api/v1/auth/logout — 登出（Task A.1.4 / M-SSO P0.3 重构 / ADR-0003 L4.1 扩展）。
 * 语义：**撤销当前 refresh 链**（best-effort，读到有效 refresh 即定位链）+ 清两 Cookie。
 * 与「全端失效」区分：改密/封号走 tokenVersion++（bumpTokenVersion），本端点仅断本链，
 * 其他已登录设备不受影响。
 * Back-channel 通知（best-effort + 有限重试，不阻断登出；L2-3）：
 * 投递失败经 2 次重试补漏后仅日志记录，不保证 100% 同步——安全敏感操作（改密/封号）
 * 由 tokenVersion++ 全端失效兜底，登出链路本身的 back-channel 属尽力投递。
 * - SSO 产品链登出（clientId≠null）→ 通知该链属产品（M-SSO-FOLLOWUP B2）；
 * - 主站自身链登出（clientId=null）→ 向该用户全部活跃 SSO 产品链广播（ADR-0003 L4.1）。
 */
import { cookies } from "next/headers";

import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  baseCookieOptions,
} from "../../../../../lib/features/auth/constants";
import { verifyRefresh } from "../../../../../lib/features/auth/tokens";
import { authRepository } from "../../../../../lib/features/auth/repository";
import { getSession } from "../../../../../lib/features/auth/session";
import { oidcClientService } from "../../../../../lib/features/oauth/clients";
import { sendBackChannelLogout } from "../../../../../lib/features/oauth/backchannel";
import { withApi } from "../../_lib/handler";
import { successResponse } from "../../_lib/response";

export const POST = withApi(async () => {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_REFRESH)?.value;
  if (refreshToken) {
    try {
      const claims = await verifyRefresh(refreshToken);
      if (claims) {
        // best-effort 撤链：无论 user 当前状态如何，登出即断本链
        const meta = await authRepository.findRefreshTokenMetaByJti(claims.jti);
        await authRepository.revokeRefreshChain(claims.jti);
        if (meta) {
          if (meta.clientId) {
            // M-SSO-FOLLOWUP B2：链属产品（SSO 签发）且注册了 logoutUri → back-channel 通知
            const client = await oidcClientService.getActiveClient(meta.clientId);
            if (client?.logoutUri) {
              await sendBackChannelLogout({
                logoutUri: client.logoutUri,
                clientId: client.clientId,
                sub: meta.userId,
                sid: meta.chainId,
              });
            }
          } else {
            // ADR-0003 L4.1：主站自身登出 → 向该用户全部活跃 SSO 产品链广播，
            // 各产品收到 logout_token 后销毁本地会话（fire-and-forget，不阻断登出）。
            const chains = await authRepository.findActiveRefreshChainsOfUser(meta.userId);
            const notified = new Set<string>();
            for (const chain of chains) {
              if (!chain.clientId || notified.has(chain.clientId)) continue;
              const client = await oidcClientService.getActiveClient(chain.clientId);
              if (!client?.logoutUri) continue;
              notified.add(chain.clientId);
              await sendBackChannelLogout({
                logoutUri: client.logoutUri,
                clientId: client.clientId,
                sub: chain.userId,
                sid: chain.chainId,
              });
            }
          }
        }
      }
    } catch {
      /* 撤销失败不阻断登出（客户端清 Cookie 已终结本设备会话） */
    }
  }
  // 兼容旧语义注记：session 可读时不再全端失效（登出 ≠ 全端踢出）
  await getSession().catch(() => null);

  const res = successResponse({ ok: true });
  res.cookies.set(COOKIE_ACCESS, "", { ...baseCookieOptions(), maxAge: 0 });
  res.cookies.set(COOKIE_REFRESH, "", { ...baseCookieOptions(), maxAge: 0 });
  return res;
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);

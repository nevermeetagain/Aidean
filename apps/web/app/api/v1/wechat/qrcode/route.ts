/**
 * GET /api/v1/wechat/qrcode — 微信扫码登录通道探测（Task A.1.4）。
 * WECHAT_APPID 未配置 → {enabled:false, reason:'CHANNEL_NOT_CONFIGURED'} 降级；
 * 已配置路径为注释桩（状态机仅注记，本期不实现）。
 */
import { withApi } from "../../_lib/handler";

// 构建期告警处置（rebuild-admin-console-and-harden-auth Phase 5 收口）：
// 本路由依赖 process.env.WECHAT_APPID 运行时判定，缺失该标记会导致
// 「Dynamic server usage」构建痕迹并污染全站缓存策略——显式声明强制动态。
export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const appid = process.env.WECHAT_APPID;
  if (!appid) {
    return { enabled: false, reason: "CHANNEL_NOT_CONFIGURED" };
  }

  // TODO(wechat-login)：WECHAT_APPID/WECHAT_APP_SECRET 就位后的扫码登录状态机（仅注释桩，不实现）：
  //   STATE_INIT → qrGen(await 微信开放平台「生成带参二维码」API 占位调用) → 进入 POLLING
  //   （前端持 ticket 轮询查询扫码态；STATE_EXPIRED 超时回 STATE_INIT 重出码）
  //   涉及 Redis 状态存储与 /wechat/callback 回调路由，待独立规格展开。
  return { enabled: true, state: "STATE_INIT" as const };
});

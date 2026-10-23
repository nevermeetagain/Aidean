// V0.12.0 · UX States：通用五态（术语表「面板五态」）。落地：packages/ui PanelState（T120-26）。
import { z } from "zod";

export const PanelStateKind = z.enum(["loading", "empty", "error", "forbidden", "ready"]);

/** 规则（用户端与管理端一致）：
 *  - 请求失败（网络/5xx）必须是 error 且带 retry，**禁止**渲染成 empty（EVD-UX-01 UX-02 同类缺陷）；
 *  - 401 → 跳登录；403 → forbidden（不显示重试）；
 *  - empty 仅在 2xx 且 total=0 时出现，文案说明「为什么空」与下一步动作；
 *  - loading 超过 300ms 才显示骨架，避免闪烁。 */
export const PanelStateProps = z.object({
  kind: PanelStateKind,
  title: z.string().optional(),
  description: z.string().optional(),
  retryLabel: z.string().default("重试"),
  testId: z.string().optional(),
});

/** V0.12 新增界面五态清单（每项五态截图入 EVD） */
export const V120_SCREENS = [
  "admin/monitoring · 运行队列与历史",
  "site/models/[slug] · 可靠性迷你图",
  "site/forgot-password · 两步重置",
  "site/user/console · 安全分区改密",
  "site/Dock · 收藏 Tab",
  "site/user/console · 自定义渠道探测结果",
] as const;

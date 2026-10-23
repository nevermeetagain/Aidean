// 语义色令牌名单（ADR-0013 · T120-25）——apps/web/app/globals.css @theme 的 TS 镜像，供组件与图表按名取值。
// 值不在这里：运行时一律走 CSS 变量，三主题（teal 默认 / indigo / orange）切换由 html[data-theme] 完成。

/** 六族语义令牌 → Tailwind 类名后缀（bg-/text-/border- 前缀自取） */
export const SEMANTIC_TOKENS = {
  surface: ["surface", "surface-raised", "surface-sunken"],
  fg: ["fg", "fg-muted", "fg-subtle"],
  muted: ["muted", "muted-fg"],
  line: ["line", "line-strong"],
  accent: ["accent", "accent-strong", "accent-soft", "on-accent", "ring"],
  status: ["success", "success-soft", "warning", "warning-soft", "danger", "danger-soft", "info", "info-soft"],
} as const;

export type SemanticFamily = keyof typeof SEMANTIC_TOKENS;
export type SemanticToken = (typeof SEMANTIC_TOKENS)[SemanticFamily][number];

/** 弃用别名（保留至 V0.13，T120-27 codemod 迁走）：旧名 → 新名 */
export const DEPRECATED_TOKEN_ALIASES = {
  background: "surface",
  foreground: "fg",
  primary: "accent-strong",
  "primary-foreground": "on-accent",
  "muted-foreground": "fg-muted",
  card: "surface-raised",
  border: "line",
  "slate-400": "fg-subtle",
  "slate-500": "fg-muted",
} as const satisfies Readonly<Record<string, SemanticToken>>;

export const THEMES = ["teal", "indigo", "orange"] as const;
export type ThemeName = (typeof THEMES)[number];

/** CSS 变量引用（图表等需要字符串颜色的场景：getComputedStyle 取值或直接写入 style） */
export function tokenVar(token: SemanticToken): string {
  return `var(--color-${token})`;
}

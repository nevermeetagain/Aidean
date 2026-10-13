// 兼容性预设:Tailwind v3 消费方可直接 extend 本文件;
// Tailwind v4 用户以 CSS-first 方式消费 apps/web/app/globals.css 令牌（presets.css 死令牌档案已随台账 §7.29 后清除）。
const config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        danger: "var(--danger)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
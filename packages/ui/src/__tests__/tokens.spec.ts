import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SEMANTIC_TOKENS, DEPRECATED_TOKEN_ALIASES, THEMES, tokenVar } from "../tokens";

const css = readFileSync(resolve(__dirname, "../../../../apps/web/app/globals.css"), "utf8");
const theme = css.slice(css.indexOf("@theme {"), css.indexOf("}", css.indexOf("@theme {")));

describe("语义令牌（ADR-0013）", () => {
  it("六族全部在 globals.css @theme 中声明为 --color-*", () => {
    expect(Object.keys(SEMANTIC_TOKENS)).toEqual(["surface", "fg", "muted", "line", "accent", "status"]);
    for (const t of Object.values(SEMANTIC_TOKENS).flat()) expect(theme, t).toContain(`--color-${t}:`);
  });
  it("弃用别名 9 个，均在 @theme 中保留且指向新名", () => {
    expect(Object.keys(DEPRECATED_TOKEN_ALIASES).length).toBe(9);
    for (const old of Object.keys(DEPRECATED_TOKEN_ALIASES)) expect(theme, old).toContain(`--color-${old}:`);
    expect(theme).toContain("@deprecated");
  });
  it("三主题各自覆盖 accent 族与 ring", () => {
    for (const t of THEMES) {
      const i = css.indexOf(`[data-theme="${t}"]`);
      expect(i, t).toBeGreaterThan(-1);
      const block = css.slice(i, css.indexOf("}", i));
      for (const v of ["--accent:", "--accent-strong:", "--accent-soft:", "--on-accent:", "--ring:"]) expect(block, `${t} ${v}`).toContain(v);
    }
  });
  it("tokenVar 生成 CSS 变量引用", () => expect(tokenVar("danger")).toBe("var(--color-danger)"));
});

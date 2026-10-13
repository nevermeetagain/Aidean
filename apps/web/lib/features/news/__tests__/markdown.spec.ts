/**
 * 资讯 Markdown 管线单测（news-admin-cms 需求 3）：
 * ()[] 链接兼容（归一化层）+ XSS 白名单（sanitize 层）+ 常用元素往返渲。
 */
import { describe, expect, it } from "vitest";

import { renderNewsMarkdown } from "../markdown";
import { isBalancedParens, normalizeNewsMarkdown, summarizeMarkdown } from "../normalize";

describe("normalizeNewsMarkdown —— ()[] 链接兼容", () => {
  it("目的地含半角括号或空格时包裹 <>，防止解析截断", () => {
    expect(normalizeNewsMarkdown("[a](https://ex.com/a(b)c)")).toBe("[a](<https://ex.com/a(b)c>)");
    expect(normalizeNewsMarkdown("[a](my file.txt)")).toBe("[a](<my file.txt>)");
  });
  it("成对括号链接归一化后仍为合法链接（wiki 式 URL）", () => {
    expect(normalizeNewsMarkdown("[wiki](https://zh.wikipedia.org/wiki/A_(b))")).toBe("[wiki](<https://zh.wikipedia.org/wiki/A_(b)>)");
  });
  it("普通目的地原样保留", () => {
    expect(normalizeNewsMarkdown("[a](https://ex.com/x)")).toBe("[a](https://ex.com/x)");
  });
  it("未闭合括号链接原样保留，不吞并后续内容", () => {
    const src = "[a](https://ex.com/a(b\n下一行文字";
    expect(normalizeNewsMarkdown(src)).toBe(src);
  });
  it("包裹时保留 trailing title", () => {
    expect(normalizeNewsMarkdown('[a](x(y) "tit")')).toBe('[a](<x(y)> "tit")');
  });
  it("全角括号链接 `]（url）`](全角) 转为半角", () => {
    expect(normalizeNewsMarkdown("[a]（https://ex.com/x）")).toBe("[a](https://ex.com/x)");
  });
  it("全角括号 + 内部空格联合归一化", () => {
    expect(normalizeNewsMarkdown("[a]（https://ex.com/a b）")).toBe("[a](<https://ex.com/a b>)");
  });
  it("行内代码与围栏代码块内的 `](` 不被改写", () => {
    const src = "参考 `[a](b(c)` 的写法。\n\n```md\n[a](b(c)\n```\n";
    expect(normalizeNewsMarkdown(src)).toBe(src);
  });
  it("空目的地与已用 <> 包裹的不动", () => {
    expect(normalizeNewsMarkdown("[]()")).toBe("[]()");
    expect(normalizeNewsMarkdown("[a](<x y>)")).toBe("[a](<x y>)");
  });
  it("isBalancedParens 深度判定", () => {
    expect(isBalancedParens("a(b)c")).toBe(true);
    expect(isBalancedParens("a(b")).toBe(false);
    expect(isBalancedParens("a)b")).toBe(false);
  });
  it("summarizeMarkdown 去标记取首行并限长", () => {
    expect(summarizeMarkdown("# 标题\n\n正文 **说明**")).toBe("标题");
    expect(summarizeMarkdown("参见 [指引](/docs) 页面")).toBe("参见 指引 页面");
    expect(summarizeMarkdown("x".repeat(300)).length).toBeLessThanOrEqual(120);
  });
});

describe("renderNewsMarkdown —— 渲染与 XSS 白名单", () => {
  it("常用元素往返：标题/列表/表格/引用/代码块/图片", () => {
    const md = [
      "## 章节",
      "- 项一",
      "- 项二",
      "| a | b |\n| --- | --- |\n| 1 | 2 |",
      "> 引用",
      "```js\nconst a = 1;\n```",
      "![图](/images/a.png)",
    ].join("\n\n");
    const html = renderNewsMarkdown(md);
    expect(html).toContain("<h2>章节</h2>");
    expect(html).toContain("<ul>");
    expect(html).toMatch(/<li>(<p>)?项一/);
    expect(html).toContain("<table>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<pre><code");
    expect(html).toContain('<img src="/images/a.png"');
  });
  it("问题链接渲染为合法 a 标签（<> 包裹被消费，不进 href）", () => {
    expect(renderNewsMarkdown("[合集](/user/console?tab=quotas)")).toContain('href="/user/console?tab=quotas"');
    expect(renderNewsMarkdown("[wiki](https://zh.wikipedia.org/wiki/A_(b))")).toContain('href="https://zh.wikipedia.org/wiki/A_(b)"');
  });
  it("script 整体移除（含内容）", () => {
    const html = renderNewsMarkdown("<script>alert(1)</script>正文");
    expect(html).not.toContain("script");
    expect(html).not.toContain("alert");
    expect(html).toContain("正文");
  });
  it("img 的属性白名单 + 不安全 src 降级为文字", () => {
    const html = renderNewsMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<img");
  });
  it("javascript: 链接降级为文字", () => {
    const html = renderNewsMarkdown("[点我](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<a");
  });
  it("data: 图片不放行", () => {
    const html = renderNewsMarkdown("![x](data:image/svg+xml;base64,PHN2Zz48L3N2Zz48L3N2Zz4=)");
    expect(html).not.toContain("data:");
    expect(html).not.toContain("<img");
  });
  it("iframe 整体移除", () => {
    expect(renderNewsMarkdown('<iframe src="https://evil.test"></iframe>')).not.toContain("iframe");
  });
  it("外站链接加 target 与 rel=noopener noreferrer", () => {
    const html = renderNewsMarkdown("[外链](https://example.com/a)");
    expect(html).toContain('href="https://example.com/a"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("noopener");
    expect(html).toContain("noreferrer");
  });
  it("breaks:true：段内换行渲染为 <br", () => {
    expect(renderNewsMarkdown("行一\n行二")).toContain("<br");
  });
});

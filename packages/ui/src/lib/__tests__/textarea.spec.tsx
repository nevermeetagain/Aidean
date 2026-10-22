// B11-04a Textarea 单测（零 DOM 环境,react-dom/server 渲染字符串 + 结构断言）
// 覆盖验收四条：默认渲染 / className 合并 / disabled 透传 / ref 透传
// 追加：rows 默认 3 + 覆写、invalid → aria-invalid + 边框切换、placeholder 基线
import { describe, expect, it } from "vitest";
import { createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Textarea } from "../../components/ui/textarea";

describe("Textarea 原语（B11-04a）", () => {
  it("① forwardRef：$$typeof = Symbol(react.forward_ref)", () => {
    expect((Textarea as { $$typeof: symbol }).$$typeof).toBe(Symbol.for("react.forward_ref"));
  });

  it("② 默认渲染 <textarea> + Button/Input 基线类 + 默认 rows=3", () => {
    const html = renderToStaticMarkup(createElement(Textarea, { name: "desc" }));
    expect(html).toContain("<textarea");
    expect(html).toContain('name="desc"');
    expect(html).toContain('rows="3"');
    expect(html).toContain("rounded-md");
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain("ring-[var(--ring)]");
    expect(html).toContain("disabled:opacity-50");
    expect(html).toContain("placeholder:text-slate-400");
  });

  it("③ rows 可覆写：调用方传 rows=8 时用 8 而非默认 3", () => {
    const html = renderToStaticMarkup(createElement(Textarea, { rows: 8 }));
    expect(html).toContain('rows="8"');
    expect(html).not.toContain('rows="3"');
  });

  it("④ className 合并：调用方覆盖默认 bg-[var(--background)] 与 padding（tailwind-merge）", () => {
    const html = renderToStaticMarkup(
      createElement(Textarea, { className: "bg-white p-5" }),
    );
    expect(html).toContain("bg-white");
    expect(html).not.toContain("bg-[var(--background)]");
    expect(html).toContain("p-5");
    expect(html).not.toContain("px-3");
    expect(html).not.toContain("py-2");
  });

  it("⑤ disabled 原生属性透传：渲染出 disabled 属性", () => {
    const html = renderToStaticMarkup(createElement(Textarea, { disabled: true }));
    expect(html).toMatch(/disabled(?:=""|="disabled")/);
    expect(html).toContain("disabled:pointer-events-none");
  });

  it("⑥ invalid=true → aria-invalid=\"true\" + 边框切 --danger", () => {
    const html = renderToStaticMarkup(createElement(Textarea, { invalid: true }));
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("border-[var(--danger)]");
    expect(html).not.toContain("border-[var(--border)]");
  });

  it("⑦ invalid=false 不下发 aria-invalid（默认态）", () => {
    const html = renderToStaticMarkup(createElement(Textarea, { invalid: false }));
    expect(html).not.toContain("aria-invalid");
    expect(html).toContain("border-[var(--border)]");
  });

  it("⑧ ref 线程：createElement(Textarea,{ref}) 的 el.ref 与外部对象同一", () => {
    const ref = { current: null as unknown as HTMLTextAreaElement };
    const el = createElement(Textarea, { ref });
    expect(isValidElement(el)).toBe(true);
    expect(el.ref).toBe(ref);
  });
});

// B11-04a Select 单测（零 DOM 环境,react-dom/server 渲染字符串 + 结构断言）
// 覆盖验收四条：默认渲染 / className 合并 / disabled 透传 / ref 透传
// 追加：size scale 变体、invalid → aria-invalid + 边框切换
import { describe, expect, it } from "vitest";
import { createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Select } from "../../components/ui/select";

describe("Select 原语（B11-04a）", () => {
  it("① forwardRef：$$typeof = Symbol(react.forward_ref)", () => {
    expect((Select as { $$typeof: symbol }).$$typeof).toBe(Symbol.for("react.forward_ref"));
  });

  it("② 默认渲染 <select> 且带 Button/Input 基线类（rounded-md / focus ring / disabled:opacity-50）", () => {
    const html = renderToStaticMarkup(
      createElement(
        Select,
        { name: "tier" },
        createElement("option", { value: "a" }, "A"),
        createElement("option", { value: "b" }, "B"),
      ),
    );
    expect(html).toContain("<select");
    expect(html).toContain('name="tier"');
    expect(html).toContain("rounded-md");
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain("ring-[var(--ring)]");
    expect(html).toContain("disabled:opacity-50");
    expect(html).toContain("<option value=\"a\">A</option>");
    expect(html).toContain("<option value=\"b\">B</option>");
  });

  it("③ size scale 三档：sm→h-8 text-xs / md→h-9 text-sm / lg→h-11 text-base", () => {
    const sm = renderToStaticMarkup(createElement(Select, { size: "sm" }));
    expect(sm).toContain("h-8");
    expect(sm).toContain("text-xs");
    const md = renderToStaticMarkup(createElement(Select, { size: "md" }));
    expect(md).toContain("h-9");
    expect(md).toContain("text-sm");
    const lg = renderToStaticMarkup(createElement(Select, { size: "lg" }));
    expect(lg).toContain("h-11");
    expect(lg).toContain("text-base");
  });

  it("④ className 合并：调用方 bg-primary 覆盖默认 bg-[var(--background)]（tailwind-merge 冲突消解）", () => {
    const html = renderToStaticMarkup(createElement(Select, { className: "bg-primary" }));
    expect(html).toContain("bg-primary");
    expect(html).not.toContain("bg-[var(--background)]");
  });

  it("⑤ disabled 原生属性透传：渲染出 disabled 属性且 pointer-events 类保留", () => {
    const html = renderToStaticMarkup(createElement(Select, { disabled: true }));
    expect(html).toMatch(/disabled(?:=""|="disabled")/);
    expect(html).toContain("disabled:pointer-events-none");
  });

  it("⑥ invalid=true → aria-invalid=\"true\" + 边框切 --danger（不再带 --border）", () => {
    const html = renderToStaticMarkup(createElement(Select, { invalid: true }));
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("border-[var(--danger)]");
    expect(html).not.toContain("border-[var(--border)]");
  });

  it("⑦ invalid=false 不下发 aria-invalid（避免污染无障碍树）", () => {
    const html = renderToStaticMarkup(createElement(Select, { invalid: false }));
    expect(html).not.toContain("aria-invalid");
    expect(html).toContain("border-[var(--border)]");
  });

  it("⑧ ref 线程：createElement(Select,{ref}) 的 el.ref 与外部对象同一（forwardRef 语义）", () => {
    const ref = { current: null as unknown as HTMLSelectElement };
    const el = createElement(Select, { ref });
    expect(isValidElement(el)).toBe(true);
    expect(el.ref).toBe(ref);
  });
});

// B11-04a Label 单测（零 DOM 环境,react-dom/server 渲染字符串 + 结构断言）
// 覆盖验收四条：默认渲染 / className 合并 / ref 透传（Label 无原生 disabled,用 peer-disabled 类）
// 追加：htmlFor 透传（表单关联关键属性）、required 星号（aria-hidden 视觉提示）
import { describe, expect, it } from "vitest";
import { createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Label } from "../../components/ui/label";

describe("Label 原语（B11-04a）", () => {
  it("① forwardRef：$$typeof = Symbol(react.forward_ref)", () => {
    expect((Label as { $$typeof: symbol }).$$typeof).toBe(Symbol.for("react.forward_ref"));
  });

  it("② 默认渲染 <label> + 基线类（block text-sm font-medium + peer-disabled:opacity-70）", () => {
    const html = renderToStaticMarkup(
      createElement(Label, { htmlFor: "name", children: "姓名" }),
    );
    expect(html).toContain("<label");
    expect(html).toContain('for="name"'); // React 把 htmlFor 落到 for 属性
    expect(html).toContain("姓名");
    expect(html).toContain("block");
    expect(html).toContain("text-sm");
    expect(html).toContain("font-medium");
    expect(html).toContain("peer-disabled:opacity-70");
    expect(html).toContain("peer-disabled:cursor-not-allowed");
  });

  it("③ htmlFor 缺失时不生成 for 属性（不误关联）", () => {
    const html = renderToStaticMarkup(createElement(Label, { children: "说明" }));
    expect(html).not.toContain("for=");
    expect(html).toContain("说明");
  });

  it("④ required=true 在文字后追加 aria-hidden 星号（视觉提示,不改语义）", () => {
    const html = renderToStaticMarkup(
      createElement(Label, { required: true, children: "邮箱" }),
    );
    expect(html).toContain("邮箱");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("text-[var(--danger)]");
    expect(html).toContain(">*<");
  });

  it("⑤ required=false（默认）不渲染星号", () => {
    const html = renderToStaticMarkup(createElement(Label, { children: "备注" }));
    expect(html).not.toContain("aria-hidden");
    expect(html).not.toContain(">*<");
  });

  it("⑥ className 合并：调用方覆盖默认 text-sm / font-medium（tailwind-merge）", () => {
    const html = renderToStaticMarkup(
      createElement(Label, { className: "text-xs font-normal", children: "标签" }),
    );
    expect(html).toContain("text-xs");
    expect(html).not.toContain("text-sm");
    expect(html).toContain("font-normal");
    expect(html).not.toContain("font-medium");
  });

  it("⑦ ref 线程：createElement(Label,{ref}) 的 el.ref 与外部对象同一", () => {
    const ref = { current: null as unknown as HTMLLabelElement };
    const el = createElement(Label, { ref });
    expect(isValidElement(el)).toBe(true);
    expect(el.ref).toBe(ref);
  });
});
